import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from './helpers/vitest-node-compat.mjs';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const source = (path) => load(`../src/${path}.ts`);

test('ReportModerationService.list enriches reports with shop, product and reporter display names', async () => {
  const { ReportModerationService } = source('modules/reviews/services/report-moderation.service');

  const shopId = randomUUID();
  const productId = randomUUID();
  const reporterId = randomUUID();
  const reportId = randomUUID();

  let capturedFindManyOptions = null;

  const mockPrisma = {
    shopViolation: {
      findMany: async (options) => {
        capturedFindManyOptions = options;
        return [
          {
            id: reportId,
            shopId,
            productId,
            reporterId,
            title: 'Hàng giả thương hiệu',
            description: 'Sản phẩm không có tem kiểm định',
            evidenceUrls: ['https://example.com/evidence.jpg'],
            penaltyLevel: null,
            status: 'PENDING',
            resolutionNotes: null,
            handledByAdminId: null,
            handledAt: null,
            createdAt: new Date('2026-11-11T10:00:00Z'),
            updatedAt: new Date('2026-11-11T10:00:00Z'),
            shop: {
              id: shopId,
              fullName: 'Trần Văn B',
              email: 'seller@example.com',
              shopAvatarUrl: 'https://example.com/shop.jpg',
              sellerUpgradeRequests: [{ storeName: 'Gốm Sứ Bát Tràng' }],
            },
            product: {
              id: productId,
              title: 'Bình hoa gốm men lam',
              status: 'ACTIVE',
            },
            reporter: {
              id: reporterId,
              fullName: 'Nguyễn Văn A',
              email: 'buyer@example.com',
            },
          },
          {
            id: randomUUID(),
            shopId: randomUUID(),
            productId: null,
            reporterId: null,
            title: 'Gian hàng vi phạm',
            description: 'Spam tin nhắn',
            evidenceUrls: [],
            penaltyLevel: null,
            status: 'INVESTIGATING',
            resolutionNotes: null,
            handledByAdminId: null,
            handledAt: null,
            createdAt: new Date('2026-11-11T11:00:00Z'),
            updatedAt: new Date('2026-11-11T11:00:00Z'),
            shop: {
              id: randomUUID(),
              fullName: 'Lê Văn C',
              email: 'seller2@example.com',
              shopAvatarUrl: null,
              sellerUpgradeRequests: [],
            },
            product: null,
            reporter: null,
          },
        ];
      },
      count: async () => 2,
    },
  };

  const mockReputation = {};
  const service = new ReportModerationService(mockPrisma, mockReputation);

  const result = await service.list({ page: 1, limit: 10 });

  assert.equal(result.total, 2);
  assert.equal(result.page, 1);
  assert.equal(result.limit, 10);
  assert.equal(result.items.length, 2);

  // Assert include was provided to Prisma
  assert.ok(capturedFindManyOptions.include.shop);
  assert.ok(capturedFindManyOptions.include.product);
  assert.ok(capturedFindManyOptions.include.reporter);

  // Assert item 1 (full relations with approved store name)
  const item1 = result.items[0];
  assert.equal(item1.id, reportId);
  assert.equal(item1.shopName, 'Gốm Sứ Bát Tràng');
  assert.equal(item1.productTitle, 'Bình hoa gốm men lam');
  assert.equal(item1.productName, 'Bình hoa gốm men lam');
  assert.equal(item1.reporterName, 'Nguyễn Văn A');
  assert.deepEqual(item1.shop, {
    id: shopId,
    fullName: 'Trần Văn B',
    email: 'seller@example.com',
    shopAvatarUrl: 'https://example.com/shop.jpg',
    storeName: 'Gốm Sứ Bát Tràng',
  });
  assert.deepEqual(item1.product, {
    id: productId,
    title: 'Bình hoa gốm men lam',
    status: 'ACTIVE',
  });
  assert.deepEqual(item1.reporter, {
    id: reporterId,
    fullName: 'Nguyễn Văn A',
    email: 'buyer@example.com',
  });

  // Assert item 2 (fallback to fullName, null product, null reporter)
  const item2 = result.items[1];
  assert.equal(item2.shopName, 'Lê Văn C');
  assert.equal(item2.productTitle, null);
  assert.equal(item2.productName, null);
  assert.equal(item2.reporterName, null);
  assert.equal(item2.shop.storeName, 'Lê Văn C');
  assert.equal(item2.product, null);
  assert.equal(item2.reporter, null);
});
