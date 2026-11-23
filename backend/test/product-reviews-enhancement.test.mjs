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
const { ReviewsService } = load('../src/modules/commerce/services/reviews.service.ts');

test('ReviewsService.create stores mediaUrls on product review and updates rating', async () => {
  let createdData = null;
  const tx = {
    $queryRaw: async () => [],
    order: {
      findFirst: async () => ({
        id: 'order-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        status: 'CONFIRMED',
        items: [{ productId: 'prod-1' }],
      }),
    },
    productReview: {
      create: mock.fn(async ({ data }) => {
        createdData = data;
        return data;
      }),
    },
    reputationLog: { findFirst: async () => null },
    product: {
      update: mock.fn(async () => ({ ratingSum: 5, reviewCount: 1 })),
      findUnique: async () => ({ title: 'Sample Product' }),
    },
    user: {
      findUnique: async () => ({ fullName: 'Buyer A' }),
      findMany: async () => [],
    },
    notification: { create: mock.fn(async () => ({})) },
  };

  const service = new ReviewsService(
    { $transaction: (fn) => fn(tx) },
    { adjustScore: mock.fn(async () => ({})) },
  );

  await service.create(
    'buyer-1',
    'order-1',
    {
      rating: 5,
      comment: 'Hàng đẹp đúng mô tả',
      mediaUrls: ['https://example.com/photo.jpg', 'https://example.com/unbox.mp4'],
    },
    'product',
    'prod-1',
  );

  assert.deepEqual(createdData.mediaUrls, [
    'https://example.com/photo.jpg',
    'https://example.com/unbox.mp4',
  ]);
});

test('ReviewsService.replyToProductReview enforces seller ownership and saves reply', async () => {
  const notifications = [];
  const tx = {
    productReview: {
      findUnique: async () => ({
        id: 'rev-1',
        reviewerId: 'buyer-1',
        product: { id: 'prod-1', title: 'Áo khoác', sellerId: 'seller-1' },
      }),
      update: mock.fn(async ({ data }) => ({
        id: 'rev-1',
        sellerReply: data.sellerReply,
        sellerRepliedAt: data.sellerRepliedAt,
      })),
    },
    notification: {
      create: async ({ data }) => notifications.push(data),
    },
  };

  const service = new ReviewsService(
    { $transaction: (fn) => fn(tx) },
    { adjustScore: async () => ({}) },
  );

  await assert.rejects(
    () => service.replyToProductReview('other-seller', 'rev-1', { reply: 'Cảm ơn bạn' }),
    /chỉ có thể phản hồi đánh giá cho sản phẩm của gian hàng mình/,
  );

  const res = await service.replyToProductReview('seller-1', 'rev-1', {
    reply: 'Cảm ơn bạn đã ủng hộ shop!',
  });

  assert.equal(res.id, 'rev-1');
  assert.equal(res.sellerReply, 'Cảm ơn bạn đã ủng hộ shop!');
  assert.ok(res.sellerRepliedAt instanceof Date);
  assert.equal(notifications.length, 1);
});

test('ReviewsService.toggleHelpfulProductReview toggles vote and updates helpfulCount', async () => {
  let voteRecord = null;
  let helpfulCount = 0;

  const tx = {
    productReview: {
      findUnique: async () => ({ id: 'rev-1', reviewerId: 'buyer-1', helpfulCount }),
      update: async ({ data }) => {
        if (typeof data.helpfulCount === 'number') {
          helpfulCount = data.helpfulCount;
        } else if (data.helpfulCount?.increment) {
          helpfulCount += data.helpfulCount.increment;
        }
        return { helpfulCount };
      },
    },
    productReviewHelpfulVote: {
      findUnique: async () => voteRecord,
      create: async ({ data }) => {
        voteRecord = { id: 'vote-1', ...data };
        return voteRecord;
      },
      delete: async () => {
        voteRecord = null;
      },
    },
  };

  const service = new ReviewsService(
    { $transaction: (fn) => fn(tx) },
    { adjustScore: async () => ({}) },
  );

  const first = await service.toggleHelpfulProductReview('buyer-2', 'rev-1');
  assert.deepEqual(first, { reviewId: 'rev-1', helpful: true, helpfulCount: 1 });

  const second = await service.toggleHelpfulProductReview('buyer-2', 'rev-1');
  assert.deepEqual(second, { reviewId: 'rev-1', helpful: false, helpfulCount: 0 });
});
