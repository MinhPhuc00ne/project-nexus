import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test, mock } from './helpers/vitest-node-compat.mjs';
import tsNode from 'ts-node';
import { BadRequestException } from '@nestjs/common';
tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { Prisma } = load('@prisma/client');
const { SellerPickupService } = load(
  '../src/modules/fulfillment/services/seller-pickup.service.ts',
);
const { GhnShippingService } = load('../src/modules/fulfillment/services/ghn-shipping.service.ts');
const { GhnLogisticsService } = load(
  '../src/modules/fulfillment/services/ghn-logistics.service.ts',
);
const { GhnShopApiService } = load('../src/modules/fulfillment/services/ghn-shop-api.service.ts');
const { GhnOrderApiService } = load('../src/modules/fulfillment/services/ghn-order-api.service.ts');
const { GhnWebhookController } = load(
  '../src/modules/fulfillment/controllers/ghn-webhook.controller.ts',
);

const config = {
  get: (key) =>
    ({ GHN_TOKEN: 'test-token', GHN_API_URL: 'https://ghn.test/v2', GHN_SHOP_ID: '999' })[key],
};
const dto = {
  name: 'Shop A',
  phone: '0901234567',
  city: 'TP. Hồ Chí Minh',
  district: 'Quận 1',
  ward: 'Bến Nghé',
  street: '12 Nguyễn Huệ',
};
const parcelItem = {
  name: 'Item',
  quantity: 1,
  weight: 500,
  length: 10,
  width: 10,
  height: 10,
  price: 100000,
};

function fixture() {
  const point = {
    id: 'pickup-a',
    sellerId: 'seller-a',
    environment: 'PRODUCTION',
    ...dto,
    districtId: 1,
    wardCode: '01',
    status: 'PENDING',
    version: 1,
    ghnShopId: null,
  };
  const shop = {
    id: 101,
    clientId: 7,
    name: 'Canonical Shop A',
    phone: '0901234567',
    address: '12 Nguyen Hue, Ben Nghe, Quan 1, Ho Chi Minh',
    districtId: 1,
    wardCode: '01',
    active: true,
  };
  const profile = { ...dto };
  const prisma = {
    $queryRaw: async () => [],
    user: { findUnique: async () => ({ role: 'SELLER' }) },
    sellerGhnAccount: {
      findUnique: mock.fn(async () => point),
      findUniqueOrThrow: async () => point,
      findMany: async () => [],
      update: mock.fn(async ({ data }) => {
        Object.assign(point, data);
        return point;
      }),
      upsert: mock.fn(async ({ update }) => {
        Object.assign(point, { ...update, version: point.version + 1 });
        return point;
      }),
      updateMany: mock.fn(async ({ where, data }) => {
        if (where.version !== point.version) return { count: 0 };
        Object.assign(point, { ...data, version: point.version + 1 });
        return { count: 1 };
      }),
    },
  };
  prisma.$transaction = async (run) => run(prisma);
  const logistics = {
    resolveDistrictAndWard: mock.fn(async () => ({ districtId: 1, wardCode: '01' })),
  };
  const shops = {
    find: mock.fn(async () => shop),
    ensure: mock.fn(async (input) => ({ ...shop, address: input.address })),
  };
  return {
    service: new SellerPickupService(prisma, config, logistics, shops, {
      read: async () => profile,
    }),
    prisma,
    profile,
    point,
    shop,
    shops,
  };
}

test('seller saves a ready GHN point without an admin reviewer', async () => {
  const f = fixture();
  const point = await f.service.propose('seller-a', dto);
  assert.equal(point.status, 'VERIFIED');
  assert.equal(point.ghnShopId, 101);
  assert.equal(point.verifiedBy, null);
  assert.equal((await f.service.requireVerified('seller-a')).ghnShopId, 101);
  assert.equal(f.shops.ensure.mock.callCount(), 1);
});

test('saving the same verified address reuses the binding', async () => {
  const f = fixture();
  await f.service.propose('seller-a', dto);
  Object.assign(f.profile, { latitude: 10, longitude: 106 });
  const current = await f.service.synchronize('seller-a');
  assert.equal(f.shops.ensure.mock.callCount(), 1);
  assert.equal(current.latitude, 10);
});

