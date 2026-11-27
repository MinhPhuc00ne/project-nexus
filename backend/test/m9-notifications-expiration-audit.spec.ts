import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationChannel,
  NotificationType,
  OrderCancellationActor,
  OrderStatus,
  PaymentStatus,
  ReservationStatus,
} from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AuditLogService } from '../src/core/audit/audit-log.service';
import { runWithRequestTrace } from '../src/core/audit/request-trace.context';
import { DOMAIN_EVENTS } from '../src/core/events/domain-events.service';
import {
  NotificationPublisher,
  runWithNotificationBatch,
} from '../src/core/notifications/notification-publisher.service';
import type { PrismaService } from '../src/core/prisma/prisma.service';
import type { DistributedLockService } from '../src/core/redis/distributed-lock.service';
import type { PlatformSettingsService } from '../src/core/settings/platform-settings.service';
import { OrderExpirationService } from '../src/modules/orders/services/order-expiration.service';

describe('M9 NotificationPublisher, OrderExpirationService & AuditLogService', () => {
  describe('NotificationPublisher & runWithNotificationBatch', () => {
    it('publishes immediately outside transactions, buffers inside transactions, and discards on rollback', async () => {
      const emitted: unknown[][] = [];
      const emitter = new EventEmitter2({ wildcard: true, delimiter: '.' });
      emitter.on(DOMAIN_EVENTS.NOTIFICATIONS_CREATED, (records: unknown[]) =>
        emitted.push(records),
      );

      const prismaMock = {
        notification: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
            id: 'notif-1',
            ...data,
          })),
          createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
        },
      } as unknown as PrismaService;

      const publisher = new NotificationPublisher(prismaMock, emitter);

      await publisher.create({
        userId: 'user-1',
        title: 'Direct notification',
        content: 'Immediate push',
        type: NotificationType.SYSTEM,
        channel: NotificationChannel.IN_APP,
      });
      expect(emitted).toHaveLength(1);

      await runWithNotificationBatch(emitter, async () => {
        await publisher.createMany([
          {
            userId: 'user-2',
            title: 'Tx notification',
            content: 'After commit',
            type: NotificationType.ORDER,
            channel: NotificationChannel.IN_APP,
          },
        ]);
        expect(emitted).toHaveLength(1);
      });
      expect(emitted).toHaveLength(2);

      await expect(
        runWithNotificationBatch(emitter, async () => {
          await publisher.create({
            userId: 'user-3',
            title: 'Rolled back',
            content: 'Must never emit',
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          });
          throw new Error('simulated rollback');
        }),
      ).rejects.toThrow('simulated rollback');

      expect(emitted).toHaveLength(2);
    });
  });

  describe('OrderExpirationService', () => {
    it('cancels overdue PENDING_PAYMENT orders, restores inventory, and releases expired standalone reservations', async () => {
      const orderUpdate = vi.fn().mockResolvedValue({});
      const paymentUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const paymentGroupUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const inventoryUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const inventoryLedgerCreate = vi.fn().mockResolvedValue({});
      const reservationUpdate = vi.fn().mockResolvedValue({});
      const reservationUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const notificationCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'notif-exp-1',
        ...data,
      }));

      const txMock = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
        order: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'order-1',
            buyerId: 'buyer-1',
            status: OrderStatus.PENDING_PAYMENT,
            paymentGroupId: 'pg-1',
          }),
          update: orderUpdate,
          count: vi.fn().mockResolvedValue(0),
        },
        payment: { updateMany: paymentUpdateMany },
        paymentGroup: { updateMany: paymentGroupUpdateMany },
        inventoryReservation: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { id: 'res-1', inventoryId: 'inv-1', quantity: 2, referenceId: 'order-1' },
            ]),
          update: reservationUpdate,
          updateMany: reservationUpdateMany,
          findUnique: vi.fn().mockResolvedValue({
            id: 'res-standalone',
            inventoryId: 'inv-2',
            quantity: 3,
            referenceId: 'cart-temp',
          }),
        },
        inventory: {
          updateMany: inventoryUpdateMany,
          findUnique: vi.fn().mockResolvedValue({ availableQty: 10 }),
        },
        inventoryLedger: { create: inventoryLedgerCreate },
        notification: { create: notificationCreate },
      };

      const prismaMock = {
        order: {
          findMany: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
        },
        inventoryReservation: {
          findMany: vi.fn().mockResolvedValue([{ id: 'res-standalone' }]),
        },
        $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
      } as unknown as PrismaService;

      const settingsMock = {
        get: vi.fn().mockResolvedValue(15),
      } as unknown as PlatformSettingsService;

      const lockMock = {
        runExclusively: vi.fn(),
      } as unknown as DistributedLockService;

      const service = new OrderExpirationService(prismaMock, lockMock, settingsMock);
      const result = await service.sweep(new Date('2026-11-27T12:00:00Z'));

      expect(result).toEqual({ expiredOrders: 1, releasedReservations: 1 });
      expect(orderUpdate).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: {
          status: OrderStatus.CANCELLED,
          cancellationActor: OrderCancellationActor.SYSTEM,
        },
      });
      expect(paymentUpdateMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1', status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.CANCELLED },
      });
      expect(paymentGroupUpdateMany).toHaveBeenCalled();
      expect(inventoryUpdateMany).toHaveBeenCalledTimes(2);
      expect(inventoryLedgerCreate).toHaveBeenCalledTimes(2);
      expect(reservationUpdate).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: ReservationStatus.RELEASED },
      });
      expect(notificationCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('AuditLogService', () => {
    it('records operatorId and automatically captures active traceId from requestTraceContext', async () => {
      const eventLogCreate = vi.fn().mockResolvedValue({ id: 'log-1' });
      const prismaMock = {
        eventLog: { create: eventLogCreate },
      } as unknown as PrismaService;

      const audit = new AuditLogService(prismaMock);

      await runWithRequestTrace('trace-m9-audit-001', async () => {
        await audit.record({
          eventName: 'admin.withdrawal.reviewed',
          operatorId: 'admin-1',
          payload: { withdrawalId: 'wd-1', status: 'COMPLETED' },
        });
      });

      expect(eventLogCreate).toHaveBeenCalledWith({
        data: {
          eventName: 'admin.withdrawal.reviewed',
          operatorId: 'admin-1',
          traceId: 'trace-m9-audit-001',
          payload: { withdrawalId: 'wd-1', status: 'COMPLETED' },
        },
      });
    });
  });
});
