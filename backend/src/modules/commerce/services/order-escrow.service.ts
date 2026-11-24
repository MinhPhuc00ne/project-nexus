import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DisputeStatus,
  EscrowStatus,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  WalletTransactionType,
  Dispute,
} from '@prisma/client';
import { RefundService } from './refund.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAdminsAndStaff } from '../../../core/notifications/admin-notification.util';
import { AdminSettingsService } from '../../admin/services/admin-settings.service';
import { AdminFinanceService } from '../../admin/services/admin-finance.service';
import { ReputationService } from '../../users/services/reputation.service';
import { objectValue } from '../../fulfillment/services/shipment-state';
import { ShipmentActor } from '../../fulfillment/services/shipment-tracking.service';

type EscrowOrder = Prisma.OrderGetPayload<{
  include: { escrowRecord: true; shipment: true; dispute: true; afterSales: true; refunds: true };
}>;

export interface EscrowResult {
  success: boolean;
  alreadyProcessed?: boolean;
  orderStatus?: OrderStatus;
  escrowStatus?: EscrowStatus;
  refundDestination?: string;
}

@Injectable()
export class OrderEscrowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AdminSettingsService,
    private readonly finance: AdminFinanceService,
    private readonly refunds?: RefundService,
    private readonly reputation?: ReputationService,
  ) {}

  async hold(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      sellerId: string;
      buyerId?: string;
      subtotal: Prisma.Decimal | number;
      totalAmount: Prisma.Decimal | number;
      shippingFee?: Prisma.Decimal | number;
      buyer?: { fullName?: string };
      seller?: { fullName?: string };
    },
  ): Promise<{
    platformFee: number;
    sellerPayout: number;
    feePercentage: number;
    escrowStatus: EscrowStatus;
  }> {
    const config = await this.settings.getSettings();
    const percentage = Number(config?.platformFeePercentage ?? 7);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
      throw new BadRequestException('Tỷ lệ phí sàn không hợp lệ.');
    const subtotal = Number(order.subtotal);
    const platformFee = Math.round((subtotal * percentage) / 100);
    const sellerPayout = subtotal - platformFee;
    const escrow = await tx.escrowRecord.upsert({
      where: { orderId: order.id },
      update: {},
      create: {
        orderId: order.id,
        totalAmount: order.totalAmount,
        platformFee,
        sellerPayout,
        status: EscrowStatus.HELD,
      },
    });

    const admin = await this.finance.getOrCreatePrimaryAdminWallet(tx);
    await tx.wallet.update({
      where: { id: admin.id },
      data: { balance: { increment: order.totalAmount } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: admin.id,
        amount: order.totalAmount,
        type: WalletTransactionType.ESCROW_LOCK,
        status: 'SUCCESS',
        referenceId: order.id,
        description: `Tạm giữ thanh toán đơn hàng #${order.id.slice(0, 8)} (${Number(order.totalAmount).toLocaleString('vi-VN')} đ)`,
      },
    });

    return {
      platformFee: Number(escrow.platformFee),
      sellerPayout: Number(escrow.sellerPayout),
      feePercentage: percentage,
      escrowStatus: escrow.status,
    };
  }

  private async loadLocked(tx: Prisma.TransactionClient, orderId: string): Promise<EscrowOrder> {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        escrowRecord: true,
        shipment: true,
        dispute: true,
        afterSales: true,
        refunds: true,
      },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    return order;
  }

  private async release(
    tx: Prisma.TransactionClient,
    order: EscrowOrder,
    arbitration = false,
  ): Promise<EscrowResult> {
    if (order.afterSales && !['REJECTED', 'COMPLETED'].includes(order.afterSales.status))
      throw new BadRequestException('Đơn đang có yêu cầu hủy/trả hàng.');
    const escrow = order.escrowRecord;
    if (
      order.status === OrderStatus.CONFIRMED &&
      (!escrow || escrow.status === EscrowStatus.DISBURSED)
    )
      return { success: true, alreadyProcessed: true };
    const trackingStatus = String(
      objectValue(objectValue(order.shipment?.metadata).tracking).status || '',
    )
      .trim()
      .toLowerCase();
    const isTrackingDelivered = [
      'delivered',
      'da_giao',
      'giao_thanh_cong',
      'cod_collected',
      'money_collected',
      'da_thu_tien',
    ].includes(trackingStatus);
    if (
      !arbitration &&
      (order.status !== OrderStatus.DELIVERED ||
        order.shipment?.status !== 'DELIVERED' ||
        !isTrackingDelivered)
    ) {
      throw new BadRequestException('GHN chưa xác nhận giao hàng thành công.');
    }
    if (!escrow) {
      // Đơn hàng COD (không ký quỹ qua ví hệ thống NEXUS)
      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CONFIRMED } });
      if (tx.payment) {
        await tx.payment.updateMany({
          where: {
            orderId: order.id,
            provider: PaymentProvider.COD,
            status: PaymentStatus.PENDING,
          },
          data: { status: PaymentStatus.SUCCESS },
        });
      }
      if (order.shipment?.status === 'DELIVERED') {
        if (this.reputation) {
          await this.reputation.adjustScore(
            {
              userId: order.buyerId,
              deltaPoints: 1,
              reason: 'Hoàn tất đơn hàng COD',
              referenceId: order.id,
            },
            tx,
          );
          await this.reputation.adjustScore(
            {
              userId: order.sellerId,
              deltaPoints: 2,
              reason: 'Hoàn tất đơn hàng COD',
              referenceId: order.id,
            },
            tx,
          );
        } else {
          for (const userId of [order.buyerId, order.sellerId]) {
            await tx.user.update({
              where: { id: userId },
              data: { reputationScore: { increment: 2 } },
            });
            await tx.reputationLog.create({
              data: {
                userId,
                deltaPoints: 2,
                balanceAfter: 102,
                reason: 'Hoàn tất đơn hàng COD',
                referenceId: order.id,
              },
            });
          }
        }
      }
      await tx.notification.create({
        data: {
          userId: order.sellerId,
          type: 'ORDER',
          channel: 'IN_APP',
          title: 'Đơn hàng COD đã hoàn tất',
          content: `Đơn hàng #${order.id.slice(0, 8)} đã được người mua xác nhận nhận hàng thành công.`,
        },
      });
      return {
        success: true,
        orderStatus: OrderStatus.CONFIRMED,
        escrowStatus: EscrowStatus.DISBURSED,
      };
    }
    if (
      !arbitration &&
      (escrow.status === EscrowStatus.DISPUTED ||
        (order.dispute &&
          [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW].includes(
            order.dispute.status as 'OPEN' | 'UNDER_REVIEW',
          )))
    ) {
      throw new BadRequestException('Tiền đang bị giữ để xử lý khiếu nại.');
    }
    if (
      escrow.status !== EscrowStatus.HELD &&
      !(arbitration && escrow.status === EscrowStatus.DISPUTED)
    ) {
      throw new BadRequestException('Tiền ký quỹ không ở trạng thái có thể giải ngân.');
    }
    const seller = await tx.wallet.upsert({
      where: { userId: order.sellerId },
      update: {},
      create: { userId: order.sellerId, balance: 0, lockedBalance: 0, currency: 'VND' },
    });
    const admin = await this.finance.getOrCreatePrimaryAdminWallet(tx);
    const sellerPayout = Number(escrow.sellerPayout);
    const shippingFee = Number(order.shippingFee ?? 0);
    const totalDeduction = sellerPayout + shippingFee;

    // 1. Cộng tiền hàng sau khi trừ phí sàn cho người bán
    await tx.wallet.update({
      where: { id: seller.id },
      data: { balance: { increment: sellerPayout } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: seller.id,
        amount: sellerPayout,
        type: WalletTransactionType.ESCROW_PAYOUT,
        status: 'SUCCESS',
        referenceId: order.id,
        description: 'Giải ngân sau giao hàng hoặc phân xử khiếu nại',
      },
    });

    // 2. Khấu trừ ví Admin: xuất tiền hàng cho Shop và thanh toán cước GHN
    await tx.wallet.update({
      where: { id: admin.id },
      data: { balance: { decrement: totalDeduction } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: admin.id,
        amount: sellerPayout,
        type: WalletTransactionType.ESCROW_PAYOUT,
        status: 'SUCCESS',
        referenceId: order.id,
        description: `Chi trả tiền hàng cho người bán đơn #${order.id.slice(0, 8)}`,
      },
    });

    if (shippingFee > 0) {
      await tx.walletTransaction.create({
        data: {
          walletId: admin.id,
          amount: shippingFee,
          type: WalletTransactionType.PLATFORM_FEE,
          status: 'SUCCESS',
          referenceId: order.id,
          description: `Khấu trừ chi phí cước vận chuyển GHN đơn #${order.id.slice(0, 8)}`,
        },
      });
    }
    await tx.escrowRecord.update({
      where: { orderId: order.id },
      data: { status: EscrowStatus.DISBURSED, disbursedAt: new Date() },
    });
    await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.CONFIRMED } });
    if (order.shipment?.status === 'DELIVERED') {
      if (this.reputation) {
        await this.reputation.adjustScore(
          {
            userId: order.buyerId,
            deltaPoints: 1,
            reason: 'Hoàn tất đơn hàng',
            referenceId: order.id,
          },
          tx,
        );
        await this.reputation.adjustScore(
          {
            userId: order.sellerId,
            deltaPoints: 2,
            reason: 'Hoàn tất đơn hàng',
            referenceId: order.id,
          },
          tx,
        );
      } else {
        for (const userId of [order.buyerId, order.sellerId]) {
          await tx.user.update({
            where: { id: userId },
            data: { reputationScore: { increment: 2 } },
          });
          await tx.reputationLog.create({
            data: {
              userId,
              deltaPoints: 2,
              balanceAfter: 102,
              reason: 'Hoàn tất đơn hàng',
              referenceId: order.id,
            },
          });
        }
      }
    }
    await tx.notification.create({
      data: {
        userId: order.sellerId,
        type: 'PAYMENT',
        channel: 'IN_APP',
        title: 'Đã giải ngân đơn hàng',
        content: `Đơn #${order.id.slice(0, 8)} đã được giải ngân ${Number(escrow.sellerPayout).toLocaleString('vi-VN')} VND.`,
      },
    });
    return {
      success: true,
      orderStatus: OrderStatus.CONFIRMED,
      escrowStatus: EscrowStatus.DISBURSED,
    };
  }

  async confirmDelivery(orderId: string, buyerId: string): Promise<EscrowResult> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadLocked(tx, orderId);
      if (order.buyerId !== buyerId)
        throw new ForbiddenException('Chỉ người mua của đơn được xác nhận nhận hàng.');
      return this.release(tx, order);
    });
  }

  async dispute(
    orderId: string,
    buyerId: string,
    reason: string,
  ): Promise<{ success: boolean; dispute: Dispute }> {
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadLocked(tx, orderId);
      if (order.buyerId !== buyerId)
        throw new ForbiddenException('Bạn không có quyền khiếu nại đơn hàng này.');
      if (order.afterSales && !['REJECTED', 'COMPLETED'].includes(order.afterSales.status))
        throw new BadRequestException('Đơn đang có yêu cầu hủy/trả hàng.');
      if (order.dispute) return { success: true, dispute: order.dispute };
      if (order.escrowRecord?.status !== EscrowStatus.HELD || !reason.trim())
        throw new BadRequestException('Đơn không còn tiền ký quỹ hoặc thiếu lý do khiếu nại.');
      const dispute = await tx.dispute.create({
        data: { orderId, openedByUserId: buyerId, reason: reason.trim() },
      });
      await tx.escrowRecord.update({ where: { orderId }, data: { status: EscrowStatus.DISPUTED } });
      await notifyAdminsAndStaff(tx, {
        title: 'Khiếu nại đơn hàng mới ⚠️',
        content: `Đơn #${orderId.slice(0, 8)} vừa có khiếu nại từ người mua: ${reason.trim()}`,
        type: NotificationType.DISPUTE,
        adminTargetUrl: '/admin/reports',
        staffTargetUrl: '/staff/disputes',
        metadata: {
          entityType: 'ORDER_DISPUTE',
          disputeId: dispute.id,
          orderId,
        },
      });
      return { success: true, dispute };
    });
  }

  async resolve(
    orderId: string,
    actor: ShipmentActor,
    verdict: 'BUYER' | 'SELLER',
    reason: string,
  ): Promise<EscrowResult> {
    if (!['ADMIN', 'SUPPORT_STAFF'].includes(actor.role))
      throw new ForbiddenException('Chỉ Admin/Staff được phân xử.');
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadLocked(tx, orderId);
      if (!order.dispute || !reason.trim())
        throw new BadRequestException('Không có khiếu nại hoặc thiếu lý do phân xử.');
      if (!['OPEN', 'UNDER_REVIEW'].includes(order.dispute.status))
        return { success: true, alreadyProcessed: true };
      const escrow = order.escrowRecord;
      if (!escrow || escrow.status !== EscrowStatus.DISPUTED)
        throw new BadRequestException('Không có tiền ký quỹ đang bị tranh chấp.');

      await tx.dispute.update({
        where: { orderId },
        data: {
          status:
            verdict === 'BUYER'
              ? DisputeStatus.RESOLVED_BUYER_FAVOR
              : DisputeStatus.RESOLVED_SELLER_FAVOR,
          resolvedByUserId: actor.id,
          resolutionNotes: reason.trim(),
          resolvedAt: new Date(),
        },
      });

      // BẮN NOTI CHO NGƯỜI MUA (BUYER)
      await tx.notification.create({
        data: {
          userId: order.buyerId,
          title: 'Kết quả phân xử khiếu nại ⚖️',
          content: `Khiếu nại cho đơn hàng #${orderId.slice(0, 8)} đã được Admin xử lý. Quyết định: ${verdict === 'BUYER' ? 'Hoàn tiền cho bạn' : 'Phần thắng thuộc về Người bán'}. Chi tiết: ${reason.trim()}`,
          type: NotificationType.DISPUTE,
          channel: 'IN_APP',
        },
      });

      // BẮN NOTI CHO NGƯỜI BÁN (SELLER)
      await tx.notification.create({
        data: {
          userId: order.sellerId,
          title: 'Kết quả phân xử khiếu nại ⚖️',
          content: `Khiếu nại của đơn hàng #${orderId.slice(0, 8)} đã được Admin xử lý. Quyết định: ${verdict === 'SELLER' ? 'Giải ngân tiền hàng cho bạn' : 'Phần thắng thuộc về Người mua (Hoàn tiền)'}. Chi tiết: ${reason.trim()}`,
          type: NotificationType.DISPUTE,
          channel: 'IN_APP',
        },
      });

      if (verdict === 'SELLER') return this.release(tx, order, true);
      if (!this.refunds) {
        throw new BadRequestException('Dịch vụ hoàn tiền chưa sẵn sàng.');
      }
      const refunds = await this.refunds.issue(tx, order, false);
      const complete = refunds.every((refund) => refund.status === 'SUCCESS');
      return {
        success: true,
        ...(complete ? { orderStatus: OrderStatus.REFUNDED } : {}),
        refundDestination: refunds.every((refund) => refund.destination === 'WALLET')
          ? 'NEXUS_WALLET'
          : 'ORIGINAL',
      };
    });
  }
}
