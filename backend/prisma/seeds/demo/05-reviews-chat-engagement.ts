/**
 * Demo reviews, conversations, notifications, wishlists and banners.
 *
 * These are the surfaces that used to be filled with invented numbers in the
 * frontend: star ratings defaulted to 5.0, the wishlist lived in
 * `localStorage`, and the home page carried hardcoded "sold" counts. With real
 * rows behind them, every one of those screens can read from the API.
 */
import {
  BannerCreatorRole,
  ChatContextType,
  ChatConversationStatus,
  ChatConversationType,
  NotificationChannel,
  NotificationType,
  OrderStatus,
  PrismaClient,
  ReviewMediaType,
  Role,
} from '@prisma/client';
import { DemoClock, SeededRandom } from './random';
import type { DemoPeople } from './01-users-shops';
import type { DemoCatalog } from './02-catalog-inventory';
import type { DemoOrder } from './04-orders-escrow-disputes';

const SHOP_COMMENTS = [
  'Shop đóng gói rất kỹ, hiện vật đúng như mô tả.',
  'Phản hồi nhanh, tư vấn kỹ về nguồn gốc hiện vật.',
  'Giao hàng chậm hơn hẹn một ngày nhưng sản phẩm tốt.',
  'Chủ shop am hiểu, có giấy thẩm định đầy đủ.',
];

const PRODUCT_COMMENTS = [
  'Men gốm còn nguyên, không nứt. Rất hài lòng.',
  'Hiện vật đẹp hơn ảnh, chi tiết chạm rất sắc.',
  'Có vết thời gian nhẹ, đúng như shop đã nói trước.',
  'Đóng gói chống sốc tốt, về tới nơi nguyên vẹn.',
  'Giá hợp lý so với hiện vật cùng niên đại.',
];

const BUYER_MESSAGES = [
  'Chào shop, hiện vật này có giấy thẩm định không ạ?',
  'Shop cho mình xem thêm ảnh phần đáy với ạ.',
  'Nếu mình mua 2 món thì phí vận chuyển tính thế nào shop?',
  'Hiện vật này có còn hàng không shop?',
];

const SELLER_REPLIES = [
  'Dạ có ạ, giấy thẩm định do Trung tâm Thẩm định Cổ vật Hà Nội cấp.',
  'Mình gửi thêm ảnh chi tiết ngay bây giờ ạ.',
  'Mua từ 2 món shop hỗ trợ phí vận chuyển ạ.',
  'Dạ còn ạ, hiện vật vẫn đang trong kho.',
];

/**
 * Creates the engagement data the read-heavy screens render.
 *
 * @param prisma - A connected client.
 * @param clock - The run's clock.
 * @param random - The run's generator.
 * @param people - Who reviews, chats and gets notified.
 * @param catalog - The products reviewed and wishlisted.
 * @param orders - The orders a review has to be attached to.
 * @returns Counts, for the run summary.
 */