test('changing pickup address automatically establishes a new GHN binding', async () => {
  const f = fixture();
  await f.service.propose('seller-a', dto);
  f.shops.ensure.mock.mockImplementation(async (input) => ({
    ...f.shop,
    id: 202,
    address: input.address,
  }));
  f.profile.street = '15' + dto.street.slice(2);
  const point = await f.service.propose('seller-a', { ...dto, street: '15 Nguyễn Huệ' });
  assert.equal(point.status, 'VERIFIED');
  assert.equal(point.ghnShopId, 202);
  assert.ok(point.carrierAddress.startsWith('15 Nguyễn Huệ'));
});

test('GHN failure does not overwrite the previous address or binding', async () => {
  const f = fixture();
  await f.service.propose('seller-a', dto);
  f.profile.street = '15' + dto.street.slice(2);
  f.shops.ensure.mock.mockImplementation(async () => {
    throw new Error('GHN unavailable');
  });
  await assert.rejects(
    f.service.propose('seller-a', { ...dto, street: '15 Nguyễn Huệ' }),
    /GHN unavailable/,
  );
  assert.equal(f.point.street, dto.street);
  assert.equal(f.point.ghnShopId, 101);
});

test('admin verification saves canonical GHN address and reviewer', async () => {
  const f = fixture();
  const point = await f.service.verify('pickup-a', 101, 'admin');
  assert.equal(point.status, 'VERIFIED');
  assert.equal(point.ghnShopId, 101);
  assert.equal(point.carrierAddress, f.shop.address);
  assert.equal(point.verifiedBy, 'admin');
  assert.equal(point.version, 2);
});

for (const [label, change] of [
  ['inactive shop', { active: false }],
  ['different district', { districtId: 2 }],
  ['different ward', { wardCode: '02' }],
  ['different phone', { phone: '0907654321' }],
  ['different street', { address: '112 Nguyen Hue, Ben Nghe, Quan 1' }],
]) {
  test(`verification rejects ${label}`, async () => {
    const f = fixture();
    Object.assign(f.shop, change);
    await assert.rejects(
      f.service.verify('pickup-a', 101, 'admin'),
      (error) => error.getStatus() === 400,
    );
    assert.equal(f.prisma.sellerGhnAccount.updateMany.mock.callCount(), 0);
  });
}

test('a concurrent seller edit prevents verification of the previous address', async () => {
  const f = fixture();
  f.shops.find = async () => {
    f.point.version++;
    return f.shop;
  };
  // Real Prisma returns a detached read, not a mutable reference to a row.
  f.prisma.sellerGhnAccount.findUnique = async () => ({ ...f.point });
  await assert.rejects(
    f.service.verify('pickup-a', 101, 'admin'),
    (error) => error.getStatus() === 409,
  );
  assert.equal(f.point.ghnShopId, null);
});

test('a GHN shop already assigned to another seller fails with a clear conflict', async () => {
  const f = fixture();
  f.prisma.sellerGhnAccount.updateMany = async () => {
    throw new Prisma.PrismaClientKnownRequestError('duplicate binding', {
      code: 'P2002',
      clientVersion: '7.10.0',
    });
  };
  await assert.rejects(
    f.service.verify('pickup-a', 101, 'admin'),
    (error) => error.getStatus() === 409,
  );
});

function origin(shopId = 101) {
  return {
    id: `point-${shopId}`,
    environment: 'PRODUCTION',
    ghnShopId: shopId,
    districtId: shopId,
    wardCode: String(shopId),
    city: 'City',
    district: 'District',
    ward: 'Ward',
    name: 'Shop',
    phone: '0901234567',
    carrierPhone: '0901234567',
    carrierAddress: `Address ${shopId}`,
  };
}

function shippingFixture() {
  const points = {
    environment: () => 'PRODUCTION',
    requireVerified: mock.fn(async (sellerId) => origin(sellerId === 'seller-a' ? 101 : 202)),
  };
  const ghn = {
    resolveDistrictAndWard: async () => ({ districtId: 3, wardCode: '03' }),
    getAvailableServices: mock.fn(async () => [{ serviceId: 1, serviceTypeId: 2 }]),
    calculateFee: mock.fn(async (request) => ({
      total: request.shopId,
      serviceFee: request.shopId,
    })),
  };
  return { service: new GhnShippingService(points, ghn), points, ghn };
}

