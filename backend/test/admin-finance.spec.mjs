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
const { AdminFinanceService } = load('../src/modules/admin/services/admin-finance.service.ts');

test('AdminFinanceService.getDashboardAnalytics returns revenuePeriods, revenueComposition, and bidFrequency', async () => {
  const now = new Date();
  const prismaMock = {
    escrowRecord: {
      findMany: mock.fn(async () => [
        {
          id: 'esc-1',
          platformFee: 160000,
          totalAmount: 1000000,
          heldAt: new Date(now.getTime() - 3600000),
          disbursedAt: now,
          order: {
            id: 'ord-1',
            isAuction: true,
            createdAt: now,
            items: [],
          },
        },
        {
          id: 'esc-2',
          platformFee: 70000,
          totalAmount: 1000000,
          heldAt: new Date(now.getTime() - 7200000),
          disbursedAt: now,
          order: {
            id: 'ord-2',
            isAuction: false,
            createdAt: now,
            items: [
              {
                totalPrice: 1000000,
                product: {
                  categoryId: 'cat-1',
                  category: { id: 'cat-1', name: 'Đồng hồ cao cấp' },
                },
              },
            ],
          },
        },
      ]),
    },
    bid: {
      findMany: mock.fn(async () => [
        { id: 'b-1', placedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 15) },
        { id: 'b-2', placedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 45) },
        { id: 'b-3', placedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 10) },
      ]),
    },
  };

  const service = new AdminFinanceService(prismaMock);
  const analytics = await service.getDashboardAnalytics();

  // 1. Verify revenuePeriods structure
  assert.ok(Array.isArray(analytics.revenuePeriods));
  assert.equal(analytics.revenuePeriods.length, 4);
  const period7d = analytics.revenuePeriods.find((p) => p.label === '7 ngày');
  assert.ok(period7d);
  assert.equal(period7d.auction, 160000);
  assert.equal(period7d.normal, 70000);
  assert.equal(period7d.total, 230000);
  assert.equal(period7d.labels.length, 7);
  assert.equal(period7d.auctionValues.length, 7);
  assert.equal(period7d.normalValues.length, 7);

  // 2. Verify revenueComposition structure
  assert.ok(analytics.revenueComposition);
  assert.equal(analytics.revenueComposition.totalAmount, 230000);
  assert.ok(Array.isArray(analytics.revenueComposition.items));
  assert.equal(analytics.revenueComposition.items.length, 2);
  assert.ok(Array.isArray(analytics.revenueComposition.byCategory));
  assert.equal(analytics.revenueComposition.byCategory.length, 1);
  assert.equal(analytics.revenueComposition.byCategory[0].name, 'Đồng hồ cao cấp');

  // 3. Verify bidFrequency structure
  assert.ok(analytics.bidFrequency);
  assert.equal(analytics.bidFrequency.totalBids, 3);
  assert.ok(Array.isArray(analytics.bidFrequency.labels));
  assert.equal(analytics.bidFrequency.labels.length, 10);
  assert.ok(Array.isArray(analytics.bidFrequency.values));
  assert.equal(analytics.bidFrequency.values.length, 10);
  assert.ok(analytics.bidFrequency.peakWindow);
});
