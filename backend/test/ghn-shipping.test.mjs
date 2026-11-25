import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from 'node:test';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const loadBackend = createRequire(import.meta.url);
const { GhnLogisticsService } = loadBackend(
  '../src/modules/fulfillment/services/ghn-logistics.service.ts',
);
const { GhnShippingService } = loadBackend(
  '../src/modules/fulfillment/services/ghn-shipping.service.ts',
);
const { FulfillmentService } = loadBackend(
  '../src/modules/fulfillment/services/fulfillment.service.ts',
);
const { OrderService } = loadBackend('../src/modules/orders/services/order.service.ts');
const { OrderPaymentHelper } = loadBackend(
  '../src/modules/orders/services/order-payment.helper.ts',
);

const item = {
  name: 'Product',
  quantity: 2,
  weight: 500,
  length: 20,
  width: 15,
  height: 10,
  price: 100000,
};
const recipient = {
  city: 'Destination',
  district: 'District',
  ward: 'Ward',
  street: 'Recipient address',
};
const fee = { total: 31789, serviceFee: 30000, insuranceFee: 1789, codFee: 0, r2sFee: 0 };

function carrier() {
  const values = {
    GHN_TOKEN: 'test-token',
    GHN_SHOP_ID: '123',
    GHN_API_URL: 'https://ghn.test/v2',
  };
  return new GhnLogisticsService({ get: (key) => values[key] });
}

test('fee and parcel valuation come from GHN, without a local weight/price formula', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: { total: 31789, service_fee: 30000, insurance_fee: 1789 },
        }),
      ),
  );
  const result = await carrier().calculateFee({
    toDistrictId: 2,
    toWardCode: '02',
    weightGrams: 500,
    lengthCm: 100,
    widthCm: 80,
    heightCm: 50,
    insuranceValue: 6000000,
  });
  assert.deepEqual(result, fee);
  const [url, options] = fetch.mock.calls[0].arguments;
  assert.equal(url, 'https://ghn.test/v2/shipping-order/fee');
  const body = JSON.parse(options.body);
  assert.equal(body.weight, 500);
  assert.equal(body.length, 100);
  assert.equal(body.insurance_value, 6000000);
  assert.equal(body.service_type_id, 2);
  assert.equal(options.headers.ShopId, '123');
});

