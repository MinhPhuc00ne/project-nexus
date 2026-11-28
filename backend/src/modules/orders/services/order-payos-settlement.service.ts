import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { WebhookData } from '@payos/node';
import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RefundService } from '../../after-sales/services/refund.service';
import { InventoryService } from '../../catalog/services/inventory.service';
import { ProductTrendingService } from '../../catalog/services/product-trending.service';
import { PayosSettlement } from '../../payments/services/payos-settlement';
import { TreasuryService } from '../../treasury/services/treasury.service';
import { OrderEscrowService } from './order-escrow.service';

/**
 * Handles PayOS webhook and payment-group settlement into escrow for retail orders.
 */
@Injectable()
export class OrderPayosSettlementService {
  private readonly logger = new Logger('OrderService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly escrow: OrderEscrowService,
    @Optional() private readonly inventoryService?: InventoryService,
    @Optional() private readonly refunds?: RefundService,
    @Optional() private readonly treasury?: TreasuryService,
    @Optional() private readonly trendingService?: ProductTrendingService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  private async syncTrendingSafely(): Promise<void> {
    if (!this.trendingService) return;
    try {
      await this.trendingService.syncTopTrendingNotifications();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to sync trending notifications: ${message}`);
    }
  }

  /**
   * Settles a verified PayOS callback, against one order or against a group.
   */
  async settleOrderPayment(webhookData: WebhookData): Promise<PayosSettlement | null> {
    const { orderCode, code } = webhookData;

    this.logger.log(`Received PayOS webhook for orderCode=${orderCode}, status code=${code}`);

    if (code !== '00') return { success: true, orderCode };

    const payment = await this.prisma.payment.findFirst({
      where: {
        transactionCode: String(orderCode),
        provider: PaymentProvider.PAYOS,
      },
    });

    if (payment) {
      if (payment.status === PaymentStatus.SUCCESS) {
        this.logger.log(`PayOS transaction orderCode=${orderCode} was already processed`);
        return { success: true, message: 'Already processed' };
      }

      if (Number(webhookData.amount) !== Number(payment.amount))
        throw new BadRequestException('PayOS amount does not match the order.');

      await this.prisma.$transaction((tx) => this.settlePaidOrder(tx, payment.id, { webhookData }));

      this.logger.log(`Order ${payment.orderId} paid via PayOS; funds held in escrow.`);
      void this.syncTrendingSafely();
      return { success: true, orderCode };
    }

    const group = await this.prisma.paymentGroup.findUnique({
      where: { orderCode: String(orderCode) },
      include: { orders: { select: { id: true, totalAmount: true } } },
    });

    if (!group) {
      return null;
    }

    if (group.status === PaymentStatus.SUCCESS) {
      this.logger.log(`PayOS payment group orderCode=${orderCode} was already processed`);
      return { success: true, message: 'Already processed' };
    }

    if (Number(webhookData.amount) !== Number(group.amount))
      throw new BadRequestException('PayOS amount does not match the order group.');

    await this.settleGroupOrders(group.id, { webhookData });

    this.logger.log(
      `Group ${group.id} (${group.orders.length} orders) paid via PayOS; funds held in escrow.`,
    );
    void this.syncTrendingSafely();
    return { success: true, orderCode };
  }

  async settleGroupOrders(groupId: string, audit: Record<string, unknown>): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payment_groups WHERE id = ${groupId} FOR UPDATE`;
      const current = await tx.paymentGroup.findUniqueOrThrow({
        where: { id: groupId },
        include: { orders: { select: { id: true, totalAmount: true } } },
      });
      if (current.status === PaymentStatus.SUCCESS) return false;

      for (const order of current.orders) {
        const orderPayment = await tx.payment.create({
          data: {
            orderId: order.id,
            provider: PaymentProvider.PAYOS,
            amount: order.totalAmount,
            status: PaymentStatus.PENDING,
            metadata: {
              paymentGroupId: current.id,
              orderCode: Number(current.orderCode),
            } as Prisma.InputJsonValue,
          },
        });
        await this.settlePaidOrder(tx, orderPayment.id, audit);
      }

      await tx.paymentGroup.update({
        where: { id: current.id },
        data: {
          status: PaymentStatus.SUCCESS,
          metadata: {
            ...((current.metadata && typeof current.metadata === 'object'
              ? current.metadata
              : {}) as Record<string, unknown>),
            ...audit,
            paidAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      return true;
    });
  }

  async settlePaidOrder(
    tx: Prisma.TransactionClient,
    paymentId: string,
    audit: Record<string, unknown>,
  ): Promise<void> {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${payment.orderId} FOR UPDATE`;
    const currentPayment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (currentPayment.status === PaymentStatus.SUCCESS) return;

    const currentMetadata = (
      payment.metadata && typeof payment.metadata === 'object' ? payment.metadata : {}
    ) as Record<string, unknown>;

    const payable = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });

    if (payable.status === OrderStatus.CANCELLED && this.refunds && this.treasury) {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          metadata: {
            ...currentMetadata,
            ...audit,
            paidAfterCancellation: true,
          } as Prisma.InputJsonValue,
        },
      });
      const escrowWallet = await this.treasury.getOrCreateEscrowWallet(tx);
      await tx.wallet.update({
        where: { id: escrowWallet.id },
        data: { balance: { increment: currentPayment.amount } },
      });
      await tx.walletTransaction.create({
        data: {
          walletId: escrowWallet.id,
          amount: currentPayment.amount,
          type: 'ESCROW_LOCK',
          status: 'SUCCESS',
          referenceId: payment.id,
          description: 'Recorded payment received after order cancellation',
        },
      });
      await this.refunds.reserve(tx, {
        orderId: payable.id,
        buyerId: payable.buyerId,
        paymentId: payment.id,
        amount: currentPayment.amount,
        adminWalletId: escrowWallet.id,
        toWallet: false,
      });
      return;
    }

    if (payable.status !== OrderStatus.PENDING_PAYMENT)
      throw new BadRequestException(
        'Order has already been paid or cancelled; reconciliation required for this payment.',
      );

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        metadata: {
          ...currentMetadata,
          ...audit,
          paidAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    const updatedOrder = await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: OrderStatus.PAID,
      },
      include: {
        buyer: true,
        seller: true,
      },
    });

    if (this.inventoryService) {
      await this.inventoryService.commitReservation(tx, payment.orderId);
    }

    await this.escrow.hold(tx, updatedOrder);

    if (typeof tx?.notification?.create === 'function') {
      await publishNotification(
        tx,
        {
          userId: updatedOrder.buyerId,
          title: 'PayOS payment successful ✅',
          content: `Order #${updatedOrder.id.slice(0, 8).toUpperCase()} totaling ${Number(payment.amount).toLocaleString('vi-VN')} VND was paid via PayOS (VietQR). Funds are safely held in NEXUS Escrow.`,
          type: NotificationType.PAYMENT,
          channel: NotificationChannel.IN_APP,
        },
        this.notifications,
      );

      await publishNotification(
        tx,
        {
          userId: updatedOrder.sellerId,
          title: 'New order paid via PayOS 🛒',
          content: `Order #${updatedOrder.id.slice(0, 8).toUpperCase()} totaling ${Number(payment.amount).toLocaleString('vi-VN')} VND was paid via VietQR. Please prepare the package and hand it over to GHN.`,
          type: NotificationType.ORDER,
          channel: NotificationChannel.IN_APP,
        },
        this.notifications,
      );
    }
  }
}