test('nationwide sellers quote from their own verified pickup points', async () => {
  const f = shippingFixture();
  const [a, b] = await Promise.all(
    ['seller-a', 'seller-b'].map((id) =>
      f.service.quote(id, {}, [parcelItem], { toDistrictId: 3, toWardCode: '03' }),
    ),
  );
  assert.equal(a.request.shopId, 101);
  assert.equal(a.request.fromDistrictId, 101);
  assert.equal(b.request.shopId, 202);
  assert.equal(b.request.fromDistrictId, 202);
  assert.deepEqual(
    f.ghn.getAvailableServices.mock.calls.map((call) => call.arguments[2]).sort(),
    [101, 202],
  );
});

test('seller pickup cannot be replaced by client-supplied origin codes', async () => {
  const f = shippingFixture();
  await assert.rejects(
    f.service.quote('seller-a', {}, [parcelItem], {
      fromDistrictId: 999,
      fromWardCode: '999',
      toDistrictId: 3,
      toWardCode: '03',
    }),
    (error) => error.getStatus() === 400,
  );
  assert.equal(f.ghn.calculateFee.mock.callCount(), 0);
});

test('existing order uses frozen pickup after seller changes locations', async () => {
  const f = shippingFixture();
  const first = await f.service.quote('seller-a', {}, [parcelItem], {
    toDistrictId: 3,
    toWardCode: '03',
  });
  f.points.requireVerified = async () => {
    throw new BadRequestException('New location awaits verification');
  };
  const frozen = await f.service.quote('seller-a', {}, [parcelItem], {
    originAddress: first.origin,
    fromDistrictId: 101,
    fromWardCode: '101',
    toDistrictId: 3,
    toWardCode: '03',
  });
  assert.equal(frozen.request.shopId, 101);
  assert.equal(frozen.origin.street, 'Address 101');
});

test('unverified seller does not fall back to the global GHN shop', async () => {
  const f = shippingFixture();
  f.points.requireVerified = async () => {
    throw new BadRequestException('Not verified');
  };
  await assert.rejects(f.service.quote('seller-a', {}, [parcelItem]));
  assert.equal(f.ghn.calculateFee.mock.callCount(), 0);
});

test('sandbox pickup snapshots cannot be dispatched against production', async () => {
  const f = shippingFixture();
  await assert.rejects(
    f.service.quote('seller-a', {}, [parcelItem], {
      originAddress: {
        pickupPointId: 'p1',
        ghnShopId: 101,
        ghnEnvironment: 'SANDBOX',
        districtId: 101,
        wardCode: '101',
      },
    }),
    (error) => error.getStatus() === 400,
  );
  assert.equal(f.ghn.getAvailableServices.mock.callCount(), 0);
});

test('concurrent GHN requests use isolated shop headers, never a mutable global shop', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify({ code: 200, data: { total: 100, service_fee: 100 } })),
  );
  const service = new GhnLogisticsService(config);
  await Promise.all(
    [101, 202].map((shopId) =>
      service.calculateFee({ shopId, toDistrictId: 3, toWardCode: '03', weightGrams: 500 }),
    ),
  );
  assert.deepEqual(fetch.mock.calls.map((call) => call.arguments[1].headers.ShopId).sort(), [
    '101',
    '202',
  ]);
});

test('tracking uses the shipment shop instead of the configured global shop', async (t) => {
  const fetch = t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: { order_code: 'G1', client_order_code: 'NX-o1', status: 'picked', shop_id: 202 },
        }),
      ),
  );
  await new GhnOrderApiService(config).detail('G1', 202, 'PRODUCTION');
  assert.equal(fetch.mock.calls[0].arguments[1].headers.ShopId, '202');
});

test('webhook accepts each shipment own shop and rejects a cross-seller callback', async () => {
  const tracking = { refresh: mock.fn(async () => ({})) };
  const prisma = {
    shipment: {
      findFirst: async () => ({
        orderId: 'o2',
        metadata: { ghnShopId: 202, ghnEnvironment: 'PRODUCTION' },
      }),
    },
  };
  const controller = new GhnWebhookController(
    { get: (key) => (key === 'GHN_WEBHOOK_SECRET' ? 'secret' : config.get(key)) },
    prisma,
    tracking,
    { isShippingSandbox: () => true },
  );
  await controller.receive('secret', { ShopID: 202, OrderCode: 'G2' });
  await assert.rejects(
    controller.receive('secret', { ShopID: 101, OrderCode: 'G2' }),
    (error) => error.getStatus() === 401,
  );
  assert.equal(tracking.refresh.mock.callCount(), 1);
});

