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
const { CategoryService } = load('../src/modules/catalog/services/category.service.ts');
const { ProductTrendingService } = load(
  '../src/modules/catalog/services/product-trending.service.ts',
);
const { AdminProductsService } = load('../src/modules/admin/services/admin-products.service.ts');
const { effectivePrice, priceView } = load('../src/modules/catalog/utils/product-price.ts');

test('CategoryService builds 3-level tree and enforces max depth of 3 levels', async () => {
  const categories = [
    { id: 'c1', name: 'Electronics', slug: 'electronics', level: 1, parentId: null },
    { id: 'c2', name: 'Audio', slug: 'audio', level: 2, parentId: 'c1' },
    { id: 'c3', name: 'Headphones', slug: 'headphones', level: 3, parentId: 'c2' },
  ];

  const prisma = {
    category: {
      findMany: mock.fn(async () => categories),
      findFirst: mock.fn(async () => null),
      findUnique: mock.fn(async ({ where }) => categories.find((c) => c.id === where.id) ?? null),
      create: mock.fn(async ({ data }) => ({ id: 'c4', ...data })),
    },
  };

  const service = new CategoryService(prisma);
  const tree = await service.getCategoryTree();
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children[0].children[0].name, 'Headphones');

  await assert.rejects(
    service.createCategory({ name: 'In-Ear', parentId: 'c3' }),
    (err) => err.getStatus() === 400,
  );
});

test('effectivePrice and priceView respect active sale windows and minimum sale threshold', () => {
  const now = new Date('2026-11-22T10:00:00Z');
  const activeSale = {
    basePrice: 500000,
    salePrice: 350000,
    saleStartsAt: new Date('2026-11-22T00:00:00Z'),
    saleEndsAt: new Date('2026-11-23T00:00:00Z'),
  };
  assert.equal(effectivePrice(activeSale, now), 350000);

  const expiredSale = {
    ...activeSale,
    saleEndsAt: new Date('2026-11-22T09:00:00Z'),
  };
  assert.equal(effectivePrice(expiredSale, now), 500000);

  const invalidLowSale = {
    basePrice: 500000,
    salePrice: 500,
  };
  assert.equal(effectivePrice(invalidLowSale, now), 500000);

  const view = priceView({ basePrice: 200000, salePrice: 150000 });
  assert.equal(view.isOnSale, true);
  assert.equal(view.currentPrice, 150000);
});

