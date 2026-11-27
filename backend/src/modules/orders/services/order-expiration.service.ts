import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationChannel,
  NotificationType,
  OrderCancellationActor,
  OrderStatus,
  PaymentStatus,
  ReservationStatus,
} from '@prisma/client';
import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DistributedLockService } from '../../../core/redis/distributed-lock.service';
import { PlatformSettingsService } from '../../../core/settings/platform-settings.service';

const SWEEP_INTERVAL_MS = 60_000;
const ORDER_BATCH_SIZE = 25;
const RESERVATION_BATCH_SIZE = 50;

/**
 * Periodically cancels overdue `PENDING_PAYMENT` orders and releases expired
 * `PENDING` inventory reservations so unclaimed stock returns to inventory.
 */
@Injectable()
export class OrderExpirationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderExpirationService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly locks: DistributedLockService,
    private readonly settings: PlatformSettingsService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  onModuleInit(): void {
    const nodeEnv = this.configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV;
    if (nodeEnv === 'test') {
      return;
    }

    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = this.locks
        .runExclusively('orders:expiration-sweep', 50, () => this.sweep())
        .then(() => undefined)
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Order expiration sweep failed: ${message}`);
        })
        .finally(() => {
          this.running = undefined;
        });
    }, SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.running;
  }

  async sweep(now = new Date()): Promise<{
    expiredOrders: number;
    releasedReservations: number;
  }> {
    const checkoutTimeoutMinutes = await this.settings.get('checkoutTimeoutMinutes');
    const orderCutoff = new Date(now.getTime() - checkoutTimeoutMinutes * 60_000);

    const overdueOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: { lte: orderCutoff },
      },
      take: ORDER_BATCH_SIZE,
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    let expiredOrders = 0;
    for (const candidate of overdueOrders) {
      const cancelled = await this.expirePendingOrder(candidate.id);
      if (cancelled) expiredOrders += 1;
    }

    const expiredReservations = await this.prisma.inventoryReservation.findMany({
      where: {
        status: ReservationStatus.PENDING,
        expiresAt: { lte: now },
      },
      take: RESERVATION_BATCH_SIZE,
      orderBy: { expiresAt: 'asc' },
      select: { id: true },
    });

    let releasedReservations = 0;
    for (const reservation of expiredReservations) {
      const released = await this.releaseStandaloneReservation(reservation.id);
      if (released) releasedReservations += 1;
    }

    return { expiredOrders, releasedReservations };
  }

  async expirePendingOrder(orderId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, buyerId: true, status: true, paymentGroupId: true },
      });
      if (!order || order.status !== OrderStatus.PENDING_PAYMENT) {
        return false;
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancellationActor: OrderCancellationActor.SYSTEM,
        },
      });

      await tx.payment.updateMany({
        where: { orderId: order.id, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.CANCELLED },
      });

      if (order.paymentGroupId) {
        const remainingPending = await tx.order.count({
          where: {
            paymentGroupId: order.paymentGroupId,
            status: OrderStatus.PENDING_PAYMENT,
          },
        });
        if (remainingPending === 0) {
          await tx.paymentGroup.updateMany({
            where: { id: order.paymentGroupId, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.CANCELLED },
          });
        }
      }

      const pendingReservations = await tx.inventoryReservation.findMany({
        where: { referenceId: order.id, status: ReservationStatus.PENDING },
      });

      for (const reservation of pendingReservations) {
        const released = await tx.inventory.updateMany({
          where: { id: reservation.inventoryId, reservedQty: { gte: reservation.quantity } },
          data: {
            availableQty: { increment: reservation.quantity },
            reservedQty: { decrement: reservation.quantity },
          },
        });
        if (released.count === 1) {
          const updatedInv = await tx.inventory.findUnique({
            where: { id: reservation.inventoryId },
            select: { availableQty: true },
          });
          await tx.inventoryLedger.create({
            data: {
              inventoryId: reservation.inventoryId,
              changeQty: reservation.quantity,
              balanceAfter: updatedInv?.availableQty ?? 0,
              reason: 'PAYMENT_TIMEOUT_RELEASE',
              referenceId: order.id,
            },
          });
        }
        await tx.inventoryReservation.update({
          where: { id: reservation.id },
          data: { status: ReservationStatus.RELEASED },
        });
      }

      await publishNotification(
        tx,
        {
          userId: order.buyerId,
          title: 'Order cancelled due to payment timeout',
          content: `Order ${order.id} was automatically cancelled after the checkout window expired.`,
          type: NotificationType.ORDER,
          channel: NotificationChannel.IN_APP,
          targetUrl: `/buyer/orders/${order.id}`,
        },
        this.notifications,
      );

      return true;
    });
  }

  async releaseStandaloneReservation(reservationId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.inventoryReservation.updateMany({
        where: { id: reservationId, status: ReservationStatus.PENDING },
        data: { status: ReservationStatus.RELEASED },
      });
      if (claimed.count !== 1) {
        return false;
      }

      const reservation = await tx.inventoryReservation.findUnique({
        where: { id: reservationId },
        select: { id: true, inventoryId: true, quantity: true, referenceId: true },
      });
      if (!reservation) {
        return false;
      }

      const restored = await tx.inventory.updateMany({
        where: { id: reservation.inventoryId, reservedQty: { gte: reservation.quantity } },
        data: {
          availableQty: { increment: reservation.quantity },
          reservedQty: { decrement: reservation.quantity },
        },
      });

      if (restored.count === 1) {
        const updatedInv = await tx.inventory.findUnique({
          where: { id: reservation.inventoryId },
          select: { availableQty: true },
        });
        await tx.inventoryLedger.create({
          data: {
            inventoryId: reservation.inventoryId,
            changeQty: reservation.quantity,
            balanceAfter: updatedInv?.availableQty ?? 0,
            reason: 'RESERVATION_EXPIRED',
            referenceId: reservation.referenceId,
          },
        });
      }

      return true;
    });
  }
}
