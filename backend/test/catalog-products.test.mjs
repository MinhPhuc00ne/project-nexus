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
