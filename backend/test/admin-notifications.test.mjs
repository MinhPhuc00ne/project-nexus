import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { notifyAllAdmins } = load('../src/core/notifications/admin-notification.util.ts');
const { NotificationsService } = load(
  '../src/modules/notifications/services/notifications.service.ts',
);
const { ReportsService } = load('../src/modules/commerce/services/reports.service.ts');

test('notifyAllAdmins fans out in-app notification with targetUrl to all Admin accounts', async () => {
  const createdBatches = [];
  const prismaMock = {
    user: {
      findMany: mock.fn(async () => [{ id: 'admin-1' }, { id: 'admin-2' }]),
    },
    notification: {
      createMany: mock.fn(async (input) => {
        createdBatches.push(input.data);
        return { count: input.data.length };
      }),
    },
  };

  const count = await notifyAllAdmins(prismaMock, {
    title: 'Yêu cầu nâng cấp Seller mới',
    content: 'Gian hàng A vừa gửi hồ sơ.',
    type: 'SYSTEM',
    targetUrl: '/admin/sellers',
  });

  assert.equal(count, 2);
  assert.equal(createdBatches.length, 1);
  assert.deepEqual(createdBatches[0], [
    {
      userId: 'admin-1',
      title: 'Yêu cầu nâng cấp Seller mới',
      content: 'Gian hàng A vừa gửi hồ sơ.',
      type: 'SYSTEM',
      channel: 'IN_APP',
      targetUrl: '/admin/sellers',
    },
    {
      userId: 'admin-2',
      title: 'Yêu cầu nâng cấp Seller mới',
      content: 'Gian hàng A vừa gửi hồ sơ.',
      type: 'SYSTEM',
      channel: 'IN_APP',
      targetUrl: '/admin/sellers',
    },
  ]);
});

test('ReportsService.create notifies Admins with /admin/reports targetUrl when report is filed', async () => {
  const adminNotifications = [];
  const prismaMock = {
    $transaction: async (run) =>
      run({
        $queryRaw: async () => [],
        product: { findFirst: async () => null },
        user: {
          findFirst: async () => ({ id: 'shop-1' }),
          findMany: async () => [{ id: 'admin-1' }],
        },
        shopViolation: {
          findFirst: async () => null,
          create: async ({ data }) => ({
            id: 'rep-1',
            shopId: data.shopId,
            productId: data.productId,
            status: 'PENDING',
            createdAt: new Date(),
          }),
        },
        notification: {
          createMany: async ({ data }) => {
            adminNotifications.push(...data);
            return { count: data.length };
          },
        },
      }),
  };

  const service = new ReportsService(prismaMock);
  await service.create('buyer-1', 'shop-1', 'shop', {
    title: 'Bán hàng giả',
    description: 'Chi tiết vi phạm',
    evidenceUrls: [],
  });

  assert.equal(adminNotifications.length, 1);
  assert.equal(adminNotifications[0].userId, 'admin-1');
  assert.equal(adminNotifications[0].type, 'DISPUTE');
  assert.equal(adminNotifications[0].targetUrl, '/admin/reports');
});

test('NotificationsService.getAdminNotificationSummary aggregates unread count, pending queues, and recent items', async () => {
  const prismaMock = {
    notification: {
      count: mock.fn(async () => 4),
      findMany: mock.fn(async () => [
        {
          id: 'notif-1',
          title: 'Yêu cầu rút tiền Seller mới',
          auctionId: null,
          targetUrl: '/admin/finance',
          content: 'Gian hàng A yêu cầu rút tiền.',
          type: 'PAYMENT',
          channel: 'IN_APP',
          isRead: false,
          readAt: null,
          createdAt: new Date('2026-11-11T08:00:00.000Z'),
        },
      ]),
    },
    sellerUpgradeRequest: { count: mock.fn(async () => 2) },
    auctionItem: { count: mock.fn(async () => 3) },
    withdrawalRequest: { count: mock.fn(async () => 1) },
    dispute: { count: mock.fn(async () => 1) },
    shopViolation: { count: mock.fn(async () => 2) },
    afterSalesRequest: { count: mock.fn(async () => 1) },
    orderRefund: { count: mock.fn(async () => 2) },
    sellerGhnAccount: { count: mock.fn(async () => 1) },
  };

  const service = new NotificationsService(prismaMock);
  const summary = await service.getAdminNotificationSummary('admin-1');

  assert.equal(summary.unreadCount, 4);
  assert.equal(summary.pendingQueues.sellerUpgradeRequests, 2);
  assert.equal(summary.pendingQueues.auctionConsignments, 3);
  assert.equal(summary.pendingQueues.withdrawalRequests, 1);
  assert.equal(summary.pendingQueues.openDisputes, 1);
  assert.equal(summary.pendingQueues.violationReports, 2);
  assert.equal(summary.pendingQueues.pendingRefunds, 3);
  assert.equal(summary.pendingQueues.pendingPickupPoints, 1);
  assert.equal(summary.totalPendingActions, 13);
  assert.equal(summary.recentNotifications.length, 1);
  assert.equal(summary.recentNotifications[0].targetUrl, '/admin/finance');
});
