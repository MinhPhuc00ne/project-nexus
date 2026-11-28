import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuctionAwardStatus,
  AuctionAwardTier,
  AuctionComplaintStatus,
  AuctionStatus,
  DisputeStatus,
  EscrowStatus,
  NotificationChannel,
  NotificationType,
  OrderCancellationActor,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  ProductStatus,
  ReservationStatus,
  Role,
} from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AuditLogService } from '../src/core/audit/audit-log.service';
import { runWithRequestTrace } from '../src/core/audit/request-trace.context';
import { DOMAIN_EVENTS } from '../src/core/events/domain-events.service';
import {
  NotificationPublisher,
  publishNotification,
  runWithNotificationBatch,
} from '../src/core/notifications/notification-publisher.service';
import type { PrismaService } from '../src/core/prisma/prisma.service';
import type { DistributedLockService } from '../src/core/redis/distributed-lock.service';
import type { PlatformSettingsService } from '../src/core/settings/platform-settings.service';
import type { CloudinaryStorageService } from '../src/core/storage/cloudinary.service';
import type { ProfileReauthService } from '../src/core/security/profile-reauth.service';
import { AdminFinanceService } from '../src/modules/admin/services/admin-finance.service';
import { AdminProductsService } from '../src/modules/admin/services/admin-products.service';
import { AdminService } from '../src/modules/admin/services/admin.service';
import { AfterSalesStoreService } from '../src/modules/after-sales/services/after-sales-store.service';
import { RefundService } from '../src/modules/after-sales/services/refund.service';
import { AuctionComplaintService } from '../src/modules/auction/services/auction-complaint.service';
import { AuctionDefaultService } from '../src/modules/auction/services/auction-default.service';
import type { StaffProvisioningService } from '../src/modules/auth/services/staff-provisioning.service';
import { CategoryService } from '../src/modules/catalog/services/category.service';
import { InventoryService } from '../src/modules/catalog/services/inventory.service';
import type { GhnLogisticsService } from '../src/modules/fulfillment/services/ghn-logistics.service';
import type { GhnShopApiService } from '../src/modules/fulfillment/services/ghn-shop-api.service';
import { SellerPickupService } from '../src/modules/fulfillment/services/seller-pickup.service';
import type { ShopShippingProfileService } from '../src/modules/fulfillment/services/shop-shipping-profile.service';
import { OrderEscrowService } from '../src/modules/orders/services/order-escrow.service';
import { OrderExpirationService } from '../src/modules/orders/services/order-expiration.service';
import { ReportModerationService } from '../src/modules/reviews/services/report-moderation.service';
import { ReviewsModerationHelper } from '../src/modules/reviews/services/reviews-moderation.helper';
import type { TreasuryService } from '../src/modules/treasury/services/treasury.service';
import type { ReputationService } from '../src/modules/users/services/reputation.service';
import { ShopsService } from '../src/modules/users/services/shops.service';
import { UsersService } from '../src/modules/users/services/users.service';
import { WithdrawalService } from '../src/modules/wallet/services/withdrawal.service';

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

    it('logs a warning instead of dropping silently when EventEmitter2 is unavailable outside a transaction', async () => {
      const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const prismaMock = {
        notification: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
            id: 'notif-silent-1',
            ...data,
          })),
        },
      } as unknown as PrismaService;

      try {
        await publishNotification(prismaMock, {
          userId: 'user-1',
          title: 'Unbound push',
          content: 'No emitter available',
          type: NotificationType.SYSTEM,
          channel: NotificationChannel.IN_APP,
        });
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('EventEmitter2 is unavailable outside a transaction'),
        );
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('emits realtime admin notifications in ShopsService and UsersService outside transactions', async () => {
      const emitted: unknown[][] = [];
      const emitter = new EventEmitter2({ wildcard: true, delimiter: '.' });
      emitter.on(DOMAIN_EVENTS.NOTIFICATIONS_CREATED, (records: unknown[]) =>
        emitted.push(records),
      );

      const prismaMock = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        user: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({
              id: 'seller-1',
              role: Role.SELLER,
              fullName: 'Seller One',
              email: 'seller@nexus.test',
              phoneNumber: '0901234567',
              sellerUpgradeRequests: [],
            })
            .mockResolvedValueOnce({
              id: 'user-2',
              role: Role.BUYER,
              fullName: 'Buyer Two',
              email: 'buyer2@nexus.test',
              phoneNumber: '0909876543',
            }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({
            id: 'seller-1',
            isShopSuspended: false,
          }),
          findMany: vi.fn().mockResolvedValue([{ id: 'admin-1' }]),
        },
        sellerUpgradeRequest: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
            id: 'req-1',
            ...data,
          })),
        },
        notification: {
          createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
        },
        $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
      } as unknown as PrismaService;

      const publisher = new NotificationPublisher(prismaMock, emitter);

      const shopsService = new ShopsService(
        prismaMock,
        {
          invalidate: vi.fn().mockResolvedValue(undefined),
          synchronize: vi.fn().mockRejectedValue(new Error('GHN offline')),
        } as unknown as SellerPickupService,
        publisher,
      );
      await shopsService.updateShopProfile('seller-1', { storeName: 'Watch Shop' });
      expect(emitted).toHaveLength(1);

      const usersService = new UsersService(
        prismaMock,
        {} as unknown as CloudinaryStorageService,
        {} as unknown as ProfileReauthService,
        {} as unknown as ReputationService,
        publisher,
      );
      await usersService.createSellerRequest('user-2', {
        storeName: 'New Watch Store',
        phone: '0909876543',
        street: '456 Nguyen Hue',
        city: 'Ho Chi Minh',
        attachmentUrl: 'https://cdn.example.com/id.png',
      });
      expect(emitted).toHaveLength(2);
    });
  });

  describe('OrderExpirationService', () => {
    it('cancels overdue non-auction non-COD PENDING_PAYMENT orders, restores inventory, and releases expired standalone reservations', async () => {
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
      const orderFindMany = vi.fn().mockResolvedValue([{ id: 'order-1' }]);

      const txMock = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'order-1' }]),
        order: {
          findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
            where.id === 'order-1'
              ? {
                  id: 'order-1',
                  buyerId: 'buyer-1',
                  status: OrderStatus.PENDING_PAYMENT,
                  isAuction: false,
                  paymentGroupId: 'pg-1',
                }
              : null,
          ),
          update: orderUpdate,
          count: vi.fn().mockResolvedValue(0),
        },
        payment: {
          updateMany: paymentUpdateMany,
          count: vi.fn().mockResolvedValue(0),
        },
        paymentGroup: { updateMany: paymentGroupUpdateMany },
        auction: { findFirst: vi.fn().mockResolvedValue(null) },
        auctionItem: { findFirst: vi.fn().mockResolvedValue(null) },
        auctionAward: { findFirst: vi.fn().mockResolvedValue(null) },
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
            status: ReservationStatus.PENDING,
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
          findMany: orderFindMany,
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

      expect(orderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: OrderStatus.PENDING_PAYMENT,
            isAuction: false,
            payments: { none: { provider: PaymentProvider.COD } },
          }),
        }),
      );
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

    it('refuses to expire auction orders or COD orders in expirePendingOrder', async () => {
      const orderUpdate = vi.fn();
      const txMock = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        order: {
          findUnique: vi
            .fn()
            .mockResolvedValueOnce({
              id: 'auction-order-1',
              buyerId: 'buyer-1',
              status: OrderStatus.PENDING_PAYMENT,
              isAuction: true,
              paymentGroupId: null,
            })
            .mockResolvedValueOnce({
              id: 'cod-order-1',
              buyerId: 'buyer-1',
              status: OrderStatus.PENDING_PAYMENT,
              isAuction: false,
              paymentGroupId: null,
            }),
          update: orderUpdate,
        },
        payment: {
          count: vi.fn().mockResolvedValue(1),
        },
      };

      const prismaMock = {
        $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
      } as unknown as PrismaService;

      const service = new OrderExpirationService(
        prismaMock,
        {} as unknown as DistributedLockService,
        { get: vi.fn() } as unknown as PlatformSettingsService,
      );

      await expect(service.expirePendingOrder('auction-order-1')).resolves.toBe(false);
      await expect(service.expirePendingOrder('cod-order-1')).resolves.toBe(false);
      expect(orderUpdate).not.toHaveBeenCalled();
    });

    it('refuses to release standalone reservations tied to active orders, auctions, lots, or awards', async () => {
      const updateMany = vi.fn();
      const createBaseTx = () => ({
        inventoryReservation: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'res-guard',
            inventoryId: 'inv-1',
            quantity: 1,
            referenceId: 'ref-live',
            status: ReservationStatus.PENDING,
          }),
          updateMany,
        },
        order: { findUnique: vi.fn().mockResolvedValue(null) },
        auction: { findFirst: vi.fn().mockResolvedValue(null) },
        auctionItem: { findFirst: vi.fn().mockResolvedValue(null) },
        auctionAward: { findFirst: vi.fn().mockResolvedValue(null) },
      });

      const txCases = [
        () => {
          const tx = createBaseTx();
          tx.order.findUnique.mockResolvedValue({ status: OrderStatus.PAID });
          return tx;
        },
        () => {
          const tx = createBaseTx();
          tx.auction.findFirst.mockResolvedValue({ id: 'ref-live' });
          return tx;
        },
        () => {
          const tx = createBaseTx();
          tx.auctionItem.findFirst.mockResolvedValue({ id: 'ref-live' });
          return tx;
        },
        () => {
          const tx = createBaseTx();
          tx.auctionAward.findFirst.mockResolvedValue({ id: 'award-1' });
          return tx;
        },
      ];

      for (const buildTx of txCases) {
        const tx = buildTx();
        const prismaMock = {
          $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
        } as unknown as PrismaService;
        const service = new OrderExpirationService(
          prismaMock,
          {} as unknown as DistributedLockService,
          { get: vi.fn() } as unknown as PlatformSettingsService,
        );
        await expect(service.releaseStandaloneReservation('res-guard')).resolves.toBe(false);
      }

      expect(updateMany).not.toHaveBeenCalled();
    });

    it('cursors past 50+ protected COD/active reservations in sweep() and releases newer expired orphan reservations', async () => {
      const baseTime = new Date('2026-11-27T11:00:00Z');
      const now = new Date('2026-11-27T12:00:00Z');

      const rows: Array<{
        id: string;
        inventoryId: string;
        quantity: number;
        referenceId: string;
        status: ReservationStatus;
        expiresAt: Date;
      }> = Array.from({ length: 55 }, (_, i) => ({
        id: `res-cod-${String(i).padStart(3, '0')}`,
        inventoryId: 'inv-cod',
        quantity: 1,
        referenceId: `order-cod-${i}`,
        status: ReservationStatus.PENDING,
        expiresAt: new Date(baseTime.getTime() + i * 1000),
      }));
      rows.push({
        id: 'res-orphan-001',
        inventoryId: 'inv-orphan',
        quantity: 5,
        referenceId: 'cart-orphan',
        status: ReservationStatus.PENDING,
        expiresAt: new Date(baseTime.getTime() + 60_000),
      });

      const inventoryLedgerCreate = vi.fn().mockResolvedValue({});
      const inventoryUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
      const reservationFindMany = vi.fn(
        async (args: {
          where: {
            status: ReservationStatus;
            expiresAt: { lte: Date };
            OR?: Array<{ expiresAt: { gt?: Date } | Date; id?: { gt: string } }>;
          };
          take: number;
        }) => {
          const filtered = rows
            .filter((r) => {
              if (r.status !== args.where.status || r.expiresAt > args.where.expiresAt.lte) {
                return false;
              }
              if (args.where.OR) {
                return args.where.OR.some((cond) => {
                  if (
                    typeof cond.expiresAt === 'object' &&
                    'gt' in cond.expiresAt &&
                    cond.expiresAt.gt
                  ) {
                    return r.expiresAt > cond.expiresAt.gt;
                  }
                  if (cond.expiresAt instanceof Date && cond.id?.gt) {
                    return r.expiresAt.getTime() === cond.expiresAt.getTime() && r.id > cond.id.gt;
                  }
                  return false;
                });
              }
              return true;
            })
            .sort(
              (a, b) => a.expiresAt.getTime() - b.expiresAt.getTime() || a.id.localeCompare(b.id),
            )
            .slice(0, args.take)
            .map((r) => ({ id: r.id, expiresAt: r.expiresAt }));
          return filtered;
        },
      );

      const txMock = {
        inventoryReservation: {
          findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
            const found = rows.find((r) => r.id === where.id);
            return found ? { ...found } : null;
          }),
          updateMany: vi.fn(
            async ({
              where,
              data,
            }: {
              where: { id: string; status: ReservationStatus };
              data: { status: ReservationStatus };
            }) => {
              const found = rows.find((r) => r.id === where.id && r.status === where.status);
              if (!found) return { count: 0 };
              found.status = data.status;
              return { count: 1 };
            },
          ),
        },
        order: {
          findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
            where.id.startsWith('order-cod-') ? { status: OrderStatus.PENDING_PAYMENT } : null,
          ),
        },
        auction: { findFirst: vi.fn().mockResolvedValue(null) },
        auctionItem: { findFirst: vi.fn().mockResolvedValue(null) },
        auctionAward: { findFirst: vi.fn().mockResolvedValue(null) },
        inventory: {
          updateMany: inventoryUpdateMany,
          findUnique: vi.fn().mockResolvedValue({ availableQty: 5 }),
        },
        inventoryLedger: { create: inventoryLedgerCreate },
      };

      const prismaMock = {
        order: { findMany: vi.fn().mockResolvedValue([]) },
        inventoryReservation: { findMany: reservationFindMany },
        $transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
      } as unknown as PrismaService;

      const service = new OrderExpirationService(
        prismaMock,
        {} as unknown as DistributedLockService,
        { get: vi.fn().mockResolvedValue(15) } as unknown as PlatformSettingsService,
      );

      const result = await service.sweep(now);

      expect(reservationFindMany).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ expiredOrders: 0, releasedReservations: 1 });
      expect(rows.find((r) => r.id === 'res-orphan-001')?.status).toBe(ReservationStatus.RELEASED);
      expect(
        rows
          .filter((r) => r.id.startsWith('res-cod-'))
          .every((r) => r.status === ReservationStatus.PENDING),
      ).toBe(true);
      expect(inventoryUpdateMany).toHaveBeenCalledTimes(1);
      expect(inventoryLedgerCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('InventoryService timeout setting', () => {
    it('uses PlatformSettingsService inventoryReservationTimeout and falls back to 30 minutes', async () => {
      const reservationCreate = vi.fn().mockResolvedValue({});
      const txMock = {
        inventory: {
          findFirst: vi.fn().mockResolvedValue({ id: 'inv-1', availableQty: 5 }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'inv-1', availableQty: 4 }),
        },
        inventoryReservation: { create: reservationCreate },
        inventoryLedger: { create: vi.fn().mockResolvedValue({}) },
      };

      const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
      try {
        const configured = new InventoryService(
          {} as unknown as PrismaService,
          {
            get: vi.fn().mockResolvedValue(45),
          } as unknown as PlatformSettingsService,
        );

        await configured.reserveStock(txMock as never, 'prod-1', 1, 'order-1');
        expect(reservationCreate).toHaveBeenLastCalledWith({
          data: expect.objectContaining({
            expiresAt: new Date(1_000_000 + 45 * 60_000),
          }),
        });

        const fallback = new InventoryService({} as unknown as PrismaService);
        await fallback.reserveStock(txMock as never, 'prod-1', 1, 'order-2');
        expect(reservationCreate).toHaveBeenLastCalledWith({
          data: expect.objectContaining({
            expiresAt: new Date(1_000_000 + 30 * 60_000),
          }),
        });
      } finally {
        nowSpy.mockRestore();
      }
    });
  });

  describe('AuditLogService & Admin/Moderation/Dispute Mutation Coverage', () => {
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

    it('records audit logs across AdminFinance, AdminProducts, Category, Reviews, Pickup, Staff, Escrow, AfterSales, Reports, and Auctions', async () => {
      const eventLogCreate = vi.fn().mockResolvedValue({ id: 'audit-log-1' });
      const audit = new AuditLogService({
        eventLog: { create: eventLogCreate },
      } as unknown as PrismaService);

      await runWithRequestTrace('trace-m9-mutations', async () => {
        // 1. AdminFinanceService.depositToAdminWallet
        const financeTx = {
          wallet: {
            update: vi.fn().mockResolvedValue({ id: 'w-1', balance: 500, currency: 'VND' }),
          },
          walletTransaction: {
            create: vi.fn().mockResolvedValue({
              id: 'wtx-1',
              amount: 100,
              type: 'DEPOSIT',
              status: 'SUCCESS',
              description: 'Top up',
              createdAt: new Date(),
            }),
          },
          eventLog: { create: eventLogCreate },
        };
        const finance = new AdminFinanceService(
          {
            wallet: { findUnique: vi.fn().mockResolvedValue({ id: 'w-1' }) },
            $transaction: vi.fn(async (fn: (tx: typeof financeTx) => Promise<unknown>) =>
              fn(financeTx),
            ),
          } as unknown as PrismaService,
          {} as unknown as TreasuryService,
          audit,
        );
        await finance.depositToAdminWallet('admin-1', { amount: 100, description: 'Top up' });

        // 2. AdminProductsService mutations
        const prodTx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          user: { findUnique: vi.fn().mockResolvedValue({ isShopSuspended: false }) },
          product: {
            update: vi.fn().mockResolvedValue({
              id: 'prod-1',
              title: 'Watch',
              status: ProductStatus.INACTIVE,
              categoryId: 'cat-2',
              category: { id: 'cat-2', name: 'Luxury', slug: 'luxury', level: 1 },
              trendingExcluded: true,
              trendingExcludedAt: new Date(),
            }),
            delete: vi.fn().mockResolvedValue({}),
          },
          productImage: { deleteMany: vi.fn().mockResolvedValue({}) },
          cartItem: { deleteMany: vi.fn().mockResolvedValue({}) },
          inventoryReservation: { deleteMany: vi.fn().mockResolvedValue({}) },
          inventory: {
            findMany: vi.fn().mockResolvedValue([]),
            deleteMany: vi.fn().mockResolvedValue({}),
          },
          notification: { create: vi.fn().mockResolvedValue({ id: 'n-1' }) },
          eventLog: { create: eventLogCreate },
        };
        const adminProducts = new AdminProductsService(
          {
            product: {
              findUnique: vi
                .fn()
                .mockResolvedValueOnce({
                  id: 'prod-1',
                  title: 'Watch',
                  sellerId: 'seller-1',
                  status: ProductStatus.ACTIVE,
                  seller: { isShopSuspended: false },
                })
                .mockResolvedValueOnce({
                  id: 'prod-1',
                  title: 'Watch',
                  sellerId: 'seller-1',
                  categoryId: 'cat-1',
                  category: { id: 'cat-1', name: 'Classic', slug: 'classic' },
                })
                .mockResolvedValueOnce({
                  id: 'prod-1',
                  title: 'Watch',
                  sellerId: 'seller-1',
                  orderItems: [{ id: 'oi-1' }],
                })
                .mockResolvedValueOnce({
                  id: 'prod-2',
                  title: 'Watch 2',
                  sellerId: 'seller-1',
                  orderItems: [],
                })
                .mockResolvedValueOnce({
                  id: 'prod-1',
                  title: 'Watch',
                  sellerId: 'seller-1',
                  trendingExcluded: false,
                }),
              update: prodTx.product.update,
            },
            category: {
              findUnique: vi.fn().mockResolvedValue({
                id: 'cat-2',
                name: 'Luxury',
                slug: 'luxury',
                level: 1,
              }),
            },
            $transaction: vi.fn(async (fn: (tx: typeof prodTx) => Promise<unknown>) => fn(prodTx)),
          } as unknown as PrismaService,
          undefined,
          undefined,
          audit,
        );
        await adminProducts.updateProductStatus('prod-1', 'admin-1', {
          status: ProductStatus.INACTIVE,
          reason: 'Policy check',
        });
        await adminProducts.updateProductCategory('prod-1', 'admin-1', {
          categoryId: 'cat-2',
        });
        await adminProducts.deleteProduct('prod-1', 'admin-1');
        await adminProducts.deleteProduct('prod-2', 'admin-1');
        await adminProducts.removeProductFromTrending('prod-1', 'admin-1', { reason: 'Review' });

        // 3. CategoryService mutations
        const categoryService = new CategoryService(
          {
            category: {
              findFirst: vi.fn().mockResolvedValue(null),
              findUnique: vi.fn().mockResolvedValue({
                id: 'cat-1',
                name: 'Watches',
                slug: 'watches',
                level: 1,
                parentId: null,
                children: [],
                products: [],
              }),
              create: vi.fn().mockResolvedValue({
                id: 'cat-1',
                name: 'Watches',
                slug: 'watches',
                level: 1,
                parentId: null,
              }),
              update: vi.fn().mockResolvedValue({
                id: 'cat-1',
                name: 'Luxury Watches',
                slug: 'luxury-watches',
                level: 1,
                parentId: null,
              }),
              delete: vi.fn().mockResolvedValue({}),
            },
          } as unknown as PrismaService,
          audit,
        );
        await categoryService.createCategory({ name: 'Watches' }, 'admin-1');
        await categoryService.updateCategory('cat-1', { name: 'Luxury Watches' }, 'admin-1');
        await categoryService.deleteCategory('cat-1', 'admin-1');

        // 4. ReviewsModerationHelper mutations
        const reviewTx = {
          productReview: {
            findUnique: vi
              .fn()
              .mockResolvedValueOnce({
                id: 'rev-1',
                reviewerId: 'buyer-1',
                productId: 'prod-1',
                rating: 5,
                reviewer: { reputationScore: 100 },
                product: { title: 'Watch', reviewCount: 1, ratingSum: 5 },
              })
              .mockResolvedValueOnce({
                id: 'rev-1',
                sellerReply: 'Thanks',
                product: {
                  id: 'prod-1',
                  title: 'Watch',
                  sellerId: 'seller-1',
                  seller: { reputationScore: 100 },
                },
              })
              .mockResolvedValueOnce({
                id: 'rev-1',
                productId: 'prod-1',
                rating: 5,
                isHidden: false,
                reviewerId: 'buyer-1',
                reviewer: { reputationScore: 100 },
                product: { title: 'Watch' },
              }),
            delete: vi.fn().mockResolvedValue({}),
            update: vi.fn().mockResolvedValue({}),
          },
          product: {
            findUnique: vi.fn().mockResolvedValue({ ratingSum: 5, reviewCount: 1 }),
            update: vi.fn().mockResolvedValue({}),
          },
          eventLog: { create: eventLogCreate },
        };
        const reviewsHelper = new ReviewsModerationHelper(
          {
            $transaction: vi.fn(async (fn: (tx: typeof reviewTx) => Promise<unknown>) =>
              fn(reviewTx),
            ),
          } as unknown as PrismaService,
          { adjustScore: vi.fn().mockResolvedValue(undefined) } as unknown as ReputationService,
          undefined,
          audit,
        );
        await reviewsHelper.adminDeleteReview(
          'rev-1',
          'product',
          { reason: 'Spam', pointsToDeduct: 5 },
          Role.ADMIN,
          'admin-1',
        );
        await reviewsHelper.adminRemoveSellerReply(
          'rev-1',
          { reason: 'Abusive reply', pointsToDeduct: 5 },
          Role.ADMIN,
          'admin-1',
        );
        await reviewsHelper.adminModerateReviewVisibility(
          'admin-1',
          'product',
          'rev-1',
          { isHidden: true, reason: 'Off-topic', pointsToDeduct: 0 },
          Role.ADMIN,
        );

        // 5. SellerPickupService.verify
        const accountRow = {
          id: 'pickup-1',
          sellerId: 'seller-1',
          environment: 'SANDBOX',
          status: 'PENDING',
          version: 1,
          districtId: 1442,
          wardCode: '20101',
          ghnShopId: 9001,
          ghnClientId: 1,
          carrierName: 'Shop',
          carrierPhone: '0901234567',
          carrierAddress: '123 Le Loi',
          updatedAt: new Date(),
        };
        const pickupTx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          sellerGhnAccount: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: vi.fn().mockResolvedValue({ ...accountRow, status: 'VERIFIED' }),
          },
          eventLog: { create: eventLogCreate },
        };
        const pickupService = new SellerPickupService(
          {
            sellerGhnAccount: { findUnique: vi.fn().mockResolvedValue(accountRow) },
            $transaction: vi.fn(async (fn: (tx: typeof pickupTx) => Promise<unknown>) =>
              fn(pickupTx),
            ),
          } as unknown as PrismaService,
          {
            get: vi.fn().mockReturnValue('https://dev-online-gateway.ghn.vn/shiip/public-api/v2'),
          } as unknown as ConfigService,
          {
            resolveDistrictAndWard: vi.fn().mockResolvedValue({
              districtId: 1442,
              wardCode: '20101',
            }),
          } as unknown as GhnLogisticsService,
          {
            find: vi.fn().mockResolvedValue({
              id: 9001,
              clientId: 1,
              name: 'Shop',
              active: true,
              districtId: 1442,
              wardCode: '20101',
              phone: '0901234567',
              address: '123 Le Loi, Ben Nghe',
            }),
          } as unknown as GhnShopApiService,
          {
            read: vi.fn().mockResolvedValue({
              name: 'Watch Shop',
              phone: '0901234567',
              street: '123 Le Loi',
              ward: 'Ben Nghe',
              district: 'District 1',
              city: 'Ho Chi Minh',
            }),
          } as unknown as ShopShippingProfileService,
          audit,
        );
        await pickupService.verify('pickup-1', 9001, 'admin-1');

        // 6. AdminService.createStaff & inviteStaff
        const adminService = new AdminService(
          {} as unknown as PrismaService,
          {
            invite: vi.fn().mockResolvedValue({
              staff: {
                id: 'staff-1',
                platformEmail: 'staff@nexus.local',
                personalEmail: 'staff@personal.test',
              },
            }),
          } as unknown as StaffProvisioningService,
          undefined,
          audit,
        );
        await adminService.createStaff(
          { fullName: 'Staff One', email: 'staff@personal.test', department: 'Ops' },
          'admin-1',
        );
        await adminService.inviteStaff(
          { fullName: 'Staff Two', email: 'staff2@personal.test' },
          'admin-1',
        );

        // 7. OrderEscrowService.resolve
        const escrowTx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          order: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'order-1',
              buyerId: 'buyer-1',
              sellerId: 'seller-1',
              dispute: { id: 'disp-1', status: DisputeStatus.OPEN },
              escrowRecord: {
                status: EscrowStatus.DISPUTED,
                sellerPayout: 900,
                platformFee: 100,
              },
              shipment: null,
              afterSales: null,
              refunds: [],
            }),
            update: vi.fn().mockResolvedValue({}),
          },
          dispute: { update: vi.fn().mockResolvedValue({}) },
          escrowRecord: {
            update: vi.fn().mockResolvedValue({}),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          user: { update: vi.fn().mockResolvedValue({}) },
          wallet: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUnique: vi.fn().mockResolvedValue({ id: 'w-seller' }),
            upsert: vi.fn().mockResolvedValue({ id: 'w-seller' }),
            update: vi.fn().mockResolvedValue({}),
          },
          walletTransaction: { create: vi.fn().mockResolvedValue({}) },
          eventLog: { create: eventLogCreate },
        };
        const escrowService = new OrderEscrowService(
          {
            $transaction: vi.fn(async (fn: (tx: typeof escrowTx) => Promise<unknown>) =>
              fn(escrowTx),
            ),
          } as unknown as PrismaService,
          { get: vi.fn() } as unknown as PlatformSettingsService,
          {
            getOrCreateEscrowWallet: vi.fn().mockResolvedValue({ id: 'w-escrow' }),
            getOrCreatePlatformRevenueWallet: vi.fn().mockResolvedValue({ id: 'w-rev' }),
            getOrCreatePrimaryAdminWallet: vi.fn().mockResolvedValue({ id: 'w-admin' }),
          } as unknown as TreasuryService,
          undefined,
          undefined,
          undefined,
          audit,
        );
        await escrowService.resolve(
          'order-1',
          { id: 'admin-1', role: Role.ADMIN },
          'SELLER',
          'Tracking confirmed delivery',
        );

        // 8. AfterSalesStoreService.audit
        const afterSalesStore = new AfterSalesStoreService(
          {} as unknown as PrismaService,
          {} as unknown as ReputationService,
          undefined,
          audit,
        );
        await afterSalesStore.audit(
          { eventLog: { create: eventLogCreate } } as never,
          { id: 'order-2', buyerId: 'buyer-1', sellerId: 'seller-1' } as never,
          { id: 'admin-1', role: Role.ADMIN },
          'cancellation-reviewed',
          { approved: true },
        );

        // 9. ReportModerationService.review
        const reportTx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          shopViolation: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'rep-1',
              status: 'PENDING',
              shopId: 'seller-1',
              productId: null,
              reporterId: 'buyer-1',
              penaltyAppliedAt: null,
            }),
            update: vi.fn().mockResolvedValue({ id: 'rep-1', status: 'DISMISSED' }),
          },
          eventLog: { create: eventLogCreate },
        };
        const reportModeration = new ReportModerationService(
          {
            $transaction: vi.fn(async (fn: (tx: typeof reportTx) => Promise<unknown>) =>
              fn(reportTx),
            ),
          } as unknown as PrismaService,
          {} as unknown as ReputationService,
          undefined,
          audit,
        );
        await reportModeration.review(
          'rep-1',
          { id: 'admin-1', role: Role.ADMIN },
          { status: 'DISMISSED', reason: 'Insufficient evidence' },
        );

        // 10. AuctionComplaintService.resolveComplaint
        const complaintTx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          auctionComplaint: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'comp-1',
              auctionId: 'auc-1',
              auctionItemId: 'lot-1',
              reporterId: 'buyer-1',
              status: AuctionComplaintStatus.OPEN,
              auction: { id: 'auc-1', title: 'Vintage Watch' },
            }),
            update: vi.fn().mockResolvedValue({
              id: 'comp-1',
              status: AuctionComplaintStatus.ACCEPTED,
              adminNote: 'Approved',
            }),
          },
          eventLog: { create: eventLogCreate },
        };
        const complaintService = new AuctionComplaintService(
          {
            $transaction: vi.fn(async (fn: (tx: typeof complaintTx) => Promise<unknown>) =>
              fn(complaintTx),
            ),
          } as unknown as PrismaService,
          undefined,
          audit,
        );
        await complaintService.resolveComplaint('comp-1', 'admin-1', {
          status: 'ACCEPTED' as never,
          adminNote: 'Approved',
        });

        // 11. AuctionDefaultService.withdrawSecondChanceByAdmin
        const defaultTx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          auctionAward: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'award-2',
              auctionId: 'auc-1',
              auctionItemId: 'lot-1',
              buyerId: 'buyer-2',
              tier: AuctionAwardTier.SECOND_CHANCE,
              status: AuctionAwardStatus.AWAITING_ACCEPTANCE,
              depositAmount: 0,
              orderId: null,
              auction: { id: 'auc-1', title: 'Vintage Watch', sellerId: 'seller-1' },
              auctionItem: { id: 'lot-1', title: 'Lot 1', lotNumber: 1, sellerId: 'seller-1' },
              bid: { bidderId: 'buyer-2' },
            }),
            update: vi.fn().mockResolvedValue({
              id: 'award-2',
              auctionId: 'auc-1',
              status: AuctionAwardStatus.BUYER_WITHDRAWN,
            }),
            count: vi.fn().mockResolvedValue(0),
          },
          auctionItem: {
            update: vi.fn().mockResolvedValue({}),
            findMany: vi.fn().mockResolvedValue([{ lotStatus: AuctionStatus.FAILED }]),
          },
          auction: {
            findUnique: vi.fn().mockResolvedValue({ id: 'auc-1', status: AuctionStatus.ENDED }),
            update: vi.fn().mockResolvedValue({}),
          },
          eventLog: { create: eventLogCreate },
        };
        const defaultService = new AuctionDefaultService(
          {
            $transaction: vi.fn(async (fn: (tx: typeof defaultTx) => Promise<unknown>) =>
              fn(defaultTx),
            ),
          } as unknown as PrismaService,
          {} as unknown as ReputationService,
          {} as unknown as PlatformSettingsService,
          {} as unknown as TreasuryService,
          undefined,
          undefined,
          audit,
        );
        await defaultService.withdrawSecondChanceByAdmin('award-2', 'admin-1', 'Buyer withdrew');
      });

      const recordedEvents = eventLogCreate.mock.calls.map(
        (call) => (call[0] as { data: { eventName: string; traceId: string } }).data,
      );
      expect(recordedEvents.every((ev) => ev.traceId === 'trace-m9-mutations')).toBe(true);
      expect(recordedEvents.map((ev) => ev.eventName)).toEqual(
        expect.arrayContaining([
          'admin.wallet.deposited',
          'admin.product.status_updated',
          'admin.product.category_updated',
          'admin.product.archived',
          'admin.product.deleted',
          'admin.product.trending_removed',
          'admin.category.created',
          'admin.category.updated',
          'admin.category.deleted',
          'admin.review.deleted',
          'admin.review.seller_reply_removed',
          'admin.review.visibility_updated',
          'admin.pickup_point.verified',
          'admin.staff.created',
          'admin.staff.invited',
          'order.dispute.resolved',
          'order.cancellation-reviewed',
          'ReportReviewed',
          'admin.auction_complaint.resolved',
          'admin.auction_award.second_chance_withdrawn',
        ]),
      );
    });

    it('records audit logs directly in WithdrawalService and RefundService inside transactions', async () => {
      const eventLogCreate = vi.fn().mockResolvedValue({ id: 'audit-wr-1' });
      const audit = new AuditLogService({
        eventLog: { create: eventLogCreate },
      } as unknown as PrismaService);

      await runWithRequestTrace('trace-m9-withdrawal-refund', async () => {
        const withdrawalTx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          withdrawalRequest: {
            count: vi.fn().mockResolvedValue(0),
            create: vi.fn().mockResolvedValue({
              id: 'wd-req-1',
              amount: 100_000,
              bankName: 'Vietcombank',
              accountNumber: '0123456789',
              accountHolderName: 'NGUYEN VAN A',
              status: 'PENDING',
              createdAt: new Date(),
            }),
          },
          wallet: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: 'w-buyer-1',
              balance: 400_000,
              lockedBalance: 100_000,
              currency: 'VND',
            }),
          },
          walletTransaction: {
            create: vi.fn().mockResolvedValue({ id: 'wtx-wd-1' }),
          },
          notification: {
            create: vi.fn().mockResolvedValue({ id: 'n-wd-1' }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          user: {
            findMany: vi.fn().mockResolvedValue([]),
          },
          eventLog: { create: eventLogCreate },
        };

        const withdrawalService = new WithdrawalService(
          {
            user: {
              findUnique: vi.fn().mockResolvedValue({
                id: 'buyer-1',
                role: Role.BUYER,
                fullName: 'Buyer One',
                isShopSuspended: false,
                suspensionReason: null,
                bankName: 'Vietcombank',
                accountNumber: '0123456789',
                accountHolderName: 'NGUYEN VAN A',
                wallet: { id: 'w-buyer-1', balance: 500_000, lockedBalance: 0, currency: 'VND' },
                sellerUpgradeRequests: [],
              }),
            },
            withdrawalRequest: { count: vi.fn().mockResolvedValue(0) },
            $transaction: vi.fn(async (fn: (tx: typeof withdrawalTx) => Promise<unknown>) =>
              fn(withdrawalTx),
            ),
          } as unknown as PrismaService,
          undefined,
          audit,
        );
        await withdrawalService.createWithdrawal('buyer-1', { amount: 100_000 });

        const refundRow = {
          id: 'ref-1',
          orderId: 'order-ref-1',
          paymentId: 'pay-1',
          amount: new Prisma.Decimal(150_000),
          adminWalletId: 'w-escrow',
          transactionId: 'wtx-ref-1',
          destination: 'ORIGINAL',
          status: 'PENDING',
        };
        const lockedOrder = {
          id: 'order-ref-1',
          buyerId: 'buyer-1',
          sellerId: 'seller-1',
          escrowRecord: {
            status: EscrowStatus.DISPUTED,
            totalAmount: new Prisma.Decimal(150_000),
            sellerPayout: new Prisma.Decimal(135_000),
          },
        };
        const refundTx = {
          $queryRaw: vi.fn().mockResolvedValue([]),
          order: {
            findUnique: vi.fn().mockResolvedValue(lockedOrder),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          payment: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'pay-1',
                amount: new Prisma.Decimal(150_000),
                provider: PaymentProvider.PAYOS,
              },
            ]),
          },
          wallet: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            upsert: vi.fn().mockResolvedValue({ id: 'w-buyer-1' }),
            update: vi.fn().mockResolvedValue({}),
          },
          walletTransaction: {
            create: vi.fn().mockResolvedValue({ id: 'wtx-ref-1' }),
            update: vi.fn().mockResolvedValue({}),
          },
          orderRefund: {
            findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([refundRow]),
            findUnique: vi.fn().mockResolvedValue(null),
            findUniqueOrThrow: vi.fn().mockResolvedValue(refundRow),
            create: vi.fn().mockResolvedValue(refundRow),
            update: vi.fn().mockResolvedValue({ ...refundRow, status: 'SUCCESS' }),
          },
          escrowRecord: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          afterSalesRequest: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
          notification: {
            create: vi.fn().mockResolvedValue({ id: 'n-ref-1' }),
            createMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          user: { findMany: vi.fn().mockResolvedValue([]) },
          eventLog: { create: eventLogCreate },
        };

        const store = new AfterSalesStoreService(
          {} as unknown as PrismaService,
          {} as unknown as ReputationService,
          undefined,
          audit,
        );
        const refundService = new RefundService(
          {
            orderRefund: { findUniqueOrThrow: vi.fn().mockResolvedValue(refundRow) },
            $transaction: vi.fn(async (fn: (tx: typeof refundTx) => Promise<unknown>) =>
              fn(refundTx),
            ),
          } as unknown as PrismaService,
          {
            getOrCreateEscrowWallet: vi.fn().mockResolvedValue({ id: 'w-escrow' }),
          } as unknown as TreasuryService,
          store,
          undefined,
          audit,
        );

        await refundService.issue(refundTx as never, lockedOrder as never, false);
        await refundService.complete('ref-1', { id: 'admin-1', role: Role.ADMIN }, 'PAYOS-REF-99');
      });

      const recorded = eventLogCreate.mock.calls.map(
        (call) => (call[0] as { data: { eventName: string; traceId: string } }).data,
      );
      expect(recorded.every((ev) => ev.traceId === 'trace-m9-withdrawal-refund')).toBe(true);
      expect(recorded.map((ev) => ev.eventName)).toEqual(
        expect.arrayContaining([
          'wallet.withdrawal.requested',
          'order.refund.issued',
          'order.refund.completed',
        ]),
      );
    });
  });
});
