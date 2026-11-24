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

test('ReviewsService.toggleHelpfulProductReview blocks self-vote, toggles vote and updates helpfulCount', async () => {
  let voteRecord = null;
  let helpfulCount = 0;

  const tx = {
    $queryRaw: async () => [],
    productReview: {
      findUnique: async () => ({ id: 'rev-1', reviewerId: 'buyer-1', helpfulCount }),
      update: async ({ data }) => {
        if (data.helpfulCount?.decrement) {
          helpfulCount = Math.max(0, helpfulCount - data.helpfulCount.decrement);
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

  await assert.rejects(
    () => service.toggleHelpfulProductReview('buyer-1', 'rev-1'),
    /không thể tự bình chọn hữu ích cho đánh giá của chính mình/,
  );

  const first = await service.toggleHelpfulProductReview('buyer-2', 'rev-1');
  assert.deepEqual(first, { reviewId: 'rev-1', helpful: true, helpfulCount: 1 });

  const second = await service.toggleHelpfulProductReview('buyer-2', 'rev-1');
  assert.deepEqual(second, { reviewId: 'rev-1', helpful: false, helpfulCount: 0 });
});

test('ReviewsService.adminRemoveSellerReply clears sellerReply, deducts seller reputation and notifies seller', async () => {
  const notifications = [];
  const penalties = [];
  let updatedData = null;

  const tx = {
    productReview: {
      findUnique: async () => ({
        id: 'rev-1',
        sellerReply: 'Phản hồi thô tục',
        product: {
          id: 'prod-1',
          title: 'Áo khoác',
          sellerId: 'seller-1',
          seller: { reputationScore: 80 },
        },
      }),
      update: async ({ data }) => {
        updatedData = data;
        return { id: 'rev-1', ...data };
      },
    },
    notification: {
      create: async ({ data }) => notifications.push(data),
    },
  };

  const service = new ReviewsService(
    { $transaction: (fn) => fn(tx) },
    { adjustScore: async (payload) => penalties.push(payload) },
  );

  const res = await service.adminRemoveSellerReply(
    'rev-1',
    { reason: 'Ngôn từ xúc phạm khách hàng', pointsToDeduct: 10 },
    'SUPPORT_STAFF',
  );

  assert.equal(res.success, true);
  assert.deepEqual(updatedData, { sellerReply: null, sellerRepliedAt: null });
  assert.equal(penalties.length, 1);
  assert.equal(penalties[0].userId, 'seller-1');
  assert.equal(penalties[0].deltaPoints, -10);
  assert.equal(notifications.length, 1);
});

test('ReviewsService supports 2-way ReviewReply with media and paginated listing', async () => {
  const createdReplies = [];
  const createdReplyMedia = [];
  const notifications = [];

  const tx = {
    productReview: {
      findUnique: async () => ({
        id: 'rev-1',
        reviewerId: 'buyer-1',
        product: { id: 'prod-1', title: 'Đồng hồ cơ', sellerId: 'seller-1' },
      }),
      update: async () => ({}),
    },
    reviewReply: {
      create: async ({ data }) => {
        const rec = { id: `reply-${createdReplies.length + 1}`, ...data };
        createdReplies.push(rec);
        return rec;
      },
      findUnique: async ({ where }) => ({
        id: where.id,
        content: createdReplies[0].content,
        author: { id: 'buyer-1', fullName: 'Buyer A', avatarUrl: null },
        media: createdReplyMedia,
      }),
    },
    reviewReplyMedia: {
      createMany: async ({ data }) => {
        createdReplyMedia.push(...data);
      },
    },
    notification: {
      create: async ({ data }) => notifications.push(data),
    },
  };

  const service = new ReviewsService(
    {
      $transaction: (fn) => fn(tx),
      productReview: { findUnique: async () => ({ id: 'rev-1' }) },
      reviewReply: {
        findMany: async () => createdReplies,
        count: async () => createdReplies.length,
      },
    },
    { adjustScore: async () => ({}) },
  );

  await assert.rejects(
    () =>
      service.createReviewReply('stranger-1', 'product', 'rev-1', {
        content: 'Nhắn ké',
      }),
    /Chỉ người mua đã đánh giá hoặc người bán sở hữu/,
  );

  const reply = await service.createReviewReply('buyer-1', 'product', 'rev-1', {
    content: 'Mình gửi thêm video mở hộp nhé',
    mediaUrls: ['https://example.com/unbox.mp4'],
  });
  assert.equal(reply.id, 'reply-1');
  assert.equal(createdReplyMedia.length, 1);
  assert.equal(createdReplyMedia[0].mediaType, 'VIDEO');
  assert.equal(notifications[0].userId, 'seller-1');

  const page = await service.listReviewReplies(
    'product',
    'rev-1',
    { page: 1, limit: 10 },
    'buyer-1',
  );
  assert.equal(page.total, 1);
  assert.equal(page.items.length, 1);
});

test('ReviewsService.adminModerateReviewVisibility hides negative review/reply without deleting, deducts reputation and sends notification', async () => {
  let storedHidden = false;
  const penalties = [];
  const notifications = [];

  const tx = {
    productReview: {
      findUnique: async () => ({
        id: 'rev-1',
        reviewerId: 'buyer-1',
        reviewer: { reputationScore: 80 },
        product: { title: 'Áo' },
      }),
      update: async ({ data }) => {
        storedHidden = data.isHidden;
        return { id: 'rev-1', isHidden: data.isHidden };
      },
    },
    reviewReply: {
      findUnique: async () => ({
        id: 'reply-1',
        authorId: 'seller-1',
        author: { reputationScore: 90 },
      }),
      update: async ({ data }) => ({ id: 'reply-1', isHidden: data.isHidden }),
    },
    notification: {
      create: async ({ data }) => notifications.push(data),
    },
  };

  const service = new ReviewsService(
    { $transaction: (fn) => fn(tx) },
    { adjustScore: async (payload) => penalties.push(payload) },
  );
  const res = await service.adminModerateReviewVisibility(
    'admin-1',
    'product',
    'rev-1',
    {
      isHidden: true,
      reason: 'Bình luận tiêu cực không phù hợp',
      pointsToDeduct: 10,
    },
    'ADMIN',
  );
  assert.equal(res.success, true);
  assert.equal(res.isHidden, true);
  assert.equal(storedHidden, true);
  assert.equal(penalties.length, 1);
  assert.equal(penalties[0].userId, 'buyer-1');
  assert.equal(penalties[0].deltaPoints, -10);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].userId, 'buyer-1');

  const replyRes = await service.adminModerateReviewVisibility(
    'admin-1',
    'reply',
    'reply-1',
    {
      isHidden: true,
      reason: 'Phản hồi xúc phạm',
      pointsToDeduct: 5,
    },
    'SUPPORT_STAFF',
  );
  assert.equal(replyRes.success, true);
  assert.equal(replyRes.isHidden, true);
  assert.equal(penalties.length, 2);
  assert.equal(penalties[1].userId, 'seller-1');
  assert.equal(penalties[1].deltaPoints, -5);
  assert.equal(notifications.length, 2);
});
