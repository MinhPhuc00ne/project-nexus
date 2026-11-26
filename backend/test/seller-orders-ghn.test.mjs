import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from 'node:test';
import tsNode from 'ts-node';
import { BadGatewayException } from '@nestjs/common';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});

const loadBackend = createRequire(import.meta.url);
const { SellerOrdersService } = loadBackend(
  '../src/modules/orders/services/seller-orders.service.ts',
);
const { GhnDispatchService } = loadBackend(
  '../src/modules/fulfillment/services/ghn-dispatch.service.ts',
);
const { buildGhnParcel } = loadBackend('../src/modules/fulfillment/services/ghn-parcel.ts');

function fixture(createShippingOrder, status = 'PAID', shipment = null) {
  const order = {
    id: 'order-1',
    sellerId: 'seller-1',
    buyerId: 'buyer-1',
    status,
    shipment,
    shippingFee: 30000,
    shippingAddressSnapshot: {
      recipientName: 'Buyer',
      phone: '0901234567',
      street: '123 Test Street',
      ward: 'Ward',
      district: 'District',
      city: 'City',
    },
    items: [
      {
        product: { title: 'Item', weightGrams: 500, lengthCm: 20, widthCm: 15, heightCm: 10 },
        quantity: 1,
        unitPrice: 100000,
      },
    ],
  };
  const prisma = {
    order: {
      findUnique: mock.fn(async () => order),
      update: mock.fn(async ({ data }) => Object.assign(order, data)),
      findUniqueOrThrow: mock.fn(async () => order),
    },
    user: { findUnique: mock.fn(async () => null) },
    shipment: {
      upsert: mock.fn(async ({ create, update }) => {
        order.shipment = {
          id: 'shipment-1',
          ...(order.shipment || {}),
          ...(order.shipment ? update : create),
        };
        return order.shipment;
      }),
      update: mock.fn(async ({ data }) => Object.assign(order.shipment, data)),
      findUniqueOrThrow: mock.fn(async () => order.shipment),
    },
    $queryRaw: async () => [],
    notification: { create: mock.fn(async () => ({})) },
  };
  prisma.$transaction = async (run) => run(prisma);
  const shipping = {
    quote: async (_sellerId, _destination, items) => ({
      fee: { total: 30000 },
      parcel: buildGhnParcel(items),
      origin: {
        phone: '0901234567',
        street: 'Pickup address',
        ghnShopId: 111,
        ghnEnvironment: 'PRODUCTION',
        pickupPointId: 'pickup-1',
      },
      request: {
        shopId: 111,
        fromDistrictId: 1,
        fromWardCode: '01',
        toDistrictId: 2,
        toWardCode: '02',
        serviceTypeId: 2,
      },
    }),
  };
  const gateway = { createShippingOrder: mock.fn(createShippingOrder) };
  const reads = {
    byClientCode: mock.fn(async () => ({
      order_code: 'REAL-GHN-123',
      client_order_code: 'NX-order-1',
    })),
  };
  const dispatch = new GhnDispatchService(prisma, shipping, gateway, reads);
  const service = new SellerOrdersService(prisma, dispatch);
  return { service, prisma, order, dispatch, gateway, reads };
}

function assertUnchanged({ prisma, order }, status) {
  assert.equal(order.status, status);
  assert.equal(order.shipment.waybillCode, undefined);
  assert.equal(order.shipment.metadata.dispatchState, 'UNKNOWN');
  assert.equal(prisma.order.update.mock.callCount(), 0);
  assert.equal(prisma.notification.create.mock.callCount(), 0);
}

for (const status of ['PAID', 'PREPARING']) {
  test(`GHN failure leaves ${status} order unchanged`, async () => {
    const failure = new BadGatewayException('GHN unavailable or configuration invalid');
    const context = fixture(async () => {
      throw failure;
    }, status);
    await assert.rejects(
      context.service.dispatchGhn('seller-1', 'order-1'),
      (err) => err === failure,
    );
    assertUnchanged(context, status);
  });
}

const invalidResponses = [
  null,
  { code: 400, data: { order_code: 'REJECTED' } },
  { code: 200 },
  { code: 200, data: null },
  { code: 200, data: 'invalid' },
  { code: 200, data: {} },
  { code: 200, data: { order_code: 123 } },
  { code: 200, data: { order_code: '' } },
  { code: 200, data: { order_code: '   ' } },
];
for (const response of invalidResponses) {
  test(`invalid GHN response cannot dispatch: ${JSON.stringify(response)}`, async () => {
    const context = fixture(async () => response);
    await assert.rejects(context.service.dispatchGhn('seller-1', 'order-1'), BadGatewayException);
    assertUnchanged(context, 'PAID');
  });
}

