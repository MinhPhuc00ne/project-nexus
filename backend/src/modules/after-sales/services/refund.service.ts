import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import { BadRequestException, ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import { NotificationType, OrderRefund, Prisma } from '@prisma/client';
import { AuditLogService } from '../../../core/audit/audit-log.service';
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
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly auditLog?: AuditLogService,
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
      throw new BadRequestException({
        message: 'No refundable payment found.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    const payments = await tx.payment.findMany({ where: { orderId: order.id, status: 'SUCCESS' } });
    if (
      !payments.length ||
      payments
        .reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0))
        .comparedTo(escrow.totalAmount) !== 0
    )
      throw new BadRequestException({
        message: 'Paid amount must be reconciled before issuing a refund.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    const escrowWallet = await this.treasury.getOrCreateEscrowWallet(tx);
    if (escrow.status === 'DISBURSED') {
      const recovered = await tx.wallet.updateMany({
        where: { userId: order.sellerId, balance: { gte: escrow.sellerPayout } },
        data: { balance: { decrement: escrow.sellerPayout } },
      });
      if (recovered.count !== 1)
        throw new BadRequestException(
          'Shop wallet has insufficient balance to claw back disbursed funds. Top-up is required before refunding.',
        );
      const seller = await tx.wallet.findUniqueOrThrow({ where: { userId: order.sellerId } });
      await tx.walletTransaction.create({
        data: {
          walletId: seller.id,
          amount: escrow.sellerPayout,
          type: 'ESCROW_REFUND',
          status: 'SUCCESS',
          referenceId: order.id,
          description: 'Clawback of disbursed payout for order refund',
        },
      });
      await tx.wallet.update({
        where: { id: escrowWallet.id },
        data: { balance: { increment: escrow.sellerPayout } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: escrowWallet.id,
          amount: escrow.sellerPayout,
          type: 'ESCROW_REFUND',
          status: 'SUCCESS',
          referenceId: order.id,
          description: 'Recovered shop funds for order refund',
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
          adminWalletId: escrowWallet.id,
          toWallet: payment.provider === 'WALLET' || walletConsent,
        }),
      );
    await this.finish(tx, order.id);
    await this.auditLog?.record(
      {
        eventName: 'order.refund.issued',
        operatorId: order.buyerId,
        payload: {
          orderId: order.id,
          refundCount: refunds.length,
          totalAmount: refunds.reduce((sum, r) => sum + Number(r.amount), 0),
          destinations: refunds.map((r) => r.destination),
        },
      },
      tx,
    );
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
      throw new BadRequestException(
        'Platform wallet has insufficient balance for refund. Reconciliation and top-up required.',
      );
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: input.adminWalletId,
        amount: input.amount,
        type: 'ESCROW_REFUND',
        status: input.toWallet ? 'SUCCESS' : 'PENDING',
        referenceId: input.paymentId,
        description: input.toWallet
          ? 'Refund credited to buyer wallet'
          : 'Funds held pending refund to original payment method',
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
          description: 'Order refund',
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
    await publishNotification(
      tx,
      {
        userId: input.buyerId,
        type: 'PAYMENT',
        channel: 'IN_APP',
        title: input.toWallet ? 'Refunded to wallet' : 'Processing refund to original source',
        content: `Order #${input.orderId.slice(0, 8)}: ${input.amount.toString()} VND. ${input.toWallet ? 'Credited to your NEXUS wallet.' : 'Refund is pending transfer confirmation and not yet completed.'}`,
      },
      this.notifications,
    );
    if (!input.toWallet) {
      await notifyAllAdmins(
        tx,
        {
          title: 'External refund awaiting Admin confirmation',
          content: `Order #${input.orderId.slice(0, 8)} requires Admin reconciliation & confirmation to refund ${input.amount.toString()} VND to the original payment source.`,
          type: NotificationType.PAYMENT,
          targetUrl: '/admin/refunds',
        },
        this.notifications,
      );
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
      throw new ForbiddenException('Only Admins may confirm off-platform refunds.');
    const refund = await this.prisma.orderRefund.findUniqueOrThrow({ where: { id: refundId } });
    return this.prisma.$transaction(async (tx) => {
      const order = await this.store.lock(tx, refund.orderId);
      const current = await tx.orderRefund.findUniqueOrThrow({ where: { id: refundId } });
      if (current.status === 'SUCCESS') return current;
      const reference = externalReference.trim();
      if (!reference || current.destination !== 'ORIGINAL')
        throw new BadRequestException({
          message: 'Missing valid refund reconciliation reference.',
          errorCode: AppErrorCode.BAD_REQUEST,
        });
      const released = await tx.wallet.updateMany({
        where: { id: current.adminWalletId, lockedBalance: { gte: current.amount } },
        data: { lockedBalance: { decrement: current.amount } },
      });
      if (released.count !== 1)
        throw new BadRequestException('Invalid locked balance for completing refund.');
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
      await this.auditLog?.record(
        {
          eventName: 'order.refund.completed',
          operatorId: actor.id,
          payload: {
            refundId,
            orderId: order.id,
            amount: Number(current.amount),
            externalReference: reference,
          },
        },
        tx,
      );
      return result;
    });
  }
}
