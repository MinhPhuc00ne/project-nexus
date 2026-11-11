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
const { NotificationsGateway } = load(
  '../src/modules/notifications/gateways/notifications.gateway.ts',
);
const { publishCreatedNotifications } = load(
  '../src/core/notifications/notification-realtime.bus.ts',
);
const { LightweightJwt } = load('../src/core/security/jwt.util.ts');
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

test('NotificationsGateway authenticates JWT handshake, emits connected payload, and pushes realtime notifications', async () => {
  const secret = 'test-secret-notif-ws';
  const token = LightweightJwt.sign(
    { id: 'admin-99', role: 'ADMIN' },
    { secret, expiresInSeconds: 3600 },
  );
  const configMock = { get: () => secret };
  const notifServiceMock = {
    getUnreadCount: mock.fn(async () => ({ unreadCount: 3 })),
    markAllAsRead: mock.fn(),
  };

  const gateway = new NotificationsGateway(configMock, notifServiceMock);
  const roomEmits = [];
  gateway.server = {
    to: (room) => ({
      emit: (event, payload) => {
        roomEmits.push({ room, event, payload });
      },
    }),
  };
  gateway.afterInit();

  const joined = [];
  const clientEmits = [];
  const mockClient = {
    id: 'sock-1',
    handshake: { auth: { token }, headers: {} },
    data: {},
    join: async (room) => {
      joined.push(room);
    },
    emit: (event, payload) => {
      clientEmits.push({ event, payload });
    },
    disconnect: mock.fn(),
  };

  await gateway.handleConnection(mockClient);

  assert.deepEqual(joined, ['user:admin-99', 'role:ADMIN']);
  assert.equal(clientEmits[0].event, 'notification:connected');
  assert.equal(clientEmits[0].payload.unreadCount, 3);

  publishCreatedNotifications([
    {
      id: 'n-live-1',
      userId: 'admin-99',
      title: 'Yêu cầu nâng cấp Seller mới',
      content: 'Shop Demo vừa nộp hồ sơ.',
      type: 'SYSTEM',
      channel: 'IN_APP',
      isRead: false,
      readAt: null,
      createdAt: new Date('2026-11-11T09:50:00.000Z'),
      auctionId: null,
      targetUrl: '/admin/sellers',
    },
  ]);

  await new Promise((resolve) => setTimeout(resolve, 25));

  const newEvent = roomEmits.find((e) => e.event === 'notification:new');
  assert.ok(newEvent);
  assert.equal(newEvent.room, 'user:admin-99');
  assert.equal(newEvent.payload.id, 'n-live-1');
  assert.equal(newEvent.payload.targetUrl, '/admin/sellers');
  assert.equal(newEvent.payload.unreadCount, 3);

  gateway.onModuleDestroy();
});

test('NotificationsGateway rejects missing JWT handshake cleanly', async () => {
  const gateway = new NotificationsGateway(
    { get: () => 'secret' },
    { getUnreadCount: mock.fn(async () => ({ unreadCount: 0 })) },
  );
  const clientEmits = [];
  const disconnect = mock.fn();
  await gateway.handleConnection({
    id: 'sock-anon',
    handshake: { auth: {}, headers: {} },
    emit: (event, payload) => clientEmits.push({ event, payload }),
    disconnect,
  });

  assert.equal(clientEmits[0].event, 'notification:error');
  assert.equal(disconnect.mock.callCount(), 1);
});
