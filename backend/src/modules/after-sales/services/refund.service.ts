import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { NotificationType, OrderRefund, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAllAdmins } from '../../../core/notifications/admin-notification.util';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { AfterSalesOrder, AfterSalesStoreService } from './after-sales-store.service';
import { ShipmentActor } from '../../fulfillment/services/shipment-tracking.service';

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly treasury: TreasuryService,
    private readonly store: AfterSalesStoreService,
  ) {}

  async issue(
    tx: Prisma.TransactionClient,
    order: AfterSalesOrder,
    walletConsent: boolean,
  ): Promise<OrderRefund[]> {
    const existing = await tx.orderRefund.findMany({ where: { orderId: order.id } });
    if (existing.length) return existing;
    const escrow = order.escrowRecord;
    if (!escrow || !['HELD', 'DISPUTED', 'DISBURSED'].includes(escrow.status))
      throw new BadRequestException('Không có khoản thanh toán có thể hoàn.');
    const payments = await tx.payment.findMany({ where: { orderId: order.id, status: 'SUCCESS' } });
    if (
      !payments.length ||
      payments
        .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0))
        .comparedTo(escrow.totalAmount) !== 0
    )
      throw new BadRequestException('Cần đối soát số tiền đã thanh toán trước khi hoàn.');
    const admin = await this.treasury.getOrCreatePrimaryAdminWallet(tx);
    if (escrow.status === 'DISBURSED') {
      const recovered = await tx.wallet.updateMany({
        where: { userId: order.sellerId, balance: { gte: escrow.sellerPayout } },
        data: { balance: { decrement: escrow.sellerPayout } },
      });
      if (recovered.count !== 1)
        throw new BadRequestException(
          'Ví shop không đủ để thu hồi tiền đã giải ngân. Cần bổ sung tiền trước khi hoàn.',
        );
      const seller = await tx.wallet.findUniqueOrThrow({ where: { userId: order.sellerId } });
      await tx.walletTransaction.create({
        data: {
          walletId: seller.id,
          amount: escrow.sellerPayout,
          type: 'ESCROW_REFUND',
          status: 'SUCCESS',
          referenceId: order.id,
          description: 'Thu hồi tiền đã giải ngân để hoàn đơn',
        },
      });
      await tx.wallet.update({
        where: { id: admin.id },
        data: { balance: { increment: escrow.sellerPayout } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: admin.id,
          amount: escrow.sellerPayout,
          type: 'ESCROW_REFUND',
          status: 'SUCCESS',
          referenceId: order.id,
          description: 'Thu hồi tiền shop để hoàn đơn',
        },
      });
    }
    const refunds: OrderRefund[] = [];
    for (const payment of payments)
      refunds.push(
        await this.reserve(tx, {
          orderId: order.id,
          buyerId: order.buyerId,
          paymentId: payment.id,
          amount: payment.amount,
          adminWalletId: admin.id,
          toWallet: payment.provider === 'WALLET' || walletConsent,
        }),
      );
    await this.finish(tx, order.id);
    return refunds;
  }

  async reserve(
    tx: Prisma.TransactionClient,
    input: {
      orderId: string;
      buyerId: string;
      paymentId: string;
      amount: Prisma.Decimal;
      adminWalletId: string;
      toWallet: boolean;
    },
  ): Promise<OrderRefund> {
    const existing = await tx.orderRefund.findUnique({ where: { paymentId: input.paymentId } });
    if (existing) return existing;
    const debited = await tx.wallet.updateMany({
      where: { id: input.adminWalletId, balance: { gte: input.amount } },
      data: {
        balance: { decrement: input.amount },
        ...(!input.toWallet ? { lockedBalance: { increment: input.amount } } : {}),
      },
    });
    if (debited.count !== 1)
      throw new BadRequestException('Ví nền tảng chưa đủ tiền hoàn. Cần đối soát và bổ sung tiền.');
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: input.adminWalletId,
        amount: input.amount,
        type: 'ESCROW_REFUND',
        status: input.toWallet ? 'SUCCESS' : 'PENDING',
        referenceId: input.paymentId,
        description: input.toWallet
          ? 'Hoàn tiền vào ví người mua'
          : 'Giữ tiền chờ hoàn về phương thức thanh toán ban đầu',
      },
    });
    if (input.toWallet) {
      const buyer = await tx.wallet.upsert({
        where: { userId: input.buyerId },
        update: {},
        create: { userId: input.buyerId, balance: 0, lockedBalance: 0, currency: 'VND' },
      });
      await tx.wallet.update({
        where: { id: buyer.id },
        data: { balance: { increment: input.amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: buyer.id,
          amount: input.amount,
          type: 'ESCROW_REFUND',
          status: 'SUCCESS',
          referenceId: input.paymentId,
          description: 'Hoàn tiền đơn hàng',
        },
      });
    }
    const refund = await tx.orderRefund.create({
      data: {
        orderId: input.orderId,
        paymentId: input.paymentId,
        amount: input.amount,
        adminWalletId: input.adminWalletId,
        transactionId: transaction.id,
        destination: input.toWallet ? 'WALLET' : 'ORIGINAL',
        status: input.toWallet ? 'SUCCESS' : 'PENDING',
        completedAt: input.toWallet ? new Date() : null,
      },
    });
    await tx.notification.create({
      data: {
        userId: input.buyerId,
        type: 'PAYMENT',
        channel: 'IN_APP',
        title: input.toWallet ? 'Đã hoàn tiền vào ví' : 'Đang xử lý hoàn tiền về nguồn',
        content: `Đơn #${input.orderId.slice(0, 8)}: ${input.amount.toString()} VND. ${input.toWallet ? 'Đã ghi có ví NEXUS.' : 'Khoản hoàn đang chờ xác nhận chuyển tiền, chưa hoàn tất.'}`,
      },
    });
    if (!input.toWallet) {
      await notifyAllAdmins(tx, {
        title: 'Khoản hoàn tiền ngoại sàn chờ Admin xác nhận',
        content: `Đơn #${input.orderId.slice(0, 8)} cần Admin đối soát & xác nhận hoàn ${input.amount.toString()} VND về nguồn thanh toán gốc.`,
        type: NotificationType.PAYMENT,
        targetUrl: '/admin/refunds',
      });
    }
    return refund;
  }

  async finish(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
    const refunds = await tx.orderRefund.findMany({ where: { orderId } });
    if (!refunds.length || refunds.some((r) => r.status !== 'SUCCESS')) return;
    await tx.escrowRecord.updateMany({
      where: { orderId },
      data: { status: 'REFUNDED', refundedAt: new Date() },
    });
    await tx.order.updateMany({
      where: { id: orderId, status: { not: 'CANCELLED' } },
      data: { status: 'REFUNDED' },
    });
    await tx.afterSalesRequest.updateMany({
      where: { orderId, status: { in: ['APPROVED', 'RECEIVED'] } },
      data: { status: 'COMPLETED' },
    });
  }

  async complete(
    refundId: string,
    actor: ShipmentActor,
    externalReference: string,
  ): Promise<OrderRefund> {
    if (actor.role !== 'ADMIN')
      throw new ForbiddenException('Chỉ Admin được xác nhận hoàn tiền ngoài hệ thống.');
    const refund = await this.prisma.orderRefund.findUniqueOrThrow({ where: { id: refundId } });
    return this.prisma.$transaction(async (tx) => {
      const order = await this.store.lock(tx, refund.orderId);
      const current = await tx.orderRefund.findUniqueOrThrow({ where: { id: refundId } });
      if (current.status === 'SUCCESS') return current;
      const reference = externalReference.trim();
      if (!reference || current.destination !== 'ORIGINAL')
        throw new BadRequestException('Thiếu mã đối soát hoàn tiền hợp lệ.');
      const released = await tx.wallet.updateMany({
        where: { id: current.adminWalletId, lockedBalance: { gte: current.amount } },
        data: { lockedBalance: { decrement: current.amount } },
      });
      if (released.count !== 1)
        throw new BadRequestException('Số dư đang giữ để hoàn tiền không hợp lệ.');
      await tx.walletTransaction.update({
        where: { id: current.transactionId },
        data: { status: 'SUCCESS' },
      });
      const result = await tx.orderRefund.update({
        where: { id: refundId },
        data: {
          status: 'SUCCESS',
          externalReference: reference,
          completedBy: actor.id,
          completedAt: new Date(),
        },
      });
      await this.finish(tx, order.id);
      await this.store.audit(tx, order, actor, 'refund-completed', {
        refundId,
        externalReference: reference,
      });
      return result;
    });
  }
}
