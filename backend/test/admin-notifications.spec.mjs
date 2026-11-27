import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from './helpers/vitest-node-compat.mjs';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const load = createRequire(import.meta.url);
const { notifyAllAdmins, notifyAdminsAndStaff } = load(
  '../src/core/notifications/admin-notification.util.ts',
);
const { NotificationsService } = load(
  '../src/modules/notifications/services/notifications.service.ts',
);
const { NotificationsGateway } = load(
  '../src/modules/notifications/gateways/notifications.gateway.ts',
);
const { EventEmitter2 } = load('@nestjs/event-emitter');
const { DomainEventsService } = load('../src/core/events/domain-events.service.ts');
const { PrismaService } = load('../src/core/prisma/prisma.service.ts');
const { NotificationPublisher, runWithNotificationBatch } = load(
  '../src/core/notifications/notification-publisher.service.ts',
);
/**
 * Stands in for TokenAuthService: the handshake token is read as the account id,
 * so the gateway is exercised without signing real tokens.
 */
const tokenAuthStub = {
  authenticateOptional: async (token) => {
    if (!token) return undefined;
    const [id, role] = token.split('|');
    return { id, sub: id, role };
  },
};
const { ReportsService } = load('../src/modules/reviews/services/reports.service.ts');

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
  const token = 'admin-99|ADMIN';
  const notifServiceMock = {
    getUnreadCount: mock.fn(async () => ({ unreadCount: 3 })),
    markAllAsRead: mock.fn(),
  };

  const domainEvents = new DomainEventsService(new EventEmitter2());
  const socketMetricsStub = { registerServer() {} };
  const gateway = new NotificationsGateway(
    tokenAuthStub,
    domainEvents,
    notifServiceMock,
    socketMetricsStub,
  );
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

  domainEvents.publishNotificationsCreated([
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
    tokenAuthStub,
    new DomainEventsService(new EventEmitter2()),
    { getUnreadCount: mock.fn(async () => ({ unreadCount: 0 })) },
    { registerServer() {} },
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

test('NotificationPublisher emits realtime records immediately and buffers inside runWithNotificationBatch', async () => {
  const emitted = [];
  const emitter = new EventEmitter2({ wildcard: true, delimiter: '.' });
  emitter.on('notifications.created', (records) => emitted.push(...records));

  const prismaMock = {
    notification: {
      create: async ({ data }) => ({ id: 'created-id-1', ...data }),
      createMany: async ({ data }) => ({ count: Array.isArray(data) ? data.length : 1 }),
    },
  };

  const publisher = new NotificationPublisher(prismaMock, emitter);

  await publisher.create({
    userId: 'user-1',
    title: 'Đơn hàng mới',
    content: 'Nội dung',
    type: 'ORDER',
    channel: 'IN_APP',
  });

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].userId, 'user-1');
  assert.equal(emitted[0].title, 'Đơn hàng mới');

  await runWithNotificationBatch(emitter, async () => {
    await publisher.createMany([
      {
        userId: 'admin-1',
        title: 'Yêu cầu nâng cấp Seller mới',
        content: 'Gian hàng X gửi hồ sơ.',
        type: 'SYSTEM',
        channel: 'IN_APP',
        targetUrl: '/admin/sellers',
      },
    ]);
    assert.equal(emitted.length, 1, 'Transactional notifications must wait until commit');
  });

  assert.equal(emitted.length, 2);
  assert.equal(emitted[1].userId, 'admin-1');
  assert.equal(emitted[1].targetUrl, '/admin/sellers');
  assert.ok(emitted[1].id, 'Should assign random id to createMany realtime payload');
});

test('PrismaService exposes pure Prisma notification delegate without Proxy wrapper', async () => {
  const configServiceMock = { get: () => 'postgresql://localhost:5432/nexus_test' };
  const emitter = new EventEmitter2({ wildcard: true, delimiter: '.' });
  const prisma = new PrismaService(configServiceMock, emitter);

  assert.ok(prisma.notification, 'PrismaService must expose notification delegate');
  assert.equal(prisma.wrappedNotificationDelegate, undefined);

  await prisma.onModuleDestroy();
});

test('notifyAdminsAndStaff assigns role-specific targetUrl and metadata for Admin and Support Staff', async () => {
  const createdBatches = [];
  const prismaMock = {
    user: {
      findMany: mock.fn(async () => [
        { id: 'admin-1', role: 'ADMIN' },
        { id: 'staff-1', role: 'SUPPORT_STAFF' },
      ]),
    },
    notification: {
      createMany: mock.fn(async (input) => {
        createdBatches.push(input.data);
        return { count: input.data.length };
      }),
    },
  };

  const count = await notifyAdminsAndStaff(prismaMock, {
    title: 'Khiếu nại đơn hàng mới',
    content: 'Đơn #12345678 vừa có khiếu nại.',
    type: 'DISPUTE',
    adminTargetUrl: '/admin/reports',
    staffTargetUrl: '/staff/disputes',
    metadata: {
      entityType: 'ORDER_DISPUTE',
      disputeId: 'disp-1',
      orderId: 'order-1',
    },
  });

  assert.equal(count, 2);
  assert.equal(createdBatches.length, 1);
  assert.deepEqual(createdBatches[0], [
    {
      userId: 'admin-1',
      title: 'Khiếu nại đơn hàng mới',
      content: 'Đơn #12345678 vừa có khiếu nại.',
      type: 'DISPUTE',
      channel: 'IN_APP',
      targetUrl: '/admin/reports',
      metadata: {
        entityType: 'ORDER_DISPUTE',
        disputeId: 'disp-1',
        orderId: 'order-1',
      },
    },
    {
      userId: 'staff-1',
      title: 'Khiếu nại đơn hàng mới',
      content: 'Đơn #12345678 vừa có khiếu nại.',
      type: 'DISPUTE',
      channel: 'IN_APP',
      targetUrl: '/staff/disputes',
      metadata: {
        entityType: 'ORDER_DISPUTE',
        disputeId: 'disp-1',
        orderId: 'order-1',
      },
    },
  ]);
});

test('ReportsService.create notifies Support Staff with /staff/disputes targetUrl and metadata', async () => {
  const notifications = [];
  const prismaMock = {
    $transaction: async (run) =>
      run({
        $queryRaw: async () => [],
        product: { findFirst: async () => null },
        user: {
          findFirst: async () => ({ id: 'shop-1' }),
          findMany: async () => [
            { id: 'admin-1', role: 'ADMIN' },
            { id: 'staff-1', role: 'SUPPORT_STAFF' },
          ],
        },
        shopViolation: {
          findFirst: async () => null,
          create: async ({ data }) => ({
            id: 'rep-2',
            shopId: data.shopId,
            productId: data.productId,
            status: 'PENDING',
            createdAt: new Date(),
          }),
        },
        notification: {
          createMany: async ({ data }) => {
            notifications.push(...data);
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

  const adminNotice = notifications.find((n) => n.userId === 'admin-1');
  const staffNotice = notifications.find((n) => n.userId === 'staff-1');
  assert.equal(adminNotice?.targetUrl, '/admin/reports');
  assert.equal(staffNotice?.targetUrl, '/staff/disputes');
  assert.deepEqual(staffNotice?.metadata, {
    entityType: 'VIOLATION_REPORT',
    reportId: 'rep-2',
    shopId: 'shop-1',
    productId: null,
    kind: 'shop',
  });
});