test('GHN shop lookup follows provider cursors and verifies token account membership', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    const id = calls.length === 1 ? 101 : 202;
    return new Response(
      JSON.stringify({
        code: 200,
        data: {
          last_offset: id,
          shops: [
            {
              _id: id,
              client_id: 7,
              name: 'Shop',
              phone: '0901234567',
              address: 'Address',
              district_id: id,
              ward_code: String(id),
              status: 1,
            },
          ],
        },
      }),
    );
  });
  assert.equal((await new GhnShopApiService(config).find(202)).id, 202);
  assert.ok(calls[1].url.includes('offset=101'));
  assert.equal(calls[0].options.headers.Token, 'test-token');
});

test('GHN shop list handles null shops and ignores incomplete shops without failing', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            last_offset: 100,
            shops: [
              {
                _id: 1,
                client_id: 1,
                district_id: 1,
                name: '',
                phone: '',
                address: '',
                ward_code: '',
              },
              {
                _id: 2,
                client_id: 1,
                district_id: 1,
                name: 'Valid Shop',
                phone: '0901234567',
                address: '123 Str',
                ward_code: 'W1',
                status: 1,
              },
            ],
          },
        }),
      ),
  );
  const result = await new GhnShopApiService(config).list(0, 100);
  assert.equal(result.shops.length, 1);
  assert.equal(result.shops[0].id, 2);

  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        JSON.stringify({
          code: 200,
          data: {
            last_offset: 0,
            shops: null,
          },
        }),
      ),
  );
  const emptyResult = await new GhnShopApiService(config).list(100, 100);
  assert.deepEqual(emptyResult.shops, []);
});

test('automatic setup recovers a matching shop without registering again', async () => {
  const service = new GhnShopApiService(config);
  const shop = fixture().shop;
  service.list = async () => ({ shops: [shop], nextOffset: 101 });
  const found = await service.ensure(
    {
      name: shop.name,
      phone: '+84901234567',
      address: shop.address,
      districtId: shop.districtId,
      wardCode: shop.wardCode,
    },
    [],
  );
  assert.equal(found.id, shop.id);
});

test('automatic registration uses platform credentials and verifies the returned shop', async (t) => {
  const service = new GhnShopApiService(config);
  const shop = fixture().shop;
  service.list = async () => ({ shops: [], nextOffset: 0 });
  service.find = async (id) => {
    assert.equal(id, shop.id);
    return shop;
  };
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://ghn.test/v2/shop/register');
    assert.equal(options.headers.Token, 'test-token');
    assert.equal(options.headers.ShopId, '999');
    assert.deepEqual(JSON.parse(options.body), {
      name: shop.name,
      phone: shop.phone,
      address: shop.address,
      district_id: shop.districtId,
      ward_code: shop.wardCode,
    });
    return new Response(JSON.stringify({ code: 200, data: { shop_id: shop.id } }));
  });
  assert.equal(
    (
      await service.ensure(
        {
          name: shop.name,
          phone: shop.phone,
          address: shop.address,
          districtId: shop.districtId,
          wardCode: shop.wardCode,
        },
        [],
      )
    ).id,
    shop.id,
  );
  assert.equal(fetch.mock.callCount(), 1);
});

test('a shop assigned to another seller is never reused', async (t) => {
  const service = new GhnShopApiService(config);
  const shop = fixture().shop;
  service.list = async (offset) => ({ shops: offset ? [] : [shop], nextOffset: 101 });
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('registration unavailable');
  });
  await assert.rejects(
    service.ensure(
      {
        name: shop.name,
        phone: shop.phone,
        address: shop.address,
        districtId: shop.districtId,
        wardCode: shop.wardCode,
      },
      [shop.id],
    ),
    (error) => error.getStatus() === 502,
  );
});

test('malformed GHN registration response cannot produce a ready pickup', async (t) => {
  const service = new GhnShopApiService(config);
  service.list = async () => ({ shops: [], nextOffset: 0 });
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(JSON.stringify({ code: 200, data: { shop_id: '' } })),
  );
  await assert.rejects(
    service.ensure(
      { name: dto.name, phone: dto.phone, address: dto.street, districtId: 1, wardCode: '01' },
      [],
    ),
    (error) => error.getStatus() === 502,
  );
});

