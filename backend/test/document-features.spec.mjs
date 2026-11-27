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
const { effectivePrice } = load('../src/core/domain/product-price.ts');
const { normalizeOptions, validateSelections } = load('../src/core/domain/product-options.ts');
const { GhnLogisticsService } = load(
  '../src/modules/fulfillment/services/ghn-logistics.service.ts',
);
const { ReviewsService } = load('../src/modules/reviews/services/reviews.service.ts');
const { ReportsService } = load('../src/modules/reviews/services/reports.service.ts');
const { AdminReviewsController } = load(
  '../src/modules/admin/controllers/admin-reviews.controller.ts',
);
const { ROLES_KEY } = load('../src/core/security/roles.decorator.ts');
const { BannerService } = load('../src/modules/catalog/services/banner.service.ts');
const { ReviewsModerationHelper } = load(
  '../src/modules/reviews/services/reviews-moderation.helper.ts',
);
const { ReviewsRepliesHelper } = load('../src/modules/reviews/services/reviews-replies.helper.ts');

test('sale boundaries use one effective price and never replace base price', () => {
  const product = {
    basePrice: 100000,
    salePrice: 70000,
    saleStartsAt: new Date('2026-10-01'),
    saleEndsAt: new Date('2026-11-01'),
  };
  assert.equal(effectivePrice(product, new Date('2026-09-30')), 100000);
  assert.equal(effectivePrice(product, product.saleStartsAt), 70000);
  assert.equal(effectivePrice(product, product.saleEndsAt), 100000);
  assert.equal(product.basePrice, 100000);
});

test('choices are canonical and reject missing, unknown or invalid variants', () => {
  const options = normalizeOptions([
    { name: ' Color ', values: ['Black', 'White'] },
    { name: 'Size', values: ['M', 'L'] },
  ]);
  const first = validateSelections(options, { Color: 'Black', Size: 'M' });
  const second = validateSelections(options, { Size: 'M', Color: 'Black' });
  assert.equal(first.optionKey, second.optionKey);
  assert.notEqual(
    first.optionKey,
    validateSelections(options, { Color: 'White', Size: 'M' }).optionKey,
  );
  assert.throws(() => validateSelections(options, {}));
  assert.throws(() => validateSelections(options, { Color: 'Blue', Size: 'M' }));
  assert.throws(() => validateSelections(options, { Color: 'Black', Size: 'M', price: '1' }));
  assert.throws(() => normalizeOptions([{ name: '__proto__', values: ['x'] }]));
});

test('GHN 200 with missing/malformed master data is a gateway error; valid empty wards is allowed', async (t) => {
  let payload = { code: 200 };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url);
    return { ok: true, json: async () => payload };
  });
  const ghn = new GhnLogisticsService({
    get: (key) =>
      ({
        GHN_TOKEN: 'secret',
        GHN_SHOP_ID: '1',
        GHN_API_URL: 'https://example.test/shiip/public-api/v2/',
      })[key],
  });
  await assert.rejects(ghn.getProvinces(), (error) => error.getStatus() === 502);
  payload = { code: 200, data: null };
  await assert.rejects(ghn.getDistricts(1), (error) => error.getStatus() === 502);
  payload = { code: 200, data: [{ WardCode: null, WardName: 'Invalid' }] };
  await assert.rejects(ghn.getWards(1), (error) => error.getStatus() === 502);
  payload = { code: 200, data: [] };
  assert.deepEqual(await ghn.getWards(1), []);
  const diagnostic = await ghn.getDiagnostic();
  assert.equal(diagnostic.ping.status, 'GHN_API_ERROR');
  assert.equal(diagnostic.tokenMasked, '********');
  assert.ok(calls[0].endsWith('/public-api/master-data/province'));
  await assert.rejects(ghn.getDistricts(1.5), (error) => error.getStatus() === 400);
});

test('review creation requires ownership, completion and purchased product, and updates rating atomically', async () => {
  let order = null;
  const tx = {
    $queryRaw: async () => [],
    order: { findFirst: async () => order },
    productReview: { create: mock.fn(async ({ data }) => data) },
    reputationLog: { findFirst: async () => null },
    product: { update: mock.fn(async () => ({ ratingSum: 9, reviewCount: 2 })) },
  };
  const prismaDouble = { $transaction: (fn) => fn(tx) };
  const service = new ReviewsService(
    prismaDouble,
    { adjustScore: mock.fn(async () => ({})) },
    new ReviewsModerationHelper(prismaDouble, { adjustScore: mock.fn(async () => ({})) }),
    new ReviewsRepliesHelper(prismaDouble, undefined),
  );
  await assert.rejects(
    service.create('buyer', 'order', { rating: 5 }, 'product', 'p1'),
    /đơn hàng/,
  );
  order = {
    id: 'order',
    status: 'DELIVERED',
    buyerId: 'buyer',
    sellerId: 'seller',
    items: [{ productId: 'p1' }],
  };
  await assert.rejects(
    service.create('buyer', 'order', { rating: 5 }, 'product', 'p1'),
    /hoàn tất/,
  );
  order.status = 'CONFIRMED';
  await assert.rejects(
    service.create('buyer', 'order', { rating: 5 }, 'product', 'other'),
    /không thuộc/,
  );
  await service.create('buyer', 'order', { rating: 5 }, 'product', 'p1');
  assert.equal(tx.productReview.create.mock.callCount(), 1);
  assert.equal(tx.product.update.mock.calls[1].arguments[0].data.averageRating, 4.5);
});

