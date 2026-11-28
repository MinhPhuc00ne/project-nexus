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
const { AdminShopsService } = load('../src/modules/admin/services/admin-shops.service.ts');
const { AdminProductsService } = load('../src/modules/admin/services/admin-products.service.ts');
const { CartService } = load('../src/modules/cart/services/cart.service.ts');
const { RecommendationsService } = load(
  '../src/modules/catalog/services/recommendations.service.ts',
);
const { AdminShopsModerationHelper } = load(
  '../src/modules/admin/services/admin-shops-moderation.helper.ts',
);

test('restoring shop restores only products hidden by suspension and warning targets seller', async () => {
  const seller = {
    id: 'seller',
    role: 'SELLER',
    fullName: 'Shop',
    sellerUpgradeRequests: [],
    reputationScore: 100,
  };
  const changes = [];
  const notifications = [];
  const tx = {
    $queryRaw: async () => [],
    user: { update: async ({ data }) => ({ ...seller, ...data }) },
    product: { updateMany: async (args) => changes.push(args) },
    shopActionLog: { create: async ({ data }) => ({ id: 'log', ...data }) },
    notification: { create: async ({ data }) => notifications.push(data) },
  };
  const prismaDouble = {
    user: { findUnique: async () => seller },
    $transaction: (fn) => fn(tx),
  };
  const service = new AdminShopsService(
    prismaDouble,
    new AdminShopsModerationHelper(prismaDouble, { adjustScore: async () => ({}) }),
  );
  await service.updateShopStatus('seller', 'admin', { isSellerActive: false });
  await service.updateShopStatus('seller', 'admin', { isSellerActive: true });
  assert.equal(changes[0].where.status, 'ACTIVE');
  assert.equal(changes[0].data.hiddenByShopSuspension, true);
  assert.equal(changes[1].where.hiddenByShopSuspension, true);
  await service.warnShop('seller', 'admin', { reason: 'Wrong description' });
  assert.equal(notifications[2].userId, 'seller');
  assert.match(notifications[2].content, /Wrong description/);
});

test('admin cannot activate product when fresh locked seller is suspended', async () => {
  const tx = {
    $queryRaw: async () => [],
    user: { findUnique: async () => ({ isShopSuspended: true }) },
    product: { update: mock.fn() },
  };
  const service = new AdminProductsService({
    product: {
      findUnique: async () => ({ id: 'p', sellerId: 'seller', seller: { isShopSuspended: false } }),
    },
    $transaction: (fn) => fn(tx),
  });
  await assert.rejects(
    service.updateProductStatus('p', 'admin', { status: 'ACTIVE' }),
    /suspended/i,
  );
  assert.equal(tx.product.update.mock.callCount(), 0);
});

test('cart checks shared stock across different choices of the same product', async () => {
  const tx = {
    $queryRaw: async () => [],
    cart: { upsert: async () => ({ id: 'cart' }) },
    product: {
      findUnique: async () => ({
        id: 'p',
        sellerId: 'seller',
        status: 'ACTIVE',
        basePrice: 10000,
        options: [{ name: 'Color', values: ['Black', 'White'] }],
        inventories: [{ availableQty: 5 }],
        seller: { isShopSuspended: false },
      }),
    },
    cartItem: { aggregate: async () => ({ _sum: { quantity: 4 } }), upsert: mock.fn() },
  };
  const service = new CartService({ $transaction: (fn) => fn(tx) });
  await assert.rejects(
    service.addToCart('buyer', { productId: 'p', quantity: 2, selections: { Color: 'White' } }),
    /stock/i,
  );
  assert.equal(tx.cartItem.upsert.mock.callCount(), 0);
});

test('recommendation history is user-scoped and candidate queries exclude own/suspended shops', async () => {
  const requests = [];
  const prisma = {
    cartItem: {
      findMany: async (args) => {
        assert.equal(args.where.cart.userId, 'buyer');
        return [{ product: { categoryId: 'category' } }];
      },
    },
    orderItem: {
      findMany: async (args) => {
        assert.equal(args.where.order.buyerId, 'buyer');
        assert.equal(args.where.order.status, 'CONFIRMED');
        return [];
      },
    },
    product: {
      findMany: async (args) => {
        requests.push(args);
        return [];
      },
    },
  };
  const result = await new RecommendationsService(prisma).get('buyer', { limit: 10 });
  assert.equal(result.personalized, true);
  assert.equal(requests[0].where.categoryId.in[0], 'category');
  for (const args of requests) {
    assert.equal(args.where.sellerId.not, 'buyer');
    assert.equal(args.where.seller.isShopSuspended, false);
    assert.equal(args.where.status, 'ACTIVE');
    assert.ok(args.take <= 100);
  }
});

test('admin can reassign product category, validates existence, and notifies seller only on change', async () => {
  const notifications = [];
  let productRecord = {
    id: 'prod-1',
    title: 'Đồng hồ cổ',
    sellerId: 'seller-1',
    categoryId: 'cat-old',
    category: { id: 'cat-old', name: 'Chưa phân loại', slug: 'uncategorized' },
  };
  const categories = new Map([
    ['cat-old', { id: 'cat-old', name: 'Chưa phân loại', slug: 'uncategorized', level: 1 }],
    ['cat-new', { id: 'cat-new', name: 'Đồng hồ sưu tầm', slug: 'dong-ho', level: 2 }],
  ]);
  const tx = {
    product: {
      update: mock.fn(async ({ data }) => ({
        id: productRecord.id,
        title: productRecord.title,
        categoryId: data.categoryId,
        category: categories.get(data.categoryId) ?? null,
      })),
    },
    notification: { create: async ({ data }) => notifications.push(data) },
  };
  const service = new AdminProductsService({
    product: {
      findUnique: async ({ where }) => (productRecord?.id === where.id ? productRecord : null),
    },
    category: { findUnique: async ({ where }) => categories.get(where.id) ?? null },
    $transaction: (fn) => fn(tx),
  });

  const unchanged = await service.updateProductCategory('prod-1', 'admin-1', {
    categoryId: 'cat-old',
  });
  assert.equal(unchanged.success, true);
  assert.equal(tx.product.update.mock.callCount(), 0);
  assert.equal(notifications.length, 0);

  const updated = await service.updateProductCategory('prod-1', 'admin-1', {
    categoryId: 'cat-new',
    reason: 'Phân loại vào danh mục mới',
  });
  assert.equal(updated.success, true);
  assert.equal(updated.product.categoryId, 'cat-new');
  assert.equal(tx.product.update.mock.callCount(), 1);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].userId, 'seller-1');
  assert.match(notifications[0].content, /Đồng hồ sưu tầm/);

  await assert.rejects(
    service.updateProductCategory('prod-1', 'admin-1', { categoryId: 'missing-cat' }),
    /category/i,
  );

  productRecord = null;
  await assert.rejects(
    service.updateProductCategory('missing-prod', 'admin-1', { categoryId: 'cat-new' }),
    /product/i,
  );
});