for (const body of [
  { code: 400, message: 'Unsupported route' },
  { code: 200, data: { total: -1, service_fee: 100 } },
  { code: 200, data: { service_fee: 100 } },
]) {
  test(`invalid GHN fee is rejected: ${JSON.stringify(body)}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body)));
    await assert.rejects(
      carrier().calculateFee({ toDistrictId: 2, toWardCode: '02', weightGrams: 500 }),
      (err) => err.getStatus() === 502,
    );
  });
}

test('network error has no fallback price', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Connection lost');
  });
  await assert.rejects(
    carrier().calculateFee({ toDistrictId: 2, toWardCode: '02', weightGrams: 500 }),
    (err) => err.getStatus() === 502,
  );
});

test('missing GHN credentials fails before any external request', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Must not call');
  });
  const service = new GhnLogisticsService({ get: () => undefined });
  await assert.rejects(
    service.calculateFee({ toDistrictId: 2, toWardCode: '02', weightGrams: 500 }),
    (err) => err.getStatus() === 502,
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test('GHN zero-cost promotions are preserved without applying a minimum fee', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify({ code: 200, data: { total: 0, service_fee: 0 } })),
  );
  const result = await carrier().calculateFee({
    toDistrictId: 2,
    toWardCode: '02',
    weightGrams: 500,
  });
  assert.equal(result.total, 0);
});

test('address resolution matches exact normalized GHN names', async () => {
  const service = carrier();
  service.getProvinces = async () => [
    { provinceId: 1, provinceName: 'Thành phố Hồ Chí Minh' },
    { provinceId: 2, provinceName: 'Tỉnh Hà Nam' },
  ];
  service.getDistricts = async () => [{ districtId: 123, districtName: 'Quận 1' }];
  service.getWards = async () => [{ wardCode: '456', wardName: 'Phường Bến Nghé' }];
  assert.deepEqual(await service.resolveDistrictAndWard('TP. Ho Chi Minh', 'Quan 01', 'Ben Nghe'), {
    districtId: 123,
    wardCode: '456',
  });
  assert.equal(await service.resolveDistrictAndWard('', 'Quan 1', 'Ben Nghe'), null);
});

function quoteFixture() {
  const origin = {
    city: 'Origin',
    district: 'District',
    ward: 'Ward',
    street: 'Pickup',
    phone: '0901234567',
  };
  const prisma = {
    sellerUpgradeRequest: { findFirst: async () => origin },
    userAddress: { findFirst: async () => null },
  };
  const ghn = {
    resolveDistrictAndWard: mock.fn(async (city) => ({
      districtId: city === 'Origin' ? 1 : 2,
      wardCode: city === 'Origin' ? '01' : '02',
    })),
    getAvailableServices: mock.fn(async () => [
      { serviceId: 101, serviceTypeId: 2 },
      { serviceId: 105, serviceTypeId: 5 },
    ]),
    calculateFee: mock.fn(async () => fee),
  };
  return {
    service: new GhnShippingService(
      {
        environment: () => 'PRODUCTION',
        requireVerified: async () => ({
          id: 'pickup-1',
          environment: 'PRODUCTION',
          ghnShopId: 111,
          districtId: 1,
          wardCode: '01',
          city: 'Origin',
          district: 'District',
          ward: 'Ward',
          name: 'Origin',
          phone: '0901234567',
          carrierPhone: '0901234567',
          carrierAddress: 'Pickup',
          street: 'Pickup',
        }),
      },
      ghn,
    ),
    ghn,
    prisma,
  };
}

test('quote resolves pickup/delivery and sends physical dimensions to GHN', async () => {
  const { service, ghn } = quoteFixture();
  const quote = await service.quote('seller-1', recipient, [item]);
  assert.equal(quote.fee.total, 31789);
  const request = ghn.calculateFee.mock.calls[0].arguments[0];
  assert.equal(request.fromDistrictId, 1);
  assert.equal(request.toDistrictId, 2);
  assert.equal(request.weightGrams, 1000);
  assert.equal(request.lengthCm, 20);
  assert.equal(request.heightCm, 20);
  assert.equal(request.insuranceValue, 200000);
  assert.equal(request.serviceId, 101);
});

test('heavy parcels use GHN heavy service and include item dimensions', async () => {
  const { service, ghn } = quoteFixture();
  await service.quote('seller-1', recipient, [{ ...item, weight: 10000 }]);
  const request = ghn.calculateFee.mock.calls[0].arguments[0];
  assert.equal(request.serviceTypeId, 5);
  assert.equal(request.serviceId, 105);
  assert.equal(request.items[0].weight, 10000);
  assert.equal(request.items[0].height, 10);
});

test('incomplete address and unsupported services cannot produce a price', async () => {
  const { service, ghn } = quoteFixture();
  await assert.rejects(service.quote('seller-1', { city: 'Destination' }, [item]));
  ghn.getAvailableServices = async () => [];
  await assert.rejects(service.quote('seller-1', recipient, [item]));
  assert.equal(ghn.calculateFee.mock.callCount(), 0);
});

test('raw heavy fee endpoint passes items to GHN', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(JSON.stringify({ code: 200, data: { total: 50000, service_fee: 50000 } })),
  );
  await carrier().calculateFee({
    toDistrictId: 2,
    toWardCode: '02',
    weightGrams: 20000,
    items: [{ ...item, weight: 10000 }],
  });
  const body = JSON.parse(fetch.mock.calls[0].arguments[1].body);
  assert.equal(body.service_type_id, 5);
  assert.equal(body.items[0].weight, 10000);
});

function checkoutFixture(quote) {
  const cart = {
    id: 'cart',
    userId: 'buyer',
    items: [1, 2].map((number) => ({
      id: `item-${number}`,
      productId: `product-${number}`,
      quantity: number,
      optionKey: '',
      selections: {},
      product: {
        id: `product-${number}`,
        sellerId: `seller-${number}`,
        title: 'Item',
        status: 'ACTIVE',
        options: [],
        seller: { isShopSuspended: false },
        inventories: [{ availableQty: 10 }],
        basePrice: 100000,
        weightGrams: 500,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
      },
    })),
  };
  const tx = {
    $queryRaw: async () => [],
    order: { create: mock.fn(async ({ data }) => ({ id: `order-${data.sellerId}`, ...data })) },
    cartItem: { findMany: async () => cart.items, deleteMany: mock.fn(async () => ({})) },
  };
  const prisma = {
    cart: { findUnique: async () => structuredClone(cart) },
    $transaction: mock.fn(async (run) => run(tx)),
  };
  const service = new OrderService(
    prisma,
    { quote },
    new OrderPaymentHelper(prisma, {}, { next: async () => 1_000_000_000_001 }, {}, {}),
  );
  return { service, prisma, tx, cart };
}

test('checkout ignores client fee and uses each seller GHN quote in payment totals', async () => {
  const quote = mock.fn(async (sellerId) => ({
    fee: { total: sellerId === 'seller-1' ? 21789 : 45678 },
  }));
  const { service, tx } = checkoutFixture(quote);
  const result = await service.checkout('buyer', { shippingAddress: recipient, shippingFee: 1 });
  assert.equal(result.orders[0].shippingFee, 21789);
  assert.equal(result.orders[0].totalAmount, 121789);
  assert.equal(result.orders[1].shippingFee, 45678);
  assert.equal(result.orders[1].totalAmount, 245678);
  assert.equal(quote.mock.calls[1].arguments[2][0].quantity, 2);
  assert.equal(tx.cartItem.deleteMany.mock.callCount(), 1);
});

test('failure for a later seller leaves all orders and cart unchanged', async () => {
  const { service, prisma, tx } = checkoutFixture(async (sellerId) => {
    if (sellerId === 'seller-2') throw new Error('GHN unavailable');
    return { fee };
  });
  await assert.rejects(
    service.checkout('buyer', { shippingAddress: recipient }),
    /GHN unavailable/,
  );
  assert.equal(prisma.$transaction.mock.callCount(), 0);
  assert.equal(tx.order.create.mock.callCount(), 0);
  assert.equal(tx.cartItem.deleteMany.mock.callCount(), 0);
});

test('checkout rechecks cart and product price after all GHN responses, before creating orders', async () => {
  const f = checkoutFixture(async () => {
    f.cart.items[0].product.basePrice = 999000;
    return { fee };
  });
  await assert.rejects(f.service.checkout('buyer', { shippingAddress: recipient }), /thay đổi/);
  assert.equal(f.tx.order.create.mock.callCount(), 0);
  assert.equal(f.tx.cartItem.deleteMany.mock.callCount(), 0);
});

test('sale price and selected options are frozen in GHN valuation and order items', async () => {
  const quote = mock.fn(async () => ({ fee }));
  const f = checkoutFixture(quote);
  const item = f.cart.items[0];
  item.product.salePrice = 70000;
  item.product.options = [{ name: 'Color', values: ['Black'] }];
  item.selections = { Color: 'Black' };
  const result = await f.service.checkout('buyer', { shippingAddress: recipient });
  assert.equal(result.orders[0].subtotal, 70000);
  const data = f.tx.order.create.mock.calls[0].arguments[0].data.items.create[0];
  assert.equal(data.unitPrice, 70000);
  assert.deepEqual(data.selections, { Color: 'Black' });
  assert.equal(quote.mock.calls[0].arguments[2][0].price, 70000);
  assert.match(quote.mock.calls[0].arguments[2][0].name, /Black/);
});

test('product quote ignores client weights and works without GPS or distance tariffs', async () => {
  const { service: shipping, prisma } = quoteFixture();
  prisma.product = {
    findMany: async () => [
      {
        id: 'p1',
        sellerId: 'seller-1',
        title: 'Item',
        basePrice: 100000,
        weightGrams: 700,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
      },
    ],
  };
  const routing = {
    getRoadDistanceAndDuration: mock.fn(async () => {
      throw new Error('Must not call without GPS');
    }),
  };
  const service = new FulfillmentService(prisma, routing, shipping);
  const result = await service.calculateShippingQuote('buyer', {
    sellerId: 'seller-1',
    toDistrictId: 2,
    toWardCode: '02',
    items: [{ productId: 'p1', quantity: 2, weightGrams: 1 }],
  });
  assert.equal(result.rates.finalShippingFee, 31789);
  assert.equal(result.feeSource, 'GHN_API');
  assert.equal(result.parcel.weightGrams, 1400);
  assert.equal(result.metrics.distanceKm, null);
  assert.equal(routing.getRoadDistanceAndDuration.mock.callCount(), 0);
});

test('shipping quote rejects another user address', async () => {
  const prisma = { userAddress: { findUnique: async () => ({ userId: 'someone-else' }) } };
  const service = new FulfillmentService(prisma, {}, {});
  await assert.rejects(
    service.calculateShippingQuote('buyer', { addressId: 'private-address', items: [] }),
    (err) => err.getStatus() === 403,
  );
});

test('checkout quote does not create orders or change the cart', async () => {
  const { service, tx, prisma } = checkoutFixture(async () => ({ fee }));
  const result = await service.checkout('buyer', { shippingAddress: recipient }, undefined, true);
  assert.equal(result.quotes.length, 2);
  assert.equal(result.totalShippingFee, fee.total * 2);
  assert.equal(prisma.$transaction.mock.callCount(), 0);
  assert.equal(tx.cartItem.deleteMany.mock.callCount(), 0);
});

test('foreign addresses and phone numbers are rejected before quoting', async () => {
  const { service, ghn } = quoteFixture();
  await assert.rejects(
    service.quote('seller-1', { ...recipient, country: 'US' }, [item]),
    (error) => error.getStatus() === 400,
  );
  await assert.rejects(
    service.quote('seller-1', { ...recipient, phone: '+12025550123' }, [item]),
    (error) => error.getStatus() === 400,
  );
  assert.equal(ghn.calculateFee.mock.callCount(), 0);
});