export async function seedReviewsChatAndEngagement(
  prisma: PrismaClient,
  clock: DemoClock,
  random: SeededRandom,
  people: DemoPeople,
  catalog: DemoCatalog,
  orders: DemoOrder[],
): Promise<{
  shopReviews: number;
  productReviews: number;
  conversations: number;
  notifications: number;
  wishlistItems: number;
  banners: number;
}> {
  // Only a finished order earns a review, which is what the API enforces.
  const reviewable = orders.filter(
    (order) => order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.DELIVERED,
  );

  let shopReviews = 0;
  let productReviews = 0;

  for (const order of reviewable) {
    const reviewedAt = new Date(order.createdAt.getTime() + random.int(2, 9) * 86_400_000);
    if (reviewedAt > clock.now) continue;

    if (random.chance(0.75)) {
      const rating = random.chance(0.7) ? 5 : random.int(3, 4);
      await prisma.review.create({
        data: {
          orderId: order.id,
          reviewerId: order.buyerId,
          targetUserId: order.sellerId,
          rating,
          comment: random.pick(SHOP_COMMENTS),
          isShopReview: true,
          createdAt: reviewedAt,
          media: random.chance(0.3)
            ? {
                create: {
                  mediaType: ReviewMediaType.IMAGE,
                  url: `https://picsum.photos/seed/${encodeURIComponent(`review-${order.id}`)}/800/600`,
                  sortOrder: 0,
                },
              }
            : undefined,
          replies: random.chance(0.4)
            ? {
                create: {
                  authorId: order.sellerId,
                  authorRole: Role.SELLER,
                  content: 'Cảm ơn anh/chị đã tin tưởng shop, hẹn gặp lại ạ!',
                  createdAt: new Date(reviewedAt.getTime() + 3_600_000),
                },
              }
            : undefined,
        },
      });
      shopReviews += 1;
    }

    for (const productId of order.productIds) {
      if (!random.chance(0.65)) continue;
      const rating = random.chance(0.6) ? 5 : random.int(3, 4);
      await prisma.productReview.create({
        data: {
          orderId: order.id,
          productId,
          reviewerId: order.buyerId,
          rating,
          comment: random.pick(PRODUCT_COMMENTS),
          helpfulCount: random.int(0, 12),
          createdAt: reviewedAt,
        },
      });
      productReviews += 1;

      // The denormalised counters on Product have to agree with the reviews, or
      // products_review_stats_check rejects the update.
      await prisma.product.update({
        where: { id: productId },
        data: {
          reviewCount: { increment: 1 },
          ratingSum: { increment: rating },
        },
      });
      productReviews += 0;
    }
  }

  // Recompute the average from the stored sums so the column is consistent.
  const reviewed = await prisma.product.findMany({
    where: { reviewCount: { gt: 0 } },
    select: { id: true, reviewCount: true, ratingSum: true },
  });
  for (const product of reviewed) {
    await prisma.product.update({
      where: { id: product.id },
      data: { averageRating: product.ratingSum / product.reviewCount },
    });
  }

  // Buyer to seller conversations, plus a support ticket in the staff queue.
  let conversations = 0;
  for (const buyer of people.buyers) {
    const seller = random.pick(people.sellers);
    const startedAt = clock.hoursAgo(random.int(1, 72));
    const buyerMessage = random.pick(BUYER_MESSAGES);
    const sellerReply = random.pick(SELLER_REPLIES);
    const replyAt = new Date(startedAt.getTime() + random.int(3, 90) * 60_000);

    await prisma.chatConversation.create({
      data: {
        type: ChatConversationType.BUYER_SELLER,
        participant1Id: buyer.id,
        participant2Id: seller.id,
        contextType: ChatContextType.PRODUCT,
        status: ChatConversationStatus.IN_PROGRESS,
        lastMessage: sellerReply,
        lastMessageAt: replyAt,
        unreadCountUser1: 1,
        createdAt: startedAt,
        updatedAt: replyAt,
        messages: {
          create: [
            { senderId: buyer.id, body: buyerMessage, isRead: true, createdAt: startedAt },
            { senderId: seller.id, body: sellerReply, isRead: false, createdAt: replyAt },
          ],
        },
      },
    });
    conversations += 1;
  }

  const ticketBuyer = random.pick(people.buyers);
  const ticketStaff = random.pick(people.staff);
  const ticketOpenedAt = clock.minutesAgo(random.int(5, 90));
  await prisma.chatConversation.create({
    data: {
      type: ChatConversationType.STAFF_BUYER,
      participant1Id: ticketBuyer.id,
      participant2Id: ticketStaff.id,
      assignedStaffId: ticketStaff.id,
      title: 'Yêu cầu hỗ trợ: đơn hàng chưa cập nhật vận chuyển',
      contextType: ChatContextType.ORDER,
      status: ChatConversationStatus.IN_PROGRESS,
      lastMessage: 'Nhân viên đang kiểm tra với đơn vị vận chuyển, anh/chị chờ trong ít phút ạ.',
      lastMessageAt: ticketOpenedAt,
      createdAt: ticketOpenedAt,
      updatedAt: ticketOpenedAt,
      messages: {
        create: [
          {
            senderId: ticketBuyer.id,
            body: 'Đơn của mình 3 ngày chưa thấy cập nhật vận chuyển, nhờ hỗ trợ ạ.',
            isRead: true,
            createdAt: ticketOpenedAt,
          },
          {
            senderId: ticketStaff.id,
            body: 'Nhân viên đang kiểm tra với đơn vị vận chuyển, anh/chị chờ trong ít phút ạ.',
            isRead: false,
            createdAt: new Date(ticketOpenedAt.getTime() + 120_000),
          },
        ],
      },
    },
  });
  conversations += 1;

  // A waiting ticket, so the staff queue has something to claim.
  const queuedBuyer = random.pick(people.buyers);
  await prisma.chatConversation.create({
    data: {
      type: ChatConversationType.STAFF_BUYER,
      participant1Id: queuedBuyer.id,
      title: 'Yêu cầu hỗ trợ: xác minh giấy thẩm định hiện vật',
      contextType: ChatContextType.GENERAL,
      status: ChatConversationStatus.OPEN,
      lastMessage: 'Mình muốn xác minh giấy thẩm định của một hiện vật đang đấu giá.',
      lastMessageAt: clock.minutesAgo(random.int(1, 20)),
      createdAt: clock.minutesAgo(random.int(1, 20)),
      messages: {
        create: {
          senderId: queuedBuyer.id,
          body: 'Mình muốn xác minh giấy thẩm định của một hiện vật đang đấu giá.',
          createdAt: clock.minutesAgo(random.int(1, 20)),
        },
      },
    },
  });
  conversations += 1;

  // Wishlists, so the buyer wishlist page reads from the server.
  let wishlistItems = 0;
  for (const buyer of people.buyers) {
    for (const product of random.sample(catalog.products, random.int(2, 6))) {
      await prisma.wishlistItem.create({
        data: {
          userId: buyer.id,
          productId: product.id,
          createdAt: clock.daysAgo(random.int(0, 20)),
        },
      });
      wishlistItems += 1;
    }
  }

  // Notifications, including unread ones so the bell badge is real.
  let notifications = 0;
  const notificationTemplates: Array<{
    title: string;
    content: string;
    type: NotificationType;
    targetUrl: string;
  }> = [
    {
      title: 'Đơn hàng của bạn đã được giao 🚚',
      content: 'Đơn hàng đã tới nơi. Vui lòng xác nhận để hoàn tất giao dịch.',
      type: NotificationType.ORDER,
      targetUrl: '/buyer/orders',
    },
    {
      title: 'Bạn đang là người giữ giá cao nhất 🔥',
      content: 'Một lô trong phiên đấu giá trực tiếp vừa được bạn giữ giá cao nhất.',
      type: NotificationType.AUCTION,
      targetUrl: '/auctions',
    },
    {
      title: 'Nạp tiền vào ví thành công ✅',
      content: 'Số dư ví NEXUS Pay của bạn vừa được cập nhật.',
      type: NotificationType.PAYMENT,
      targetUrl: '/buyer/wallet',
    },
  ];

  for (const person of [...people.buyers, ...people.sellers]) {
    for (const template of random.sample(notificationTemplates, random.int(1, 3))) {
      const createdAt = clock.hoursAgo(random.int(1, 120));
      await prisma.notification.create({
        data: {
          userId: person.id,
          title: template.title,
          content: template.content,
          type: template.type,
          channel: NotificationChannel.IN_APP,
          targetUrl: template.targetUrl,
          isRead: random.chance(0.4),
          createdAt,
        },
      });
      notifications += 1;
    }
  }

  // Home page banners, created by the administrator and a staff member so the
  // creator-ordering rules have both cases present.
  const banners = [
    {
      title: 'Tuần lễ gốm sứ Chu Đậu — giảm tới 30%',
      creatorId: people.admin.id,
      creatorRole: BannerCreatorRole.ADMIN,
      priority: 10,
    },
    {
      title: 'Phiên đấu giá trực tiếp: Đồng hồ cơ Liên Xô',
      creatorId: people.staff[0]?.id ?? people.admin.id,
      creatorRole: people.staff[0] ? BannerCreatorRole.STAFF : BannerCreatorRole.ADMIN,
      priority: 5,
    },
  ];
  for (const banner of banners) {
    await prisma.eventBanner.create({
      data: {
        title: banner.title,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(banner.title)}/1600/600`,
        targetUrl: '/auctions',
        startsAt: clock.daysAgo(2),
        endsAt: clock.daysFromNow(12),
        isActive: true,
        priority: banner.priority,
        creatorId: banner.creatorId,
        creatorRole: banner.creatorRole,
      },
    });
  }

  return {
    shopReviews,
    productReviews,
    conversations,
    notifications,
    wishlistItems,
    banners: banners.length,
  };
}
