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
const { ProductSearchService } = load('../src/modules/catalog/services/product-search.service.ts');

function makeProduct(id, overrides = {}) {
  return {
    id,
    title: `Product ${id}`,
    description: 'Desc',
    basePrice: 100000,
    salePrice: null,
    saleStartsAt: null,
    saleEndsAt: null,
    threeModelKey: null,
    createdAt: new Date('2026-11-20T00:00:00Z'),
    trendingExcluded: false,
    averageRating: 4.5,
    reviewCount: 2,
    images: [{ imageUrl: `https://example.com/${id}.jpg` }],
    category: { id: 'cat-1', name: 'Fashion', slug: 'fashion' },
    seller: { id: 'seller-1', fullName: 'Shop A', avatarUrl: null, shopAvatarUrl: null },
    inventories: [{ availableQty: 10 }],
    options: [],
    ...overrides,
  };
}

test('ProductSearchService filters trendingOnly and sorts by best_selling / trending', async () => {
  const products = [
    makeProduct('p1', { createdAt: new Date('2026-11-20T00:00:00Z') }),
    makeProduct('p2', { createdAt: new Date('2026-11-22T00:00:00Z') }),
    makeProduct('p3', { trendingExcluded: true }),
    makeProduct('p4'),
  ];

  const prisma = {
    product: {
      findMany: async ({ where }) => {
        if (where?.id?.in) {
          return products.filter((p) => where.id.in.includes(p.id));
        }
        return products;
      },
      count: async () => products.length,
    },
    orderItem: {
      groupBy: async () => [
        { productId: 'p1', _sum: { quantity: 12 } },
        { productId: 'p2', _sum: { quantity: 3 } },
        { productId: 'p3', _sum: { quantity: 50 } },
      ],
    },
  };

  const service = new ProductSearchService(prisma, {
    calculateAvailable: (invs) => invs.reduce((sum, i) => sum + i.availableQty, 0),
  });

  const trendingRes = await service.getProducts({ trendingOnly: true, sortBy: 'trending' });
  assert.deepEqual(
    trendingRes.items.map((item) => ({
      id: item.id,
      purchaseCount: item.purchaseCount,
      isTrending: item.isTrending,
    })),
    [
      { id: 'p1', purchaseCount: 12, isTrending: true },
      { id: 'p2', purchaseCount: 3, isTrending: true },
    ],
  );

  const minPurchaseRes = await service.getProducts({
    minPurchaseCount: 10,
    sortBy: 'best_selling',
  });
  assert.deepEqual(
    minPurchaseRes.items.map((item) => ({ id: item.id, isTrending: item.isTrending })),
    [
      { id: 'p3', isTrending: false },
      { id: 'p1', isTrending: true },
    ],
  );

  const newestRes = await service.getProducts({ sortBy: 'newest' });
  const p4Item = newestRes.items.find((item) => item.id === 'p4');
  assert.equal(p4Item?.isTrending, false);

  const p1Meta = await service.getProductPurchaseMeta('p1', false);
  assert.deepEqual(p1Meta, { purchaseCount: 12, isTrending: true });

  const p3Meta = await service.getProductPurchaseMeta('p3', true);
  assert.deepEqual(p3Meta, { purchaseCount: 50, isTrending: false });
});
