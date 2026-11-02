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
const { ShipmentTrackingService } = load(
  '../src/modules/fulfillment/services/shipment-tracking.service.ts',
);
const { GhnOrderApiService } = load('../src/modules/fulfillment/services/ghn-order-api.service.ts');
const { GhnWebhookController } = load(
  '../src/modules/fulfillment/controllers/ghn-webhook.controller.ts',
);
const { mapGhnStatus } = load('../src/modules/fulfillment/services/shipment-state.ts');

function fixture() {
  const order = {
    id: 'o1',
    buyerId: 'buyer',
    sellerId: 'seller',
    status: 'PREPARING',
    shippingFee: 30000,
    shipment: {
      id: 's1',
      orderId: 'o1',
      waybillCode: 'GHN-1',
      status: 'CREATED',
      metadata: {
        code: 200,
        data: { order_code: 'GHN-1' },
        clientOrderCode: 'NX-o1',
        ghnShopId: 123,
        ghnEnvironment: 'PRODUCTION',
      },
    },
  };
  const prisma = {
    $queryRaw: async () => [],
    order: {
      findUnique: async () => order,
      findUniqueOrThrow: async () => order,
      update: mock.fn(async ({ data }) => Object.assign(order, data)),
    },
    shipment: { update: mock.fn(async ({ data }) => Object.assign(order.shipment, data)) },
    notification: { create: mock.fn(async () => ({})) },
  };
  let queue = Promise.resolve();
  prisma.$transaction = (run) => {
    const next = queue.then(() => run(prisma));
    queue = next.catch(() => {});
    return next;
  };
  const detail = {
    order_code: 'GHN-1',
    client_order_code: 'NX-o1',
    status: 'ready_to_pick',
    shop_id: 123,
    updated_date: new Date(Date.now() - 1000).toISOString(),
    calculate_weight: 1200,
  };
  const api = {
    detail: mock.fn(async () => ({ ...detail })),
    fees: mock.fn(async () => ({ total: 35000, detail: { main_service: 35000 } })),
  };
  return { service: new ShipmentTrackingService(prisma, api), order, prisma, detail, api };
}

test('created waybill remains preparing until GHN confirms pickup', async () => {
  const f = fixture();
  await f.service.refresh('o1', { id: 'buyer', role: 'BUYER' });
  assert.equal(f.order.status, 'PREPARING');
  assert.equal(f.order.shipment.status, 'CREATED');
  assert.equal(f.order.shipment.metadata.actualCarrierFee, 35000);
  assert.equal(f.order.shippingFee, 30000);
  f.detail.status = 'picked';
  f.detail.updated_date = new Date().toISOString();
  await f.service.refresh('o1');
  assert.equal(f.order.status, 'SHIPPING');
  assert.equal(f.order.shipment.status, 'PICKED_UP');
  assert.equal(f.order.shipment.chargeableWeight, 1.2);
});

test('duplicate delivery notifications do not reset delivery time or notify twice', async () => {
  const f = fixture();
  f.detail.status = 'delivered';
  await Promise.all([f.service.refresh('o1'), f.service.refresh('o1')]);
  const deliveredAt = f.order.shipment.metadata.deliveredAt;
  assert.equal(f.order.status, 'DELIVERED');
  assert.equal(f.prisma.notification.create.mock.callCount(), 1);
  f.detail.updated_date = new Date().toISOString();
  await f.service.refresh('o1');
  assert.equal(f.order.shipment.metadata.deliveredAt, deliveredAt);
  assert.equal(f.prisma.notification.create.mock.callCount(), 1);
});

test('late and terminal state regressions are ignored', async () => {
  const f = fixture();
  f.detail.status = 'delivered';
  await f.service.refresh('o1');
  f.detail.status = 'transporting';
  f.detail.updated_date = new Date().toISOString();
  const result = await f.service.refresh('o1');
  assert.equal(result.ignoredStaleUpdate, true);
  assert.equal(f.order.status, 'DELIVERED');
});

test('carrier failure reports attention without pretending the order was delivered', async () => {
  const f = fixture();
  f.detail.status = 'delivery_fail';
  const result = await f.service.refresh('o1');
  assert.equal(result.needsAttention, true);
  assert.equal(f.order.shipment.status, 'FAILED');
  assert.notEqual(f.order.status, 'DELIVERED');
  f.detail.status = 'returned';
  f.detail.updated_date = new Date().toISOString();
  await f.service.refresh('o1');
  assert.equal(f.order.shipment.status, 'RETURNED');
});