test('ProductTrendingService ranks by purchaseCount then earliest reached timestamp, exposes shop metadata, and notifies #1', async () => {
  const older = new Date('2026-11-20T00:00:00Z');
  const newer = new Date('2026-11-22T00:00:00Z');
  const t1 = new Date('2026-11-22T08:00:00Z');
  const t2 = new Date('2026-11-22T09:00:00Z');
  const t3 = new Date('2026-11-22T10:00:00Z');
  const topProductId = 'p-top-sales';
  const tieFirstId = 'p-tie-reached-first';
  const products = [
    {
      id: topProductId,
      sellerId: 'seller-1',
      title: 'Đồng hồ bán chạy nhất',
      description: 'Top',
      basePrice: 1000000,
      salePrice: null,
      saleStartsAt: null,
      saleEndsAt: null,
      status: 'ACTIVE',
      hiddenByShopSuspension: false,
      trendingExcluded: false,
      trendingExcludedAt: null,
      trendingNotifiedAt: null,
      reviewCount: 15,
      averageRating: 4.8,
      threeModelKey: null,
      createdAt: older,
      images: [{ imageUrl: 'https://example.com/1.jpg' }],
      category: { id: 'c1', name: 'Phụ kiện', slug: 'phu-kien' },
      seller: {
        id: 'seller-1',
        fullName: 'Owner 1',
        avatarUrl: null,
        shopAvatarUrl: null,
        reputationScore: 95,
        trustLevel: 'TRUSTED',
        sellerUpgradeRequests: [{ storeName: 'Shop Đồng Hồ Uy Tín' }],
      },
      inventories: [{ availableQty: 5 }],
      options: [],
    },
    {
      id: 'p-tie-reached-second',
      sellerId: 'seller-2',
      title: 'Tai nghe chạm mốc sau',
      description: 'Reached later',
      basePrice: 500000,
      salePrice: null,
      saleStartsAt: null,
      saleEndsAt: null,
      status: 'ACTIVE',
      hiddenByShopSuspension: false,
      trendingExcluded: false,
      trendingExcludedAt: null,
      trendingNotifiedAt: null,
      reviewCount: 2,
      averageRating: 4.5,
      threeModelKey: null,
      createdAt: older,
      images: [{ imageUrl: 'https://example.com/2.jpg' }],
      category: { id: 'c2', name: 'Âm thanh', slug: 'am-thanh' },
      seller: {
        id: 'seller-2',
        fullName: 'Shop 2',
        avatarUrl: null,
        shopAvatarUrl: null,
        reputationScore: 78,
        trustLevel: 'STANDARD',
        sellerUpgradeRequests: [],
      },
      inventories: [{ availableQty: 4 }],
      options: [],
    },
    {
      id: tieFirstId,
      sellerId: 'seller-2',
      title: 'Bàn phím chạm mốc trước',
      description: 'Reached earlier',
      basePrice: 700000,
      salePrice: null,
      saleStartsAt: null,
      saleEndsAt: null,
      status: 'ACTIVE',
      hiddenByShopSuspension: false,
      trendingExcluded: false,
      trendingExcludedAt: null,
      trendingNotifiedAt: null,
      reviewCount: 99,
      averageRating: 5.0,
      threeModelKey: null,
      createdAt: newer,
      images: [{ imageUrl: 'https://example.com/3.jpg' }],
      category: { id: 'c3', name: 'Gaming', slug: 'gaming' },
      seller: {
        id: 'seller-2',
        fullName: 'Shop 2',
        avatarUrl: null,
        shopAvatarUrl: null,
        reputationScore: 78,
        trustLevel: 'STANDARD',
        sellerUpgradeRequests: [],
      },
      inventories: [{ availableQty: 8 }],
      options: [],
    },
  ];
  const notifications = [];
  const orderItems = [
    {
      productId: topProductId,
      quantity: 5,
      createdAt: t2,
      order: { buyerId: 'buyer-1', createdAt: t2 },
    },
    {
      productId: tieFirstId,
      quantity: 3,
      createdAt: t1,
      order: { buyerId: 'buyer-1', createdAt: t1 },
    },
    {
      productId: 'p-tie-reached-second',
      quantity: 3,
      createdAt: t3,
      order: { buyerId: 'buyer-2', createdAt: t3 },
    },
  ];

  const prisma = {
    orderItem: {
      groupBy: mock.fn(async ({ take }) => {
        const byProduct = new Map();
        for (const item of orderItems) {
          const prod = products.find((p) => p.id === item.productId);
          if (
            !prod ||
            prod.status !== 'ACTIVE' ||
            prod.hiddenByShopSuspension ||
            prod.trendingExcluded
          ) {
            continue;
          }
          const cur = byProduct.get(item.productId) ?? {
            productId: item.productId,
            qty: 0,
            maxAt: new Date(0),
          };
          cur.qty += item.quantity;
          if (item.createdAt > cur.maxAt) cur.maxAt = item.createdAt;
          byProduct.set(item.productId, cur);
        }
        return Array.from(byProduct.values())
          .sort((a, b) => b.qty - a.qty || a.maxAt.getTime() - b.maxAt.getTime())
          .slice(0, take ?? 10)
          .map((row) => ({
            productId: row.productId,
            _sum: { quantity: row.qty },
            _max: { createdAt: row.maxAt },
          }));
      }),
    },
    product: {
      findMany: mock.fn(async ({ where }) =>
        products.filter(
          (p) =>
            where.id.in.includes(p.id) &&
            p.status === where.status &&
            p.hiddenByShopSuspension === where.hiddenByShopSuspension &&
            p.trendingExcluded === where.trendingExcluded,
        ),
      ),
      findUnique: mock.fn(async ({ where }) => products.find((p) => p.id === where.id) ?? null),
      updateMany: mock.fn(async ({ where, data }) => {
        if (where.id && typeof where.id === 'object' && where.id.not) {
          let count = 0;
          for (const p of products) {
            if (p.id !== where.id.not && p.trendingNotifiedAt !== null) {
              p.trendingNotifiedAt = data.trendingNotifiedAt;
              count += 1;
            }
          }
          return { count };
        }
        const target = products.find(
          (p) =>
            p.id === where.id &&
            p.trendingNotifiedAt === null &&
            p.trendingExcluded === where.trendingExcluded,
        );
        if (!target) return { count: 0 };
        target.trendingNotifiedAt = data.trendingNotifiedAt;
        return { count: 1 };
      }),
      update: mock.fn(async ({ where, data }) => {
        const target = products.find((p) => p.id === where.id);
        Object.assign(target, data);
        return target;
      }),
    },
    notification: {
      create: mock.fn(async ({ data }) => {
        notifications.push(data);
        return data;
      }),
    },
    $transaction: mock.fn(async (run) => run(prisma)),
  };

  const inventoryService = {
    calculateAvailable: (invs) => invs.reduce((sum, i) => sum + i.availableQty, 0),
  };

  const trendingService = new ProductTrendingService(prisma, inventoryService);
  const firstFetch = await trendingService.getTrendingProducts(10);
  assert.equal(firstFetch.total, 3);
  assert.equal(firstFetch.items[0].id, topProductId);
  assert.equal(firstFetch.items[0].purchaseCount, 5);
  assert.equal(firstFetch.items[0].shopName, 'Shop Đồng Hồ Uy Tín');
  assert.equal(firstFetch.items[0].reputationScore, 95);
  assert.equal(firstFetch.items[0].reviewCount, 15);
  assert.equal(firstFetch.items[0].isTrending, true);
  assert.equal(firstFetch.items[1].id, tieFirstId);
  assert.equal(firstFetch.items[1].purchaseCount, 3);
  assert.equal(firstFetch.items[2].id, 'p-tie-reached-second');
  assert.equal(firstFetch.items[2].purchaseCount, 3);
  assert.equal(notifications.length, 0);

  await trendingService.syncTopOneTrendingNotification();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].userId, 'seller-1');
  assert.match(notifications[0].title, /Top 1 Xu hướng/);
  assert.match(notifications[0].content, /5 lượt mua/);

  await trendingService.syncTopOneTrendingNotification();
  assert.equal(notifications.length, 1);

  const adminProducts = new AdminProductsService(prisma, trendingService);
  assert.equal(typeof adminProducts.addProductToTrending, 'undefined');

  const adminList = await adminProducts.listTrendingProducts(10);
  assert.equal(adminList.total, 3);

  const removed = await adminProducts.removeProductFromTrending(topProductId, 'admin-1', {
    reason: 'Không phù hợp hiển thị',
  });
  assert.equal(removed.success, true);
  assert.equal(removed.product.trendingExcluded, true);
  assert.equal(notifications.length, 3);
  assert.equal(notifications[1].userId, 'seller-1');
  assert.match(notifications[1].title, /gỡ khỏi Xu hướng/);
  assert.match(notifications[1].content, /Không phù hợp hiển thị/);
  assert.equal(notifications[2].userId, 'seller-2');
  assert.match(notifications[2].title, /Top 1 Xu hướng/);

  const afterRemoval = await trendingService.getTrendingProducts(10);
  assert.equal(afterRemoval.total, 2);
  assert.equal(afterRemoval.items[0].id, tieFirstId);
});
