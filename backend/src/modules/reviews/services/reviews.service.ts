import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { MediaService } from '../../media/services/media.service';
import { ReputationService } from '../../users/services/reputation.service';
import {
  AdminDeleteReviewInput,
  AdminModerateReviewVisibilityInput,
  CreateReviewReplyInput,
  FeedbackPageInput,
  QueryAdminReviewsInput,
  ReviewInput,
  SellerReplyReviewInput,
} from '../dtos/feedback.dto';
import {
  EMPTY_COMMENT_FALLBACK,
  PRODUCT_REVIEW_NOT_FOUND,
  SHOP_REVIEW_NOT_FOUND,
  UploadedReviewMediaItem,
  buildReviewVisibilityFilter,
  persistReviewMedia,
  prepareReviewMedia,
} from './reviews-media.helper';
import { ReviewsModerationHelper } from './reviews-moderation.helper';
import { ReviewsRepliesHelper } from './reviews-replies.helper';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputationService: ReputationService,
    private readonly moderationHelper: ReviewsModerationHelper,
    private readonly repliesHelper: ReviewsRepliesHelper,
    @Optional() private readonly mediaService?: MediaService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  private async notifyBuyerReviewReceived(
    tx: Prisma.TransactionClient,
    sellerId: string,
    buyerId: string,
    title: string,
    contentPrefix: string,
    comment?: string,
  ): Promise<void> {
    if (typeof tx?.notification?.create !== 'function') return;
    const buyer = tx.user?.findUnique
      ? await tx.user.findUnique({ where: { id: buyerId }, select: { fullName: true } })
      : null;
    await publishNotification(
      tx,
      {
        userId: sellerId,
        title,
        content: `Customer ${buyer?.fullName || 'Buyer'} ${contentPrefix} Comment: "${comment || EMPTY_COMMENT_FALLBACK}".`,
        type: NotificationType.SYSTEM,
        channel: NotificationChannel.IN_APP,
      },
      this.notifications,
    );
  }

  private async upsertShopReview(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      orderId: string;
      sellerId: string;
      dto: ReviewInput;
      mediaItems: UploadedReviewMediaItem[];
      mediaUrls: string[];
    },
  ): Promise<unknown> {
    const { userId, orderId, sellerId, dto, mediaItems, mediaUrls } = params;
    if (tx.orderItem?.aggregate) {
      const orderItemsAgg = await tx.orderItem.aggregate({
        _sum: { quantity: true },
        where: { order: { buyerId: userId, sellerId, status: 'CONFIRMED' } },
      });
      if ((orderItemsAgg._sum.quantity ?? 0) < 2) {
        throw new BadRequestException(
          'You need to purchase and complete at least 2 items from this shop before leaving a shop review.',
        );
      }
    }

    const existingShopReview = await tx.review.findFirst({
      where: { reviewerId: userId, targetUserId: sellerId, isShopReview: true },
    });
    const comment = dto.comment?.trim() || null;
    const created = existingShopReview
      ? await tx.review.update({
          where: { id: existingShopReview.id },
          data: {
            rating: dto.rating,
            comment,
            ...(mediaUrls.length > 0 ? { mediaUrls } : {}),
          },
        })
      : await tx.review.create({
          data: {
            orderId,
            rating: dto.rating,
            comment,
            ...(mediaUrls.length > 0 ? { mediaUrls } : {}),
            reviewerId: userId,
            targetUserId: sellerId,
            isShopReview: true,
          },
        });

    if (mediaItems.length > 0 && created && typeof created === 'object' && 'id' in created) {
      if (existingShopReview && tx.reviewMedia?.deleteMany) {
        await tx.reviewMedia.deleteMany({ where: { shopReviewId: existingShopReview.id } });
      }
      await persistReviewMedia(
        tx,
        { shopReviewId: String((created as { id: string }).id) },
        mediaItems,
      );
    }

    await this.notifyBuyerReviewReceived(
      tx,
      sellerId,
      userId,
      'New shop review ⭐',
      `rated your shop ${dto.rating} stars.`,
      dto.comment,
    );
    return created;
  }

  private async createShopOrProductReview(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      orderId: string;
      sellerId: string;
      orderItems: Array<{ productId: string | null }>;
      dto: ReviewInput;
      kind: 'shop' | 'product';
      productId?: string;
      mediaItems?: UploadedReviewMediaItem[];
      mediaUrls?: string[];
    },
  ): Promise<unknown> {
    const {
      userId,
      orderId,
      sellerId,
      orderItems,
      dto,
      kind,
      productId,
      mediaItems = [],
      mediaUrls = [],
    } = params;

    if (kind === 'shop') {
      return this.upsertShopReview(tx, { userId, orderId, sellerId, dto, mediaItems, mediaUrls });
    }

    if (!productId || !orderItems.some((item) => item.productId === productId)) {
      throw new BadRequestException('Product does not belong to this order.');
    }
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
    const created = await tx.productReview.create({
      data: {
        orderId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        mediaUrls,
        reviewerId: userId,
        productId,
      },
    });
    if (mediaItems.length > 0 && created && typeof created === 'object' && 'id' in created) {
      await persistReviewMedia(
        tx,
        { productReviewId: String((created as { id: string }).id) },
        mediaItems,
      );
    }
    const product = await tx.product.update({
      where: { id: productId },
      data: { ratingSum: { increment: dto.rating }, reviewCount: { increment: 1 } },
    });
    await tx.product.update({
      where: { id: productId },
      data: { averageRating: product.ratingSum / product.reviewCount },
    });
    const prod = tx.product?.findUnique
      ? await tx.product.findUnique({ where: { id: productId }, select: { title: true } })
      : null;
    await this.notifyBuyerReviewReceived(
      tx,
      sellerId,
      userId,
      'New product review 🌟',
      `rated product "${prod?.title || 'Product'}" ${dto.rating} stars in order #${orderId.slice(0, 8)}.`,
      dto.comment,
    );
    return created;
  }

  private async handleReviewReputationAndAlert(
    tx: Prisma.TransactionClient,
    orderId: string,
    sellerId: string,
    dto: ReviewInput,
  ): Promise<void> {
    const bonusReference = `REVIEW_BONUS:${orderId}`;
    if (
      dto.rating === 5 &&
      !(await tx.reputationLog.findFirst({
        where: { userId: sellerId, referenceId: bonusReference },
      }))
    ) {
      await this.reputationService.adjustScore(
        {
          userId: sellerId,
          deltaPoints: 1,
          reason: `Order #${orderId.slice(0, 8)} received a 5-star review from buyer`,
          referenceId: bonusReference,
        },
        tx,
      );
      return;
    }

    if (dto.rating === 1) {
      const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      for (const admin of admins) {
        await publishNotification(
          tx,
          {
            userId: admin.id,
            title: `[SHOP ALERT] Order #${orderId.slice(0, 8)} received a 1-star review`,
            content: `Buyer rated Shop ${sellerId} 1 star on order #${orderId.slice(0, 8)}. Comment: "${dto.comment || EMPTY_COMMENT_FALLBACK}". Please inspect the evidence and handle via the violation report workflow.`,
            type: 'DISPUTE',
            channel: 'IN_APP',
          },
          this.notifications,
        );
      }
    }
  }

  private async validateOrderBeforeMediaUpload(
    userId: string,
    orderId: string,
    kind: 'shop' | 'product',
    productId?: string,
  ): Promise<void> {
    if (!this.prisma.order?.findFirst) return;
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found.');
    if (order.status !== 'CONFIRMED') {
      throw new BadRequestException('Reviews can only be submitted after the order is completed.');
    }
    if (kind === 'product' && (!productId || !order.items.some((i) => i.productId === productId))) {
      throw new BadRequestException('Product does not belong to this order.');
    }
  }

  async create(
    userId: string,
    orderId: string,
    dto: ReviewInput,
    kind: 'shop' | 'product' | 'customer',
    productId?: string,
    files?: Express.Multer.File[],
  ): Promise<unknown> {
    if (kind !== 'customer' && files && files.length > 0) {
      await this.validateOrderBeforeMediaUpload(userId, orderId, kind, productId);
    }

    const { urls: preparedMediaUrls, items: preparedMediaItems } =
      kind === 'customer'
        ? { urls: [], items: [] }
        : await prepareReviewMedia(this.mediaService, dto.mediaUrls, files);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
        const order = await tx.order.findFirst({
          where: {
            id: orderId,
            ...(kind === 'customer' ? { sellerId: userId } : { buyerId: userId }),
          },
          include: { items: true },
        });
        if (!order) throw new NotFoundException('Order not found.');
        if (order.status !== 'CONFIRMED')
          throw new BadRequestException(
            'Reviews can only be submitted after the order is completed.',
          );

        if (kind === 'customer') {
          return tx.customerReview.create({
            data: {
              orderId,
              rating: dto.rating,
              comment: dto.comment?.trim() || null,
              sellerId: userId,
              buyerId: order.buyerId,
            },
          });
        }

        const createdReview = await this.createShopOrProductReview(tx, {
          userId,
          orderId,
          sellerId: order.sellerId,
          orderItems: order.items,
          dto,
          kind,
          productId,
          mediaItems: preparedMediaItems,
          mediaUrls: preparedMediaUrls,
        });
        await this.handleReviewReputationAndAlert(tx, order.id, order.sellerId, dto);
        return createdReview;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This order or product has already been reviewed.');
      }
      throw error;
    }
  }

  private async listShopReviews(
    targetId: string,
    query: FeedbackPageInput,
    pagination: { skip: number; take: number; orderBy: { createdAt: Prisma.SortOrder } },
    author: { select: { id: boolean; fullName: boolean; avatarUrl: boolean } },
    viewerId?: string,
  ): Promise<unknown> {
    const shop = await this.prisma.user.findFirst({
      where: { id: targetId, role: 'SELLER', isShopSuspended: false },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found.');
    const visibleStatsWhere: Prisma.ReviewWhereInput = {
      targetUserId: targetId,
      isShopReview: true,
      isHidden: false,
    };
    const where: Prisma.ReviewWhereInput = {
      targetUserId: targetId,
      isShopReview: true,
      ...(query.rating !== undefined
        ? { rating: { gte: query.rating, lt: query.rating + 1 } }
        : {}),
      ...(buildReviewVisibilityFilter(viewerId) as Prisma.ReviewWhereInput),
    };
    const [allVisibleReviews, items, total] = await Promise.all([
      this.prisma.review.findMany({ where: visibleStatsWhere, select: { rating: true } }),
      this.prisma.review.findMany({
        where,
        ...pagination,
        select: {
          id: true,
          rating: true,
          comment: true,
          mediaUrls: true,
          isHidden: true,
          hiddenReason: true,
          createdAt: true,
          reviewer: author,
          media: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, mediaType: true, url: true, mimeType: true, sizeBytes: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);
    const totalVisible = allVisibleReviews.length;
    const sum = allVisibleReviews.reduce((acc, r) => acc + Number(r.rating), 0);
    const averageRating = totalVisible > 0 ? Number((sum / totalVisible).toFixed(1)) : 5.0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of allVisibleReviews) {
      const star = Math.min(5, Math.max(1, Math.floor(Number(r.rating)))) as 1 | 2 | 3 | 4 | 5;
      distribution[star]++;
    }
    return {
      items: items.map((r) => ({ ...r, rating: Number(r.rating) })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
      averageRating,
      distribution,
    };
  }

  async list(
    targetId: string,
    kind: 'shop' | 'product' | 'seller-products' | 'customer',
    query: FeedbackPageInput,
    viewerId?: string,
  ): Promise<unknown> {
    const skip = (query.page - 1) * query.limit;
    const sortOrder: Prisma.SortOrder = query.sortBy === 'oldest' ? 'asc' : 'desc';
    const pagination = { skip, take: query.limit, orderBy: { createdAt: sortOrder } };
    const author = { select: { id: true, fullName: true, avatarUrl: true } };

    if (kind === 'shop') {
      return this.listShopReviews(targetId, query, pagination, author, viewerId);
    }
    if (kind === 'customer') {
      const where: Prisma.CustomerReviewWhereInput = {
        buyerId: targetId,
        ...(query.rating !== undefined ? { rating: query.rating } : {}),
      };
      const [items, total] = await Promise.all([
        this.prisma.customerReview.findMany({
          where,
          ...pagination,
          select: { id: true, rating: true, comment: true, createdAt: true, seller: author },
        }),
        this.prisma.customerReview.count({ where }),
      ]);
      return { items, total, page: query.page, limit: query.limit };
    }
    if (kind === 'product') {
      const product = await this.prisma.product.findFirst({
        where: { id: targetId, status: 'ACTIVE', seller: { isShopSuspended: false } },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Product not found.');
    }
    const visibilityFilter = buildReviewVisibilityFilter(
      viewerId,
    ) as Prisma.ProductReviewWhereInput;
    const where: Prisma.ProductReviewWhereInput = {
      ...(kind === 'product' ? { productId: targetId } : { product: { sellerId: targetId } }),
      ...(query.rating !== undefined ? { rating: query.rating } : {}),
      ...visibilityFilter,
    };
    const [items, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        ...pagination,
        select: {
          id: true,
          productId: true,
          rating: true,
          comment: true,
          mediaUrls: true,
          sellerReply: true,
          sellerRepliedAt: true,
          helpfulCount: true,
          isHidden: true,
          hiddenReason: true,
          createdAt: true,
          reviewer: author,
        },
      }),
      this.prisma.productReview.count({ where }),
    ]);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async updateProductReview(
    userId: string,
    orderId: string,
    productId: string,
    dto: ReviewInput,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.productReview.findUnique({
        where: { orderId_productId: { orderId, productId } },
        include: { product: true },
      });
      if (!existing) throw new NotFoundException(PRODUCT_REVIEW_NOT_FOUND);
      if (existing.reviewerId !== userId)
        throw new ForbiddenException('You can only edit your own review.');

      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      const deltaRating = dto.rating - existing.rating;

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          ratingSum: { increment: deltaRating },
        },
      });
      await tx.product.update({
        where: { id: productId },
        data: {
          averageRating:
            updatedProduct.reviewCount > 0
              ? updatedProduct.ratingSum / updatedProduct.reviewCount
              : 0,
        },
      });

      const mediaUrls =
        dto.mediaUrls !== undefined
          ? dto.mediaUrls.map((url) => url.trim()).filter(Boolean)
          : undefined;

      const updatedReview = await tx.productReview.update({
        where: { orderId_productId: { orderId, productId } },
        data: {
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
          ...(mediaUrls !== undefined ? { mediaUrls } : {}),
        },
      });

      const bonusReference = `REVIEW_BONUS:${orderId}`;
      if (existing.rating === 5 && dto.rating < 5) {
        const bonusLog = await tx.reputationLog.findFirst({
          where: { userId: order.sellerId, referenceId: bonusReference },
        });
        if (bonusLog) {
          await this.reputationService.adjustScore(
            {
              userId: order.sellerId,
              deltaPoints: -1,
              reason: `Revoked 5-star review bonus after customer lowered rating to ${dto.rating} stars on order #${orderId.slice(0, 8)}`,
              referenceId: `REVIEW_BONUS_REVOKE:${orderId}`,
            },
            tx,
          );
        }
      } else if (existing.rating < 5 && dto.rating === 5) {
        const bonusLog = await tx.reputationLog.findFirst({
          where: { userId: order.sellerId, referenceId: bonusReference },
        });
        if (!bonusLog) {
          await this.reputationService.adjustScore(
            {
              userId: order.sellerId,
              deltaPoints: 1,
              reason: `Order #${orderId.slice(0, 8)} updated to a 5-star review by buyer`,
              referenceId: bonusReference,
            },
            tx,
          );
        }
      }

      if (typeof tx?.notification?.create === 'function') {
        await publishNotification(
          tx,
          {
            userId: order.sellerId,
            title: 'Product review updated 📝',
            content: `Customer updated their review for "${existing.product.title}" to ${dto.rating} stars. New comment: "${dto.comment || EMPTY_COMMENT_FALLBACK}".`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
      }

      return updatedReview;
    });
  }

  async deleteProductReview(userId: string, orderId: string, productId: string): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.productReview.findUnique({
        where: { orderId_productId: { orderId, productId } },
        include: { product: true },
      });
      if (!existing) throw new NotFoundException(PRODUCT_REVIEW_NOT_FOUND);
      if (existing.reviewerId !== userId)
        throw new ForbiddenException('You can only delete your own review.');

      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      const newReviewCount = Math.max(0, existing.product.reviewCount - 1);
      const newRatingSum = Math.max(0, existing.product.ratingSum - existing.rating);
      const newAverage = newReviewCount > 0 ? newRatingSum / newReviewCount : 0;

      await tx.product.update({
        where: { id: productId },
        data: {
          ratingSum: newRatingSum,
          reviewCount: newReviewCount,
          averageRating: newAverage,
        },
      });

      if (existing.rating === 5) {
        const bonusReference = `REVIEW_BONUS:${orderId}`;
        const bonusLog = await tx.reputationLog.findFirst({
          where: { userId: order.sellerId, referenceId: bonusReference },
        });
        if (bonusLog) {
          await this.reputationService.adjustScore(
            {
              userId: order.sellerId,
              deltaPoints: -1,
              reason: `Revoked 5-star review bonus after customer deleted review on order #${orderId.slice(0, 8)}`,
              referenceId: `REVIEW_BONUS_DELETE:${orderId}`,
            },
            tx,
          );
        }
      }

      await tx.productReview.delete({
        where: { orderId_productId: { orderId, productId } },
      });

      return { success: true, message: 'Product review deleted successfully.' };
    });
  }

  async updateShopReview(userId: string, orderId: string, dto: ReviewInput): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { orderId },
      });
      if (!existing || !existing.isShopReview) throw new NotFoundException(SHOP_REVIEW_NOT_FOUND);
      if (existing.reviewerId !== userId)
        throw new ForbiddenException('You can only edit your own review.');

      const updated = await tx.review.update({
        where: { orderId },
        data: { rating: dto.rating, comment: dto.comment?.trim() || null },
      });

      if (typeof tx?.notification?.create === 'function') {
        await publishNotification(
          tx,
          {
            userId: existing.targetUserId,
            title: 'Shop review updated 📝',
            content: `Customer updated their review for your shop to ${dto.rating} stars. Comment: "${dto.comment || EMPTY_COMMENT_FALLBACK}".`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
      }

      return updated;
    });
  }

  async deleteShopReview(userId: string, orderId: string): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { orderId },
      });
      if (!existing || !existing.isShopReview) throw new NotFoundException(SHOP_REVIEW_NOT_FOUND);
      if (existing.reviewerId !== userId)
        throw new ForbiddenException('You can only delete your own review.');

      await tx.review.delete({ where: { orderId } });
      return { success: true, message: 'Shop review deleted successfully.' };
    });
  }

  adminListReviews(query: QueryAdminReviewsInput): Promise<unknown> {
    return this.moderationHelper.adminListReviews(query);
  }

  adminDeleteReview(
    id: string,
    type: 'product' | 'shop',
    dto: AdminDeleteReviewInput,
    actorRole?: string,
    actorId?: string,
  ) {
    return this.moderationHelper.adminDeleteReview(id, type, dto, actorRole, actorId);
  }

  replyToProductReview(sellerId: string, reviewId: string, dto: SellerReplyReviewInput) {
    return this.repliesHelper.replyToProductReview(sellerId, reviewId, dto);
  }

  toggleHelpfulProductReview(userId: string, reviewId: string) {
    return this.repliesHelper.toggleHelpfulProductReview(userId, reviewId);
  }

  adminRemoveSellerReply(
    reviewId: string,
    dto: AdminDeleteReviewInput,
    actorRole?: string,
    actorId?: string,
  ) {
    return this.moderationHelper.adminRemoveSellerReply(reviewId, dto, actorRole, actorId);
  }

  createReviewReply(
    userId: string,
    targetType: 'product' | 'shop',
    reviewId: string,
    dto: CreateReviewReplyInput,
    files?: Express.Multer.File[],
  ) {
    return this.repliesHelper.createReviewReply(userId, targetType, reviewId, dto, files);
  }

  listReviewReplies(
    targetType: 'product' | 'shop',
    reviewId: string,
    query: FeedbackPageInput,
    viewerId?: string,
  ) {
    return this.repliesHelper.listReviewReplies(targetType, reviewId, query, viewerId);
  }

  adminModerateReviewVisibility(
    adminId: string,
    targetType: 'product' | 'shop' | 'reply',
    id: string,
    dto: AdminModerateReviewVisibilityInput,
    actorRole?: string,
  ) {
    return this.moderationHelper.adminModerateReviewVisibility(
      adminId,
      targetType,
      id,
      dto,
      actorRole,
    );
  }
}
