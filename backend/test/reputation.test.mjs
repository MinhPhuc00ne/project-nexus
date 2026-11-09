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
const { ReputationService } = load('../src/modules/users/services/reputation.service.ts');

function createReputationFixture(initialUser = {}) {
  const user = {
    id: 'user_1',
    role: 'SELLER',
    reputationScore: 50,
    trustLevel: 'STANDARD',
    isShopSuspended: false,
    ...initialUser,
  };

  const logs = [];
  const notifications = [];
  const products = [
    { id: 'p1', sellerId: user.id, status: 'ACTIVE' },
    { id: 'p2', sellerId: user.id, status: 'ACTIVE' },
  ];

  const prisma = {
    user: {
      findUnique: mock.fn(async ({ where }) => (where.id === user.id ? { ...user } : null)),
      update: mock.fn(async ({ where, data }) => {
        if (where.id === user.id) {
          Object.assign(user, data);
          return { ...user };
        }
        return null;
      }),
    },
    product: {
      updateMany: mock.fn(async ({ where, data }) => {
        let count = 0;
        for (const p of products) {
          if (
            p.sellerId === where.sellerId &&
            (where.status === undefined || p.status === where.status)
          ) {
            Object.assign(p, data);
            count++;
          }
        }
        return { count };
      }),
    },
    reputationLog: {
      findFirst: mock.fn(async ({ where }) => {
        return (
          logs.find(
            (l) =>
              l.userId === where.userId &&
              (!where.referenceId || l.referenceId === where.referenceId),
          ) || null
        );
      }),
      create: mock.fn(async ({ data }) => {
        const entry = { id: `log_${logs.length + 1}`, createdAt: new Date(), ...data };
        logs.push(entry);
        return entry;
      }),
      findMany: mock.fn(async () => logs),
      count: mock.fn(async () => logs.length),
    },
    notification: {
      create: mock.fn(async ({ data }) => {
        const noti = { id: `noti_${notifications.length + 1}`, createdAt: new Date(), ...data };
        notifications.push(noti);
        return noti;
      }),
    },
  };

  const notificationsService = {
    createNotification: mock.fn(async (params) => prisma.notification.create({ data: params })),
  };

  const service = new ReputationService(prisma, notificationsService);

  return { service, prisma, user, logs, notifications, products };
}

test('ReputationService.calculateTrustLevel maps thresholds according to project business rules', () => {
  const { service } = createReputationFixture();

  assert.equal(service.calculateTrustLevel(100), 'EXCELLENT');
  assert.equal(service.calculateTrustLevel(90), 'EXCELLENT');
  assert.equal(service.calculateTrustLevel(89), 'GOOD');
  assert.equal(service.calculateTrustLevel(80), 'GOOD');
  assert.equal(service.calculateTrustLevel(79), 'STANDARD');
  assert.equal(service.calculateTrustLevel(30), 'STANDARD');
  assert.equal(service.calculateTrustLevel(29), 'PROBATION');
  assert.equal(service.calculateTrustLevel(20), 'PROBATION');
  assert.equal(service.calculateTrustLevel(19), 'SUSPENDED');
  assert.equal(service.calculateTrustLevel(0), 'SUSPENDED');
});

test('ReputationService.adjustScore increments score, clamps to 100, logs audit trail and dispatches notification', async () => {
  const f = createReputationFixture({ reputationScore: 88 });

  const result = await f.service.adjustScore({
    userId: f.user.id,
    deltaPoints: 5,
    reason: 'Hoàn tất đơn hàng xuất sắc',
    referenceId: 'ord_123',
  });

  assert.equal(result.score, 93);
  assert.equal(result.trustLevel, 'EXCELLENT');
  assert.equal(f.user.reputationScore, 93);
  assert.equal(f.logs.length, 1);
  assert.equal(f.logs[0].deltaPoints, 5);
  assert.equal(f.logs[0].balanceAfter, 93);
  assert.equal(f.notifications.length, 1);
  assert.match(f.notifications[0].title, /Điểm uy tín tăng/);
});

test('ReputationService.adjustScore decrements score and clamps to 0 minimum without negative balances', async () => {
  const f = createReputationFixture({ reputationScore: 10 });

  const result = await f.service.adjustScore({
    userId: f.user.id,
    deltaPoints: -25,
    reason: 'Gian lận sản phẩm bị khiếu nại',
    referenceId: 'disp_999',
  });

  assert.equal(result.score, 0);
  assert.equal(result.trustLevel, 'SUSPENDED');
  assert.equal(f.user.isShopSuspended, true);
  assert.equal(f.logs[0].balanceAfter, 0);
});

test('ReputationService.adjustScore automatically suspends seller shop and hides active listings when score drops below 20', async () => {
  const f = createReputationFixture({ reputationScore: 25, role: 'SELLER' });

  await f.service.adjustScore({
    userId: f.user.id,
    deltaPoints: -10,
    reason: 'Hủy đơn do hết hàng',
  });

  assert.equal(f.user.reputationScore, 15);
  assert.equal(f.user.trustLevel, 'SUSPENDED');
  assert.equal(f.user.isShopSuspended, true);
  assert.match(f.user.suspensionReason, /SUSPENDED/);
  assert.equal(f.prisma.product.updateMany.mock.callCount(), 1);
  assert.equal(
    f.products.every((p) => p.status === 'INACTIVE'),
    true,
  );
  assert.equal(f.notifications.length, 1);
  assert.match(f.notifications[0].content, /tạm khóa/);
});

test('ReputationService.adjustScore bypasses staff and admin accounts without modifying scores', async () => {
  const f = createReputationFixture({ role: 'ADMIN', reputationScore: 100 });

  const result = await f.service.adjustScore({
    userId: f.user.id,
    deltaPoints: 10,
    reason: 'Staff reward test',
  });

  assert.equal(result, null);
  assert.equal(f.user.reputationScore, 100);
  assert.equal(f.logs.length, 0);
  assert.equal(f.notifications.length, 0);
});

test('ReputationService.awardProfileCompletion awards points once and enforces idempotency against duplicate updates', async () => {
  const f = createReputationFixture({ reputationScore: 60 });

  const firstAward = await f.service.awardProfileCompletion({
    userId: f.user.id,
    fieldKey: 'PHONE',
    points: 10,
    reason: 'Cập nhật số điện thoại 10 số',
  });

  assert.equal(firstAward, true);
  assert.equal(f.user.reputationScore, 70);
  assert.equal(f.logs.length, 1);

  // Updating phone again must not award points again
  const duplicateAward = await f.service.awardProfileCompletion({
    userId: f.user.id,
    fieldKey: 'PHONE',
    points: 10,
    reason: 'Cập nhật lại số điện thoại',
  });

  assert.equal(duplicateAward, false);
  assert.equal(f.user.reputationScore, 70);
  assert.equal(f.logs.length, 1);
});

test('ReputationService.getReputationSummary provides verified shop status for scores >= 80', async () => {
  const f = createReputationFixture({ reputationScore: 82 });

  const summary = await f.service.getReputationSummary(f.user.id);
  assert.equal(summary.score, 82);
  assert.equal(summary.isVerifiedShop, true);
  assert.equal(summary.canSell, true);
});