test('report shop ownership is resolved server-side; self reports and duplicate pending reports are blocked', async () => {
  let pending = null;
  const tx = {
    $queryRaw: async () => [],
    product: { findFirst: async () => ({ id: 'p', sellerId: 'seller' }) },
    user: { findFirst: async () => ({ id: 'seller' }) },
    shopViolation: {
      findFirst: async () => pending,
      create: async ({ data }) => data,
    },
  };
  const service = new ReportsService({ $transaction: (fn) => fn(tx) });
  const dto = { title: 'Wrong item', description: 'Counterfeit goods reported', shopId: 'spoofed' };
  const report = await service.create('buyer', 'p', 'product', dto);
  assert.equal(report.shopId, 'seller');
  assert.equal(report.reporterId, 'buyer');
  await assert.rejects(service.create('seller', 'p', 'product', dto), /chính mình/);
  pending = { id: 'report' };
  await assert.rejects(
    service.create('buyer', 'p', 'product', dto),
    (error) => error.getStatus() === 409,
  );
});

test('public banners filter active time windows and invalid intervals never write', async () => {
  let filter;
  let created = false;
  const service = new BannerService({
    eventBanner: {
      findMany: async (args) => {
        filter = args;
        return [];
      },
      create: async () => {
        created = true;
      },
    },
  });
  await service.list(true);
  assert.equal(filter.where.isActive, true);
  assert.equal(filter.where.AND.length, 2);
  assert.equal(filter.select.creator, undefined);
  assert.equal(filter.select.creatorId, undefined);
  await service.list(false);
  assert.deepEqual(filter.select.creator.select, { id: true, fullName: true, role: true });
  assert.equal(filter.select.creatorId, true);
  await assert.rejects(
    service.save('staff', {
      title: 'Event',
      imageUrl: 'https://example.test/banner.png',
      startsAt: '2026-11-02',
      endsAt: '2026-11-01',
    }),
    /kết thúc/,
  );
  assert.equal(created, false);
});

test('support staff and admin can moderate reviews with valid reputation penalty and notification', async () => {
  for (const method of ['adminListReviews', 'adminDeleteProductReview', 'adminDeleteShopReview']) {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminReviewsController.prototype[method]);
    assert.ok(roles.includes('ADMIN'));
    assert.ok(roles.includes('SUPPORT_STAFF'));
  }

  const notifications = [];
  const reputationCalls = [];
  const productUpdates = [];
  const deletedIds = [];
  const reviewRow = {
    id: 'rev-1',
    productId: 'prod-1',
    reviewerId: 'buyer-1',
    rating: 1,
    reviewer: { id: 'buyer-1', reputationScore: 60 },
    product: { id: 'prod-1', title: 'Tranh sơn mài', reviewCount: 2, ratingSum: 6 },
  };
  const tx = {
    productReview: {
      findUnique: async () => reviewRow,
      delete: async ({ where }) => deletedIds.push(where.id),
    },
    product: { update: async (args) => productUpdates.push(args) },
    notification: { create: async ({ data }) => notifications.push(data) },
  };
  const prismaDouble = { $transaction: (fn) => fn(tx) };
  const service = new ReviewsService(
    prismaDouble,
    { adjustScore: async (payload) => reputationCalls.push(payload) },
    new ReviewsModerationHelper(prismaDouble, {
      adjustScore: async (payload) => reputationCalls.push(payload),
    }),
    new ReviewsRepliesHelper(prismaDouble, undefined),
  );

  await assert.rejects(
    service.adminDeleteReview(
      'rev-1',
      'product',
      { reason: 'Ngôn từ thô tục', pointsToDeduct: 0 },
      'SUPPORT_STAFF',
    ),
    /lớn hơn 0/,
  );

  await assert.rejects(
    service.adminDeleteReview(
      'rev-1',
      'product',
      { reason: 'Ngôn từ thô tục', pointsToDeduct: 61 },
      'SUPPORT_STAFF',
    ),
    /tối đa 60/,
  );

  const res = await service.adminDeleteReview(
    'rev-1',
    'product',
    { reason: 'Ngôn từ thô tục, xúc phạm', pointsToDeduct: 15 },
    'SUPPORT_STAFF',
  );
  assert.equal(res.success, true);
  assert.equal(reputationCalls[0].deltaPoints, -15);
  assert.equal(reputationCalls[0].referenceId, 'STAFF_DELETE_REVIEW:rev-1');
  assert.equal(productUpdates[0].data.reviewCount, 1);
  assert.equal(productUpdates[0].data.averageRating, 5);
  assert.deepEqual(deletedIds, ['rev-1']);
  assert.match(notifications[0].content, /Nhân viên kiểm duyệt/);
  assert.match(notifications[0].content, /15 điểm uy tín/);
});