test('confirmed GHN waybill is saved and buyer is notified', async () => {
  const response = { code: 200, data: { order_code: 'REAL-GHN-123' } };
  const context = fixture(async () => response);
  const result = await context.service.dispatchGhn('seller-1', 'order-1');
  assert.equal(result.success, true);
  assert.equal(result.orderStatus, 'PREPARING');
  assert.equal(result.shipment.status, 'CREATED');
  assert.equal(result.shipment.waybillCode, 'REAL-GHN-123');
  assert.equal(context.order.shipment.trackingNumber, 'REAL-GHN-123');
  assert.deepEqual(context.order.shipment.metadata.data, response.data);
  assert.equal(
    context.gateway.createShippingOrder.mock.calls[0].arguments[0].client_order_code,
    'NX-order-1',
  );
  assert.equal(context.prisma.notification.create.mock.callCount(), 1);
});

const unverifiedShipments = [
  null,
  { carrier: 'GHN', waybillCode: 'FAKE', metadata: { fallback: true } },
  { carrier: 'GHN', waybillCode: 'FAKE', metadata: null },
  { carrier: 'GHN', waybillCode: 'FAKE', metadata: { code: 200, data: { order_code: 'OTHER' } } },
];
for (const shipment of unverifiedShipments) {
  test(`printing rejects unverified shipment: ${JSON.stringify(shipment)}`, async () => {
    const { service } = fixture(async () => {}, 'SHIPPING', shipment);
    await assert.rejects(
      service.printWaybill('seller-1', 'order-1'),
      (err) => err.getStatus() === 400,
    );
  });
}

test('printing uses the confirmed GHN waybill', async () => {
  const shipment = {
    carrier: 'GHN',
    waybillCode: 'REAL-GHN-123',
    metadata: { code: 200, data: { order_code: 'REAL-GHN-123' } },
  };
  const { service } = fixture(async () => {}, 'SHIPPING', shipment);
  const result = await service.printWaybill('seller-1', 'order-1');
  assert.equal(result.waybillCode, 'REAL-GHN-123');
});

test('uncertain creation is not resent and can be recovered by client order code', async () => {
  const context = fixture(async () => {
    throw new Error('Connection lost after sending');
  });
  await assert.rejects(context.service.dispatchGhn('seller-1', 'order-1'));
  await assert.rejects(
    context.service.dispatchGhn('seller-1', 'order-1'),
    (error) => error.getStatus() === 409,
  );
  assert.equal(context.gateway.createShippingOrder.mock.callCount(), 1);
  const recovered = await context.dispatch.reconcile('seller-1', 'order-1');
  assert.equal(recovered.shipment.waybillCode, 'REAL-GHN-123');
  assert.equal(recovered.shipment.status, 'CREATED');
  assert.equal(context.reads.byClientCode.mock.calls[0].arguments[0], 'NX-order-1');
  assert.equal(context.gateway.createShippingOrder.mock.callCount(), 1);
});

test('concurrent dispatch requests only send one mutation to GHN', async () => {
  let finish;
  const context = fixture(
    async () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let queue = Promise.resolve();
  context.prisma.$transaction = (run) => {
    const next = queue.then(() => run(context.prisma));
    queue = next.catch(() => {});
    return next;
  };
  const first = context.service.dispatchGhn('seller-1', 'order-1');
  while (!finish) await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    context.service.dispatchGhn('seller-1', 'order-1'),
    (error) => error.getStatus() === 409,
  );
  finish({ code: 200, data: { order_code: 'REAL-GHN-123', total_fee: 35000 } });
  await first;
  assert.equal(context.gateway.createShippingOrder.mock.callCount(), 1);
  assert.equal(context.order.shipment.metadata.actualCarrierFee, 35000);
  assert.equal(context.order.shipment.metadata.feeDifference, 5000);
  assert.equal(context.order.shippingFee, 30000);
});

test('legacy synthetic waybills are not treated as confirmed dispatches', async () => {
  const context = fixture(async () => {}, 'PREPARING', {
    waybillCode: 'FAKE',
    metadata: { fallback: true },
  });
  await assert.rejects(
    context.service.dispatchGhn('seller-1', 'order-1'),
    (error) => error.getStatus() === 409,
  );
  assert.equal(context.gateway.createShippingOrder.mock.callCount(), 0);
});

test('another seller cannot dispatch an order', async () => {
  const context = fixture(async () => {});
  await assert.rejects(
    context.service.dispatchGhn('other-seller', 'order-1'),
    (error) => error.getStatus() === 403,
  );
  assert.equal(context.gateway.createShippingOrder.mock.callCount(), 0);
});