test('fee reconciliation failure does not block verified delivery', async () => {
  const f = fixture();
  f.detail.status = 'delivered';
  f.api.fees = async () => {
    throw new Error('Fee temporarily unavailable');
  };
  await f.service.refresh('o1');
  assert.equal(f.order.status, 'DELIVERED');
  assert.equal(f.order.shipment.metadata.actualCarrierFee, undefined);
});

test('unrelated users and mismatched client order codes cannot update a shipment', async () => {
  const f = fixture();
  await assert.rejects(
    f.service.refresh('o1', { id: 'stranger', role: 'BUYER' }),
    (error) => error.getStatus() === 403,
  );
  assert.equal(f.api.detail.mock.callCount(), 0);
  f.detail.client_order_code = 'OTHER';
  await assert.rejects(f.service.refresh('o1'), (error) => error.getStatus() === 502);
  assert.equal(f.prisma.shipment.update.mock.callCount(), 0);
});

test('all documented GHN statuses map, unknown values fail closed', () => {
  const statuses = [
    'ready_to_pick',
    'picking',
    'money_collect_picking',
    'picked',
    'storing',
    'sorting',
    'transporting',
    'delivering',
    'money_collect_delivering',
    'delivered',
    'delivery_fail',
    'waiting_to_return',
    'return',
    'return_transporting',
    'return_sorting',
    'returning',
    'return_fail',
    'returned',
    'cancel',
    'exception',
    'lost',
    'damage',
    'scrap',
  ];
  for (const status of statuses) assert.ok(mapGhnStatus(status).shipment);
  assert.throws(() => mapGhnStatus('new_unknown_status'));
});

function reader() {
  return new GhnOrderApiService({
    get: (key) =>
      ({ GHN_TOKEN: 'test', GHN_SHOP_ID: '123', GHN_API_URL: 'https://ghn.test/v2' })[key],
  });
}

test('carrier lookup uses GET, exact waybill and configured shop', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            order_code: 'GHN-1',
            client_order_code: 'NX-o1',
            status: 'ready_to_pick',
            shop_id: 123,
          },
        }),
      ),
  );
  const result = await reader().detail('GHN-1', 123, 'PRODUCTION');
  assert.equal(result.order_code, 'GHN-1');
  assert.equal(
    fetch.mock.calls[0].arguments[0],
    'https://ghn.test/v2/shipping-order/detail?order_code=GHN-1',
  );
  assert.equal(fetch.mock.calls[0].arguments[1].method, undefined);
  assert.equal(fetch.mock.calls[0].arguments[1].headers.ShopId, '123');
});

test('carrier fee sums only GHN components, including coupons', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            order_code: 'GHN-1',
            detail: { main_service: 30000, insurance: 1000, coupon: -5000 },
          },
        }),
      ),
  );
  assert.equal((await reader().fees('GHN-1', 123, 'PRODUCTION')).total, 26000);
});

test('wrong carrier shop cannot be accepted', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            order_code: 'GHN-1',
            client_order_code: 'NX-o1',
            status: 'delivered',
            shop_id: 999,
          },
        }),
      ),
  );
  await assert.rejects(
    reader().detail('GHN-1', 123, 'PRODUCTION'),
    (error) => error.getStatus() === 502,
  );
});

test('official labels use short-lived print tokens rather than the account token', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify({ code: 200, data: { token: 'print-only-token' } })),
  );
  const result = await reader().label('GHN-1', 123, 'PRODUCTION');
  assert.equal(fetch.mock.calls[0].arguments[0], 'https://ghn.test/v2/a5/gen-token');
  assert.deepEqual(JSON.parse(fetch.mock.calls[0].arguments[1].body), { order_codes: ['GHN-1'] });
  assert.equal(result.a5, 'https://ghn.test/a5/public-api/printA5?token=print-only-token');
});

test('webhook authenticates and rechecks GHN rather than trusting callback status', async () => {
  const tracking = { refresh: mock.fn(async () => ({})) };
  const controller = new GhnWebhookController(
    { get: (key) => ({ GHN_WEBHOOK_SECRET: 'secret', GHN_SHOP_ID: '123' })[key] },
    {
      shipment: {
        findFirst: async () => ({
          orderId: 'o1',
          metadata: { ghnShopId: 123, ghnEnvironment: 'PRODUCTION' },
        }),
      },
    },
    tracking,
  );
  await assert.rejects(
    controller.receive('wrong', { ShopID: 123, OrderCode: 'GHN-1' }),
    (error) => error.getStatus() === 401,
  );
  assert.equal(tracking.refresh.mock.callCount(), 0);
  await controller.receive('secret', {
    ShopID: 123,
    OrderCode: 'GHN-1',
    Status: 'delivered',
    TotalFee: 1,
  });
  assert.deepEqual(tracking.refresh.mock.calls[0].arguments, ['o1', undefined, 'delivered']);
});
