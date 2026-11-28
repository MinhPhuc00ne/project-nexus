import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
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
import { RefundService } from '../../after-sales/services/refund.service';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAdminsAndStaff } from '../../../core/notifications/admin-notification.util';
import { PlatformSettingsService } from '../../../core/settings/platform-settings.service';
import { TreasuryService } from '../../treasury/services/treasury.service';
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
    private readonly settings: PlatformSettingsService,
    private readonly treasury: TreasuryService,
    private readonly refunds?: RefundService,
    private readonly reputation?: ReputationService,
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly auditLog?: AuditLogService,
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
    const config = await this.settings.getAll();
    const percentage = Number(config?.platformFeePercentage ?? 7);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100)
      throw new BadRequestException('Invalid platform fee percentage.');
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

    const escrowWallet = await this.treasury.getOrCreateEscrowWallet(tx);
    await tx.wallet.update({
      where: { id: escrowWallet.id },
      data: { balance: { increment: order.totalAmount } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: escrowWallet.id,
        amount: order.totalAmount,
        type: WalletTransactionType.ESCROW_LOCK,
        status: 'SUCCESS',
        referenceId: order.id,
        description: `Escrow hold for order #${order.id.slice(0, 8)} (${Number(order.totalAmount).toLocaleString('vi-VN')} VND)`,
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
    if (!order) throw new NotFoundException('Order not found.');
    return order;
  }

  private async release(
    tx: Prisma.TransactionClient,
    order: EscrowOrder,
    arbitration = false,
  ): Promise<EscrowResult> {
    if (order.afterSales && !['REJECTED', 'COMPLETED'].includes(order.afterSales.status))
      throw new BadRequestException('Order has an active cancellation/return request.');
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
      throw new BadRequestException('GHN has not confirmed delivery yet.');
    }
    if (!escrow) {
      // COD order (not escrowed through the NEXUS system wallet)
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
              reason: 'COD order completed',
              referenceId: order.id,
            },
            tx,
          );
          await this.reputation.adjustScore(
            {
              userId: order.sellerId,
              deltaPoints: 2,
              reason: 'COD order completed',
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
                reason: 'COD order completed',
                referenceId: order.id,
              },
            });
          }
        }
      }
      await publishNotification(
        tx,
        {
          userId: order.sellerId,
          type: 'ORDER',
          channel: 'IN_APP',
          title: 'COD order completed',
          content: `Order #${order.id.slice(0, 8)} has been confirmed as delivered by the buyer.`,
        },
        this.notifications,
      );
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
      throw new BadRequestException('Funds are currently held for dispute resolution.');
    }
    if (
      escrow.status !== EscrowStatus.HELD &&
      !(arbitration && escrow.status === EscrowStatus.DISPUTED)
    ) {
      throw new BadRequestException('Escrow funds are not in a releasable state.');
    }
    const seller = await tx.wallet.upsert({
      where: { userId: order.sellerId },
      update: {},
      create: { userId: order.sellerId, balance: 0, lockedBalance: 0, currency: 'VND' },
    });
    const escrowWallet = await this.treasury.getOrCreateEscrowWallet(tx);
    const platformRevenueWallet = await this.treasury.getOrCreatePlatformRevenueWallet(tx);
    const sellerPayout = Number(escrow.sellerPayout);
    const platformFee = Number(escrow.platformFee);
    const shippingFee = Number(order.shippingFee ?? 0);
    const totalEscrowOutflow = sellerPayout + platformFee + shippingFee;

    // 1. Credit seller payout after deducting platform fee
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
        description: 'Escrow payout after delivery or dispute arbitration',
      },
    });

    // 2. Release escrowed funds from ESCROW_LIABILITY and record platform fee into PLATFORM_REVENUE
    await tx.wallet.update({
      where: { id: escrowWallet.id },
      data: { balance: { decrement: totalEscrowOutflow } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: escrowWallet.id,
        amount: sellerPayout,
        type: WalletTransactionType.ESCROW_PAYOUT,
        status: 'SUCCESS',
        referenceId: order.id,
        description: `Seller payout for order #${order.id.slice(0, 8)}`,
      },
    });

    if (platformFee > 0) {
      await tx.wallet.update({
        where: { id: platformRevenueWallet.id },
        data: { balance: { increment: platformFee } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: platformRevenueWallet.id,
          amount: platformFee,
          type: WalletTransactionType.PLATFORM_FEE,
          status: 'SUCCESS',
          referenceId: order.id,
          description: `Platform fee collected for order #${order.id.slice(0, 8)}`,
        },
      });
    }

    if (shippingFee > 0) {
      await tx.walletTransaction.create({
        data: {
          walletId: escrowWallet.id,
          amount: shippingFee,
          type: WalletTransactionType.PLATFORM_FEE,
          status: 'SUCCESS',
          referenceId: order.id,
          description: `GHN shipping fee deducted for order #${order.id.slice(0, 8)}`,
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
            reason: 'Order completed',
            referenceId: order.id,
          },
          tx,
        );
        await this.reputation.adjustScore(
          {
            userId: order.sellerId,
            deltaPoints: 2,
            reason: 'Order completed',
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
              reason: 'Order completed',
              referenceId: order.id,
            },
          });
        }
      }
    }
    await publishNotification(
      tx,
      {
        userId: order.sellerId,
        type: 'PAYMENT',
        channel: 'IN_APP',
        title: 'Order funds disbursed',
        content: `Order #${order.id.slice(0, 8)} has disbursed ${Number(escrow.sellerPayout).toLocaleString('vi-VN')} VND.`,
      },
      this.notifications,
    );
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
        throw new ForbiddenException('Only the order buyer can confirm delivery.');
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
        throw new ForbiddenException(
          'You do not have permission to open a dispute for this order.',
        );
      if (order.afterSales && !['REJECTED', 'COMPLETED'].includes(order.afterSales.status))
        throw new BadRequestException('Order has an active cancellation/return request.');
      if (order.dispute) return { success: true, dispute: order.dispute };
      if (order.escrowRecord?.status !== EscrowStatus.HELD || !reason.trim())
        throw new BadRequestException('Order has no held escrow or is missing a dispute reason.');
      const dispute = await tx.dispute.create({
        data: { orderId, openedByUserId: buyerId, reason: reason.trim() },
      });
      await tx.escrowRecord.update({ where: { orderId }, data: { status: EscrowStatus.DISPUTED } });
      await notifyAdminsAndStaff(
        tx,
        {
          title: 'New order dispute ⚠️',
          content: `Order #${orderId.slice(0, 8)} received a buyer dispute: ${reason.trim()}`,
          type: NotificationType.DISPUTE,
          adminTargetUrl: '/admin/reports',
          staffTargetUrl: '/staff/disputes',
          metadata: {
            entityType: 'ORDER_DISPUTE',
            disputeId: dispute.id,
            orderId,
          },
        },
        this.notifications,
      );
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
      throw new ForbiddenException('Only Admin/Staff can arbitrate disputes.');
    return this.prisma.$transaction(async (tx) => {
      const order = await this.loadLocked(tx, orderId);
      if (!order.dispute || !reason.trim())
        throw new BadRequestException('No dispute found or missing arbitration reason.');
      if (!['OPEN', 'UNDER_REVIEW'].includes(order.dispute.status))
        return { success: true, alreadyProcessed: true };
      const escrow = order.escrowRecord;
      if (!escrow || escrow.status !== EscrowStatus.DISPUTED)
        throw new BadRequestException('No disputed escrow funds found.');

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

      await this.auditLog?.record(
        {
          eventName: 'order.dispute.resolved',
          operatorId: actor.id,
          payload: {
            orderId,
            disputeId: order.dispute.id,
            verdict,
            actorRole: actor.role,
            reason: reason.trim(),
          },
        },
        tx,
      );

      // Notify buyer
      await publishNotification(
        tx,
        {
          userId: order.buyerId,
          title: 'Dispute arbitration result ⚖️',
          content: `Your dispute for order #${orderId.slice(0, 8)} has been resolved by Admin. Decision: ${verdict === 'BUYER' ? 'Refund issued to you' : 'Ruled in favor of the Seller'}. Details: ${reason.trim()}`,
          type: NotificationType.DISPUTE,
          channel: 'IN_APP',
        },
        this.notifications,
      );

      // Notify seller
      await publishNotification(
        tx,
        {
          userId: order.sellerId,
          title: 'Dispute arbitration result ⚖️',
          content: `The dispute for order #${orderId.slice(0, 8)} has been resolved by Admin. Decision: ${verdict === 'SELLER' ? 'Funds disbursed to you' : 'Ruled in favor of the Buyer (Refunded)'}. Details: ${reason.trim()}`,
          type: NotificationType.DISPUTE,
          channel: 'IN_APP',
        },
        this.notifications,
      );

      if (verdict === 'SELLER') return this.release(tx, order, true);
      if (!this.refunds) {
        throw new BadRequestException('Refund service is not ready.');
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
