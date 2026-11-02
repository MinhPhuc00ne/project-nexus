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
const { LightweightJwt } = load('../src/core/security/jwt.util.ts');
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
  assert.equal(detailArgs.select.items.include.product.select.title, true);
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
        { provide: ConfigService, useValue: { get: () => 'admin-orders-test-secret' } },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: async ({ where }) => ({
                id: where.id,
                role: where.id,
                email: 'test@example.test',
                isSellerActive: false,
                isShopSuspended: false,
                trustLevel: 'NORMAL',
              }),
            },
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
        authorization: `Bearer ${LightweightJwt.sign(
          { sub: role, role: 'ADMIN' },
          {
            secret: 'admin-orders-test-secret',
            expiresInSeconds: 60,
          },
        )}`,
      });
      assert.equal((await fetch(`${base}/admin/orders`)).status, 401);
      for (const role of ['BUYER', 'SELLER', 'SUPPORT_STAFF']) {
        assert.equal((await fetch(`${base}/admin/orders`, { headers: auth(role) })).status, 403);
      }
      assert.equal(calls, 0);
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