test('legacy pickup endpoint cannot set an address different from the shop profile', async () => {
  const f = fixture();
  await assert.rejects(
    f.service.propose('seller-a', { ...dto, street: 'Other address' }),
    (error) => error.getStatus() === 400,
  );
  assert.equal(f.shops.ensure.mock.callCount(), 0);
});

test('shipping automatically binds the current profile without a separate pickup save', async () => {
  const f = fixture();
  f.profile.street = 'New profile address';
  const point = await f.service.requireVerified('seller-a');
  assert.equal(point.street, f.profile.street);
  assert.ok(point.carrierAddress.startsWith(f.profile.street));
});

test('new shipping fails closed when the profile changed and GHN is unavailable', async () => {
  const f = fixture();
  await f.service.synchronize('seller-a');
  f.profile.street = 'New profile address';
  f.shops.ensure.mock.mockImplementation(async () => {
    throw new Error('GHN unavailable');
  });
  await assert.rejects(f.service.requireVerified('seller-a'), /GHN unavailable/);
});

test('admin cannot verify a pickup address that differs from the current profile', async () => {
  const f = fixture();
  f.profile.street = 'New profile address';
  await assert.rejects(
    f.service.verify('pickup-a', 101, 'admin'),
    (error) => error.getStatus() === 400,
  );
  assert.equal(f.prisma.sellerGhnAccount.updateMany.mock.callCount(), 0);
});

test('a profile change during GHN lookup cannot verify the old address', async () => {
  const f = fixture();
  f.shops.find = async () => {
    f.profile.street = 'Changed during verification';
    return f.shop;
  };
  await assert.rejects(
    f.service.verify('pickup-a', 101, 'admin'),
    (error) => error.getStatus() === 409,
  );
  assert.equal(f.prisma.sellerGhnAccount.updateMany.mock.callCount(), 0);
});

test('pickup persistence stores carrier metadata without copying the shop address', async () => {
  const f = fixture();
  await f.service.synchronize('seller-a');
  const data = f.prisma.sellerGhnAccount.update.mock.calls[0].arguments[0].data;
  for (const key of [
    'name',
    'phone',
    'street',
    'city',
    'district',
    'ward',
    'latitude',
    'longitude',
  ])
    assert.equal(Object.hasOwn(data, key), false, key);
  assert.match(data.profileFingerprint, /^[a-f0-9]{64}$/);
});

test('profile invalidation affects both environments in the profile transaction', async () => {
  const f = fixture();
  let mutation;
  await f.service.invalidate(
    {
      sellerGhnAccount: {
        updateMany: async (input) => {
          mutation = input;
          return { count: 2 };
        },
      },
    },
    'seller-a',
  );
  assert.deepEqual(mutation.where, { sellerId: 'seller-a' });
  assert.equal(mutation.data.status, 'PENDING');
  assert.equal(mutation.data.verifiedAt, null);
  assert.deepEqual(mutation.data.version, { increment: 1 });
});

const { ShopShippingProfileService } = load(
  '../src/modules/fulfillment/services/shop-shipping-profile.service.ts',
);

test('shipping source uses the approved shop profile ahead of personal addresses', async () => {
  const service = new ShopShippingProfileService({
    user: {
      findUnique: async () => ({
        role: 'SELLER',
        fullName: 'Personal name',
        phoneNumber: '0999999999',
        sellerUpgradeRequests: [{ ...dto, storeName: dto.name, latitude: 0, longitude: 0 }],
        addresses: [{ ...dto, street: 'Personal address' }],
      }),
    },
  });
  const profile = await service.read('seller-a');
  assert.equal(profile.street, dto.street);
  assert.equal(profile.name, dto.name);
  assert.equal(profile.latitude, 0);
});

test('an incomplete approved shop profile cannot silently use a personal address', async () => {
  const service = new ShopShippingProfileService({
    user: {
      findUnique: async () => ({
        role: 'SELLER',
        fullName: 'Personal name',
        sellerUpgradeRequests: [{ ...dto, street: null }],
        addresses: [dto],
      }),
    },
  });
  await assert.rejects(service.read('seller-a'), (error) => error.getStatus() === 400);
});
