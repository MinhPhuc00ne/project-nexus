import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { AdminOrdersService } = load('../src/modules/admin/services/admin-orders.service.ts');
const { AdminOrdersController } = load(
  '../src/modules/admin/controllers/admin-orders.controller.ts',
);
const { QueryAdminOrdersDto } = load('../src/modules/admin/dtos/query-admin-orders.dto.ts');
const { JwtAuthGuard } = load('../src/core/security/jwt-auth.guard.ts');
const { TokenAuthService } = load('../src/core/security/token-auth.service.ts');
const { PrismaService } = load('../src/core/prisma/prisma.service.ts');
const { ConfigService } = load('@nestjs/config');
const { RolesGuard } = load('../src/core/security/roles.guard.ts');
const { Module, ValidationPipe } = load('@nestjs/common');
const { NestFactory } = load('@nestjs/core');

test('admin order queries combine filters, stable pagination and safe payment/shipment projections', async () => {
  let listArgs;
  let countArgs;
  let detailArgs;
  const prisma = {
    order: {
      findMany: async (args) => {
        listArgs = args;
        return [{ id: 'order1' }];
      },
      count: async (args) => {
        countArgs = args;
        return 21;
      },
      findUnique: async (args) => {
        detailArgs = args;
        return null;
      },
    },
    $transaction: (queries) => Promise.all(queries),
  };
  const orders = new AdminOrdersService(prisma);
  const result = await orders.list(
    Object.assign(new QueryAdminOrdersDto(), {
      page: 2,
      limit: 10,
      status: 'PAID',
      search: '  GHN1  ',
      sellerId: 'seller',
      buyerId: 'buyer',
    }),
  );
  assert.deepEqual(result, {
    items: [{ id: 'order1' }],
    total: 21,
    page: 2,
    limit: 10,
    totalPages: 3,
  });
  assert.equal(listArgs.skip, 10);
  assert.equal(listArgs.take, 10);
  assert.equal(listArgs.where.status, 'PAID');
  assert.equal(listArgs.where.sellerId, 'seller');
  assert.equal(listArgs.where.buyerId, 'buyer');
  assert.equal(listArgs.where.OR[1].shipment.waybillCode.contains, 'GHN1');
  assert.deepEqual(countArgs.where, listArgs.where);
  assert.deepEqual(listArgs.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
  assert.equal(listArgs.select.buyer.select.passwordHash, undefined);
  assert.equal(listArgs.select.shipment.select.metadata, undefined);
  await assert.rejects(orders.detail('missing'), (e) => e.getStatus() === 404);
  assert.equal(detailArgs.select.payments.select.metadata, undefined);
  assert.equal(detailArgs.select.payments.select.transactionCode, true);
  assert.equal(detailArgs.select.shipment.select.metadata, undefined);
  assert.equal(detailArgs.select.shipment.select.carrier, true);
  assert.equal(detailArgs.select.dispute.select.reason, true);
  assert.equal(detailArgs.select.dispute.select.resolutionNotes, true);
  assert.equal(detailArgs.select.items.include.product.select.title, true);
});

test('admin order detail builds chronological history from lifecycle and event logs', async () => {
  const t0 = new Date('2026-11-20T10:00:00Z');
  const t1 = new Date('2026-11-20T10:05:00Z');
  const t2 = new Date('2026-11-20T12:00:00Z');
  const t3 = new Date('2026-11-21T09:00:00Z');
  const prisma = {
    order: {
      findUnique: async () => ({
        id: 'order-1',
        status: 'DISPUTED',
        subtotal: 500000,
        shippingFee: 30000,
        totalAmount: 530000,
        createdAt: t0,
        updatedAt: t3,
        cancellationActor: null,
        buyer: { id: 'buyer-1', fullName: 'Nguyen Van A', email: 'buyer@test.local' },
        seller: { id: 'seller-1', fullName: 'Shop B', email: 'seller@test.local' },
        shipment: {
          carrier: 'GHN',
          trackingNumber: 'GHN-123',
          waybillCode: 'GHN-123',
          status: 'DELIVERED',
          shippingFee: 30000,
          createdAt: t1,
          updatedAt: t2,
        },
        afterSales: null,
        dispute: {
          id: 'disp-1',
          status: 'RESOLVED_BUYER',
          reason: 'Hàng lỗi',
          evidenceUrls: ['https://example.invalid/e1.jpg'],
          resolutionNotes: 'Hoàn tiền cho người mua',
          resolvedAt: t3,
          createdAt: t2,
          updatedAt: t3,
          openedBy: { id: 'buyer-1', fullName: 'Nguyen Van A', email: 'buyer@test.local' },
          resolvedBy: { id: 'staff-1', fullName: 'Staff C', email: 'staff@test.local' },
        },
        _count: { items: 1 },
        shippingAddressSnapshot: {},
        items: [],
        payments: [
          {
            id: 'pay-1',
            provider: 'PAYOS',
            amount: 530000,
            status: 'SUCCESS',
            transactionCode: 'TX-999',
            createdAt: t0,
            updatedAt: t1,
          },
        ],
        escrowRecord: {
          id: 'esc-1',
          totalAmount: 530000,
          platformFee: 25000,
          sellerPayout: 505000,
          status: 'REFUNDED',
          heldAt: t1,
          disbursedAt: null,
          refundedAt: t3,
        },
        refunds: [],
      }),
    },
    eventLog: {
      findMany: async () => [
        {
          id: 'evt-1',
          eventName: 'order.shipment-updated',
          operatorId: null,
          payload: { orderId: 'order-1', carrierStatus: 'delivered', reason: 'GHN đã giao' },
          createdAt: t2,
        },
        {
          id: 'evt-2',
          eventName: 'order.return-approved',
          operatorId: 'staff-1',
          payload: { orderId: 'order-1', reason: 'Đủ điều kiện hoàn' },
          createdAt: t2,
        },
      ],
    },
    user: {
      findMany: async () => [
        { id: 'staff-1', fullName: 'Staff C', email: 'staff@test.local', role: 'SUPPORT_STAFF' },
      ],
    },
  };
  const service = new AdminOrdersService(prisma);
  const detail = await service.detail('order-1');
  assert.equal(detail.payments[0].transactionCode, 'TX-999');
  assert.equal(detail.dispute.resolutionNotes, 'Hoàn tiền cho người mua');
  assert.ok(detail.history.some((h) => h.action === 'order.created'));
  assert.ok(detail.history.some((h) => h.action === 'payment.success'));
  assert.ok(detail.history.some((h) => h.action === 'order.shipment-updated'));
  const staffLog = detail.history.find((h) => h.action === 'order.return-approved');
  assert.equal(staffLog.actor.id, 'staff-1');
  assert.equal(staffLog.note, 'Đủ điều kiện hoàn');
});

test(
  'admin order HTTP routes enforce role, validate filters and return not found',
  { timeout: 15000 },
  async () => {
    let calls = 0;
    const orders = {
      list: async (query) => {
        calls++;
        return { page: query.page, limit: query.limit, items: [] };
      },
      detail: async () => {
        throw new (load('@nestjs/common').NotFoundException)('Order not found');
      },
    };
    class TestModule {}
    Module({
      controllers: [AdminOrdersController],
      providers: [
        { provide: AdminOrdersService, useValue: orders },
        {
          // The bearer value names the calling role, so the test states who it is
          // calling as without signing a token.
          provide: TokenAuthService,
          useValue: {
            authenticate: async (token) => ({
              id: token,
              sub: token,
              email: 'test@example.test',
              role: token,
              accountRole: token,
              activeRole: token,
              currentMode: 'BUYER',
              isSellerActive: false,
            }),
          },
        },
        JwtAuthGuard,
        RolesGuard,
      ],
    })(TestModule);
    const app = await NestFactory.create(TestModule, { logger: false, abortOnError: false });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    try {
      await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const auth = (role) => ({
        authorization: `Bearer ${role}`,
      });
      assert.equal((await fetch(`${base}/admin/orders`)).status, 401);
      for (const role of ['BUYER', 'SELLER']) {
        assert.equal((await fetch(`${base}/admin/orders`, { headers: auth(role) })).status, 403);
      }
      assert.equal(calls, 0);
      for (const role of ['ADMIN', 'SUPPORT_STAFF']) {
        const res = await fetch(`${base}/admin/orders?page=1&limit=5`, { headers: auth(role) });
        assert.equal(res.status, 200);
      }
      assert.equal(calls, 2);
      calls = 0;
      const headers = auth('ADMIN');
      for (const query of ['limit=101', 'page=0', 'status=INVALID', 'limit=abc', 'extra=ignored']) {
        assert.equal((await fetch(`${base}/admin/orders?${query}`, { headers })).status, 400);
      }
      assert.equal(calls, 0);
      const response = await fetch(`${base}/admin/orders?page=2&limit=5&status=PAID`, { headers });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { page: 2, limit: 5, items: [] });
      assert.equal((await fetch(`${base}/admin/orders/missing`, { headers })).status, 404);
    } finally {
      await app.close();
    }
  },
);
