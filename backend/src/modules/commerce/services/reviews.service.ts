import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
  Prisma,
  ReviewMediaType,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { MediaService } from '../../media/services/media.service';
import { ReputationService } from '../../users/services/reputation.service';
import {
  AdminDeleteReviewDto,
  AdminModerateReviewVisibilityDto,
  CreateReviewReplyDto,
  FeedbackPageDto,
  QueryAdminReviewsDto,
  ReviewDto,
  SellerReplyReviewDto,
} from '../dtos/feedback.dto';

interface UploadedReviewMediaItem {
  url: string;
  mediaType: ReviewMediaType;
  mimeType?: string;
  sizeBytes?: number;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputationService: ReputationService,
    @Optional() private readonly mediaService?: MediaService,
  ) {}

  private static readonly EMPTY_COMMENT_FALLBACK = 'Không có bình luận';
  private static readonly PRODUCT_REVIEW_NOT_FOUND = 'Không tìm thấy đánh giá sản phẩm.';
  private static readonly SHOP_REVIEW_NOT_FOUND = 'Không tìm thấy đánh giá gian hàng.';
  private static readonly MAX_REVIEW_MEDIA_ITEMS = 6;

  private inferReviewMediaType(url: string, mimeType?: string): ReviewMediaType {
    if (mimeType?.toLowerCase().startsWith('video/')) {
      return ReviewMediaType.VIDEO;
    }
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm')) {
      return ReviewMediaType.VIDEO;
    }
    return ReviewMediaType.IMAGE;
  }

  private async prepareReviewMedia(
    mediaUrls?: string[],
    files?: Express.Multer.File[],
  ): Promise<{ urls: string[]; items: UploadedReviewMediaItem[] }> {
    const normalizedUrls = (mediaUrls ?? []).map((u) => u.trim()).filter(Boolean);
    const totalCount = normalizedUrls.length + (files?.length ?? 0);
    if (totalCount > ReviewsService.MAX_REVIEW_MEDIA_ITEMS) {
      throw new BadRequestException(
        `Tối đa ${ReviewsService.MAX_REVIEW_MEDIA_ITEMS} hình ảnh/video cho mỗi đánh giá hoặc phản hồi.`,
      );
    }

    const items: UploadedReviewMediaItem[] = normalizedUrls.map((url) => ({
      url,
      mediaType: this.inferReviewMediaType(url),
    }));

    if (files && files.length > 0) {
      if (!this.mediaService) {
        throw new BadRequestException('Dịch vụ upload media hiện chưa sẵn sàng.');
      }
      const uploaded = await this.mediaService.uploadMultipleMedia(files, undefined, {
        strictReviewPolicy: true,
      });
      for (const item of uploaded.items) {
        items.push({
          url: item.url,
          mediaType: this.inferReviewMediaType(item.url, item.mimeType),
          mimeType: item.mimeType,
          sizeBytes: item.size,
        });
      }
    }

    return {
      urls: items.map((i) => i.url),
      items,
    };
  }

  private async persistReviewMedia(
    tx: Prisma.TransactionClient,
    target: { productReviewId?: string; shopReviewId?: string },
    items: UploadedReviewMediaItem[],
  ): Promise<void> {
    if (items.length === 0 || !tx.reviewMedia?.createMany) return;
    await tx.reviewMedia.createMany({
      data: items.map((item, index) => ({
        ...target,
        mediaType: item.mediaType,
        url: item.url,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        sortOrder: index,
      })),
    });
  }

  private buildVisibilityFilter(viewerId?: string): Record<string, unknown> {
    if (!viewerId) {
      return { isHidden: false };
    }
    return {
      OR: [{ isHidden: false }, { reviewerId: viewerId }],
    };
  }

  private async notifyBuyerReviewReceived(
    tx: Prisma.TransactionClient,
    sellerId: string,
    buyerId: string,
    title: string,
    contentPrefix: string,
    comment?: string,
  ): Promise<void> {
    if (!tx.notification?.create) return;
    const buyer = tx.user?.findUnique
      ? await tx.user.findUnique({ where: { id: buyerId }, select: { fullName: true } })
      : null;
    await tx.notification.create({
      data: {
        userId: sellerId,
        title,
        content: `Khách hàng ${buyer?.fullName || 'Người mua'} ${contentPrefix} Nhận xét: "${comment || ReviewsService.EMPTY_COMMENT_FALLBACK}".`,
        type: NotificationType.SYSTEM,
        channel: NotificationChannel.IN_APP,
      },
    });
  }

  private async createShopOrProductReview(
    tx: Prisma.TransactionClient,
    params: {
      userId: string;
      orderId: string;
      sellerId: string;
      orderItems: Array<{ productId: string | null }>;
      dto: ReviewDto;
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
    const values = { orderId, rating: dto.rating, comment: dto.comment?.trim() || null };

    if (kind === 'shop') {
      if (tx.orderItem?.aggregate) {
        const orderItemsAgg = await tx.orderItem.aggregate({
          _sum: { quantity: true },
          where: { order: { buyerId: userId, sellerId, status: 'CONFIRMED' } },
        });
        if ((orderItemsAgg._sum.quantity ?? 0) < 2) {
          throw new BadRequestException(
            'Bạn cần mua và hoàn tất ít nhất 2 sản phẩm từ gian hàng này để có thể đánh giá shop.',
          );
        }
      }

      const existingShopReview = await tx.review.findFirst({
        where: { reviewerId: userId, targetUserId: sellerId, isShopReview: true },
      });
      const created = existingShopReview
        ? await tx.review.update({
            where: { id: existingShopReview.id },
            data: {
              rating: dto.rating,
              comment: dto.comment?.trim() || null,
              ...(mediaUrls.length > 0 ? { mediaUrls } : {}),
            },
          })
        : await tx.review.create({
            data: {
              ...values,
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
        await this.persistReviewMedia(
          tx,
          { shopReviewId: String((created as { id: string }).id) },
          mediaItems,
        );
      }

      await this.notifyBuyerReviewReceived(
        tx,
        sellerId,
        userId,
        'Đánh giá gian hàng mới ⭐',
        `vừa đánh giá ${dto.rating} sao cho gian hàng của bạn.`,
        dto.comment,
      );
      return created;
    }

    if (!productId || !orderItems.some((item) => item.productId === productId)) {
      throw new BadRequestException('Sản phẩm không thuộc đơn hàng này.');
    }
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
    const created = await tx.productReview.create({
      data: { ...values, mediaUrls, reviewerId: userId, productId },
    });
    if (mediaItems.length > 0 && created && typeof created === 'object' && 'id' in created) {
      await this.persistReviewMedia(
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
      'Đánh giá mới cho sản phẩm 🌟',
      `vừa đánh giá ${dto.rating} sao cho sản phẩm "${prod?.title || 'Sản phẩm'}" trong đơn #${orderId.slice(0, 8)}.`,
      dto.comment,
    );
    return created;
  }

  private async handleReviewReputationAndAlert(
    tx: Prisma.TransactionClient,
    orderId: string,
    sellerId: string,
    dto: ReviewDto,
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
          reason: `Đơn hàng #${orderId.slice(0, 8)} nhận được đánh giá 5 sao từ người mua`,
          referenceId: bonusReference,
        },
        tx,
      );
      return;
    }

    if (dto.rating === 1) {
      const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            title: `[CẢNH BÁO SHOP] Đơn hàng #${orderId.slice(0, 8)} nhận đánh giá 1 sao`,
            content: `Người mua đã đánh giá 1 sao cho Shop ${sellerId} tại đơn hàng #${orderId.slice(0, 8)}. Nhận xét: "${dto.comment || ReviewsService.EMPTY_COMMENT_FALLBACK}". Vui lòng kiểm tra bằng chứng và xử lý qua luồng báo cáo vi phạm.`,
            type: 'DISPUTE',
            channel: 'IN_APP',
          },
        });
      }
    }
  }

  async create(
    userId: string,
    orderId: string,
    dto: ReviewDto,
    kind: 'shop' | 'product' | 'customer',
    productId?: string,
    files?: Express.Multer.File[],
  ): Promise<unknown> {
    const { urls: preparedMediaUrls, items: preparedMediaItems } =
      kind === 'customer'
        ? { urls: [], items: [] }
        : await this.prepareReviewMedia(dto.mediaUrls, files);

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
        if (!order) throw new NotFoundException('Không tìm thấy đơn hàng của bạn.');
        if (order.status !== 'CONFIRMED')
          throw new BadRequestException('Chỉ đánh giá sau khi đơn hàng đã hoàn tất.');

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
        throw new ConflictException('Đơn hàng/sản phẩm này đã được đánh giá.');
      }
      throw error;
    }
  }

  async list(
    targetId: string,
    kind: 'shop' | 'product' | 'seller-products' | 'customer',
    query: FeedbackPageDto,
    viewerId?: string,
  ): Promise<unknown> {
    const skip = (query.page - 1) * query.limit;
    const sortOrder: Prisma.SortOrder = query.sortBy === 'oldest' ? 'asc' : 'desc';
    const pagination = { skip, take: query.limit, orderBy: { createdAt: sortOrder } };
    const author = { select: { id: true, fullName: true, avatarUrl: true } };
    if (kind === 'shop') {
      const shop = await this.prisma.user.findFirst({
        where: { id: targetId, role: 'SELLER', isShopSuspended: false },
        select: { id: true },
      });
      if (!shop) throw new NotFoundException('Không tìm thấy shop.');
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
        ...(this.buildVisibilityFilter(viewerId) as Prisma.ReviewWhereInput),
      };
      const [allVisibleReviews, items, total] = await Promise.all([
        this.prisma.review.findMany({
          where: visibleStatsWhere,
          select: { rating: true },
        }),
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
      const averageRating =
        totalVisible > 0
          ? Number(
              (
                allVisibleReviews.reduce((acc, r) => acc + Number(r.rating), 0) / totalVisible
              ).toFixed(1),
            )
          : 5.0;
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
      if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    }
    const visibilityFilter = this.buildVisibilityFilter(viewerId) as Prisma.ProductReviewWhereInput;
    const where: Prisma.ProductReviewWhereInput =
      kind === 'product'
        ? {
            productId: targetId,
            ...(query.rating !== undefined ? { rating: query.rating } : {}),
            ...visibilityFilter,
          }
        : {
            product: { sellerId: targetId },
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
    dto: ReviewDto,
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.productReview.findUnique({
        where: { orderId_productId: { orderId, productId } },
        include: { product: true },
      });
      if (!existing) throw new NotFoundException(ReviewsService.PRODUCT_REVIEW_NOT_FOUND);
      if (existing.reviewerId !== userId)
        throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa đánh giá của chính mình.');

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
              reason: `Thu hồi điểm thưởng đánh giá 5 sao do khách hàng sửa xuống ${dto.rating} sao tại đơn #${orderId.slice(0, 8)}`,
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
              reason: `Đơn hàng #${orderId.slice(0, 8)} được người mua sửa lên đánh giá 5 sao`,
              referenceId: bonusReference,
            },
            tx,
          );
        }
      }

      if (tx.notification?.create) {
        await tx.notification.create({
          data: {
            userId: order.sellerId,
            title: 'Cập nhật đánh giá sản phẩm 📝',
            content: `Khách hàng vừa cập nhật đánh giá sản phẩm "${existing.product.title}" sang ${dto.rating} sao. Nhận xét mới: "${dto.comment || ReviewsService.EMPTY_COMMENT_FALLBACK}".`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
        });
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
      if (!existing) throw new NotFoundException(ReviewsService.PRODUCT_REVIEW_NOT_FOUND);
      if (existing.reviewerId !== userId)
        throw new ForbiddenException('Bạn chỉ có thể xóa đánh giá của chính mình.');

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
              reason: `Thu hồi điểm thưởng đánh giá 5 sao do khách hàng xóa đánh giá tại đơn #${orderId.slice(0, 8)}`,
              referenceId: `REVIEW_BONUS_DELETE:${orderId}`,
            },
            tx,
          );
        }
      }

      await tx.productReview.delete({
        where: { orderId_productId: { orderId, productId } },
      });

      return { success: true, message: 'Đã xóa đánh giá sản phẩm thành công.' };
    });
  }

  async updateShopReview(userId: string, orderId: string, dto: ReviewDto): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { orderId },
      });
      if (!existing || !existing.isShopReview)
        throw new NotFoundException('Không tìm thấy đánh giá gian hàng.');
      if (existing.reviewerId !== userId)
        throw new ForbiddenException('Bạn chỉ có thể chỉnh sửa đánh giá của chính mình.');

      const updated = await tx.review.update({
        where: { orderId },
        data: { rating: dto.rating, comment: dto.comment?.trim() || null },
      });

      if (tx.notification?.create) {
        await tx.notification.create({
          data: {
            userId: existing.targetUserId,
            title: 'Cập nhật đánh giá gian hàng 📝',
            content: `Khách hàng vừa cập nhật đánh giá gian hàng của bạn sang ${dto.rating} sao. Nhận xét: "${dto.comment || ReviewsService.EMPTY_COMMENT_FALLBACK}".`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
        });
      }

      return updated;
    });
  }

  async deleteShopReview(userId: string, orderId: string): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { orderId },
      });
      if (!existing || !existing.isShopReview)
        throw new NotFoundException('Không tìm thấy đánh giá gian hàng.');
      if (existing.reviewerId !== userId)
        throw new ForbiddenException('Bạn chỉ có thể xóa đánh giá của chính mình.');

      await tx.review.delete({ where: { orderId } });
      return { success: true, message: 'Đã xóa đánh giá gian hàng thành công.' };
    });
  }

  async adminListReviews(query: QueryAdminReviewsDto): Promise<unknown> {
    const skip = (query.page - 1) * query.limit;
    const take = query.limit;
    const sortOrder: Prisma.SortOrder = query.sortBy === 'oldest' ? 'asc' : 'desc';
    const authorSelect = {
      select: { id: true, fullName: true, email: true, reputationScore: true, trustLevel: true },
    };

    if (query.type === 'SHOP') {
      const where: Prisma.ReviewWhereInput = {
        isShopReview: true,
        ...(query.rating !== undefined
          ? { rating: { gte: query.rating, lt: query.rating + 1 } }
          : {}),
        ...(query.search ? { comment: { contains: query.search, mode: 'insensitive' } } : {}),
      };
      const [items, total] = await Promise.all([
        this.prisma.review.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: sortOrder },
          include: {
            reviewer: authorSelect,
            targetUser: { select: { id: true, fullName: true, email: true } },
          },
        }),
        this.prisma.review.count({ where }),
      ]);
      return {
        items: items.map((r) => ({
          id: r.id,
          type: 'SHOP',
          orderId: r.orderId,
          rating: Number(r.rating),
          comment: r.comment,
          mediaUrls: r.mediaUrls,
          isHidden: r.isHidden,
          hiddenReason: r.hiddenReason,
          createdAt: r.createdAt,
          reviewer: r.reviewer,
          target: { id: r.targetUser.id, name: r.targetUser.fullName },
        })),
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      };
    }

    const where: Prisma.ProductReviewWhereInput = {
      ...(query.rating !== undefined ? { rating: query.rating } : {}),
      ...(query.search ? { comment: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: sortOrder },
        include: {
          reviewer: authorSelect,
          product: { select: { id: true, title: true, sellerId: true } },
        },
      }),
      this.prisma.productReview.count({ where }),
    ]);
    return {
      items: items.map((r) => ({
        id: r.id,
        type: 'PRODUCT',
        orderId: r.orderId,
        rating: r.rating,
        comment: r.comment,
        mediaUrls: r.mediaUrls,
        sellerReply: r.sellerReply,
        sellerRepliedAt: r.sellerRepliedAt,
        helpfulCount: r.helpfulCount,
        isHidden: r.isHidden,
        hiddenReason: r.hiddenReason,
        createdAt: r.createdAt,
        reviewer: r.reviewer,
        target: { id: r.product.id, name: r.product.title },
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  private validatePointsToDeduct(pointsToDeduct: number, currentScore: number): void {
    if (pointsToDeduct <= 0) {
      throw new BadRequestException('Số điểm uy tín trừ phải lớn hơn 0.');
    }
    if (pointsToDeduct > currentScore) {
      throw new BadRequestException(
        `Không thể trừ quá số điểm hiện có của người dùng (tối đa ${currentScore} điểm).`,
      );
    }
  }

  async adminDeleteReview(
    id: string,
    type: 'product' | 'shop',
    dto: AdminDeleteReviewDto,
    actorRole?: string,
  ): Promise<{ success: boolean; message: string }> {
    const actorLabel = actorRole === 'SUPPORT_STAFF' ? 'Nhân viên kiểm duyệt' : 'Admin';
    const refPrefix = actorRole === 'SUPPORT_STAFF' ? 'STAFF_DELETE' : 'ADMIN_DELETE';

    return this.prisma.$transaction(async (tx) => {
      if (type === 'product') {
        const review = await tx.productReview.findUnique({
          where: { id },
          include: { reviewer: true, product: true },
        });
        if (!review) throw new NotFoundException(ReviewsService.PRODUCT_REVIEW_NOT_FOUND);

        this.validatePointsToDeduct(dto.pointsToDeduct, review.reviewer.reputationScore);

        await this.reputationService.adjustScore(
          {
            userId: review.reviewerId,
            deltaPoints: -dto.pointsToDeduct,
            reason: `Bình luận sản phẩm "${review.product.title}" bị ${actorLabel} xóa do vi phạm: ${dto.reason.trim()}`,
            referenceId: `${refPrefix}_REVIEW:${id}`,
          },
          tx,
        );

        const newReviewCount = Math.max(0, review.product.reviewCount - 1);
        const newRatingSum = Math.max(0, review.product.ratingSum - review.rating);
        const newAverage = newReviewCount > 0 ? newRatingSum / newReviewCount : 0;
        await tx.product.update({
          where: { id: review.productId },
          data: {
            ratingSum: newRatingSum,
            reviewCount: newReviewCount,
            averageRating: newAverage,
          },
        });

        await tx.productReview.delete({ where: { id } });

        if (tx.notification?.create) {
          await tx.notification.create({
            data: {
              userId: review.reviewerId,
              title: 'Đánh giá của bạn đã bị gỡ bỏ do vi phạm tiêu chuẩn ⚠️',
              content: `Bình luận của bạn tại sản phẩm "${review.product.title}" đã bị ${actorLabel} xóa với lý do: "${dto.reason.trim()}". Bạn bị trừ ${dto.pointsToDeduct} điểm uy tín.`,
              type: NotificationType.SYSTEM,
              channel: NotificationChannel.IN_APP,
            },
          });
        }

        return {
          success: true,
          message: 'Đã xóa bình luận sản phẩm và trừ điểm uy tín người dùng.',
        };
      }

      const review = await tx.review.findUnique({
        where: { id },
        include: { reviewer: true, targetUser: true },
      });
      if (!review) throw new NotFoundException('Không tìm thấy đánh giá gian hàng.');

      this.validatePointsToDeduct(dto.pointsToDeduct, review.reviewer.reputationScore);

      await this.reputationService.adjustScore(
        {
          userId: review.reviewerId,
          deltaPoints: -dto.pointsToDeduct,
          reason: `Đánh giá gian hàng bị ${actorLabel} xóa do vi phạm: ${dto.reason.trim()}`,
          referenceId: `${refPrefix}_SHOP_REVIEW:${id}`,
        },
        tx,
      );

      await tx.review.delete({ where: { id } });

      if (tx.notification?.create) {
        await tx.notification.create({
          data: {
            userId: review.reviewerId,
            title: 'Đánh giá gian hàng của bạn đã bị gỡ bỏ do vi phạm tiêu chuẩn ⚠️',
            content: `Đánh giá gian hàng của bạn đã bị ${actorLabel} xóa với lý do: "${dto.reason.trim()}". Bạn bị trừ ${dto.pointsToDeduct} điểm uy tín.`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
        });
      }

      return { success: true, message: 'Đã xóa đánh giá gian hàng và trừ điểm uy tín người dùng.' };
    });
  }

  async replyToProductReview(
    sellerId: string,
    reviewId: string,
    dto: SellerReplyReviewDto,
  ): Promise<{
    id: string;
    sellerReply: string | null;
    sellerRepliedAt: Date | null;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.productReview.findUnique({
        where: { id: reviewId },
        include: {
          product: { select: { id: true, title: true, sellerId: true } },
        },
      });

      if (!review) {
        throw new NotFoundException(ReviewsService.PRODUCT_REVIEW_NOT_FOUND);
      }

      if (review.product.sellerId !== sellerId) {
        throw new ForbiddenException(
          'Bạn chỉ có thể phản hồi đánh giá cho sản phẩm của gian hàng mình.',
        );
      }

      const updated = await tx.productReview.update({
        where: { id: reviewId },
        data: {
          sellerReply: dto.reply.trim(),
          sellerRepliedAt: new Date(),
        },
        select: {
          id: true,
          sellerReply: true,
          sellerRepliedAt: true,
        },
      });

      if (tx.notification?.create) {
        await tx.notification.create({
          data: {
            userId: review.reviewerId,
            title: 'Người bán đã phản hồi đánh giá của bạn 💬',
            content: `Người bán vừa trả lời đánh giá của bạn cho sản phẩm "${review.product.title}": "${updated.sellerReply}".`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
        });
      }

      return updated;
    });
  }

  async toggleHelpfulProductReview(
    userId: string,
    reviewId: string,
  ): Promise<{ reviewId: string; helpful: boolean; helpfulCount: number }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM product_reviews WHERE id = ${reviewId} FOR UPDATE`;
      const review = await tx.productReview.findUnique({
        where: { id: reviewId },
        select: { id: true, reviewerId: true, helpfulCount: true },
      });

      if (!review) {
        throw new NotFoundException(ReviewsService.PRODUCT_REVIEW_NOT_FOUND);
      }

      if (review.reviewerId === userId) {
        throw new BadRequestException(
          'Bạn không thể tự bình chọn hữu ích cho đánh giá của chính mình.',
        );
      }

      const existingVote = await tx.productReviewHelpfulVote.findUnique({
        where: { reviewId_userId: { reviewId, userId } },
      });

      if (existingVote) {
        await tx.productReviewHelpfulVote.delete({
          where: { id: existingVote.id },
        });
        const updated =
          review.helpfulCount > 0
            ? await tx.productReview.update({
                where: { id: reviewId },
                data: { helpfulCount: { decrement: 1 } },
                select: { helpfulCount: true },
              })
            : { helpfulCount: 0 };
        return {
          reviewId,
          helpful: false,
          helpfulCount: updated.helpfulCount,
        };
      }

      await tx.productReviewHelpfulVote.create({
        data: { reviewId, userId },
      });
      const updated = await tx.productReview.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
        select: { helpfulCount: true },
      });

      return {
        reviewId,
        helpful: true,
        helpfulCount: updated.helpfulCount,
      };
    });
  }

  async adminRemoveSellerReply(
    reviewId: string,
    dto: AdminDeleteReviewDto,
    actorRole?: string,
  ): Promise<{ success: boolean; message: string }> {
    const actorLabel = actorRole === 'SUPPORT_STAFF' ? 'Nhân viên kiểm duyệt' : 'Admin';
    const refPrefix = actorRole === 'SUPPORT_STAFF' ? 'STAFF_DELETE' : 'ADMIN_DELETE';

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.productReview.findUnique({
        where: { id: reviewId },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              sellerId: true,
              seller: { select: { reputationScore: true } },
            },
          },
        },
      });

      if (!review || !review.sellerReply) {
        throw new NotFoundException('Không tìm thấy phản hồi của người bán.');
      }

      this.validatePointsToDeduct(dto.pointsToDeduct, review.product.seller.reputationScore);

      await this.reputationService.adjustScore(
        {
          userId: review.product.sellerId,
          deltaPoints: -dto.pointsToDeduct,
          reason: `Phản hồi đánh giá tại sản phẩm "${review.product.title}" bị ${actorLabel} gỡ do vi phạm: ${dto.reason.trim()}`,
          referenceId: `${refPrefix}_SELLER_REPLY:${reviewId}`,
        },
        tx,
      );

      await tx.productReview.update({
        where: { id: reviewId },
        data: {
          sellerReply: null,
          sellerRepliedAt: null,
        },
      });

      if (tx.notification?.create) {
        await tx.notification.create({
          data: {
            userId: review.product.sellerId,
            title: 'Phản hồi đánh giá của bạn đã bị gỡ bỏ do vi phạm tiêu chuẩn ⚠️',
            content: `Phản hồi của bạn tại sản phẩm "${review.product.title}" đã bị ${actorLabel} gỡ với lý do: "${dto.reason.trim()}". Bạn bị trừ ${dto.pointsToDeduct} điểm uy tín.`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
        });
      }

      return {
        success: true,
        message: 'Đã gỡ phản hồi của người bán và trừ điểm uy tín người bán.',
      };
    });
  }

  async createReviewReply(
    userId: string,
    targetType: 'product' | 'shop',
    reviewId: string,
    dto: CreateReviewReplyDto,
    files?: Express.Multer.File[],
  ): Promise<unknown> {
    const { items: mediaItems } = await this.prepareReviewMedia(dto.mediaUrls, files);

    return this.prisma.$transaction(async (tx) => {
      let buyerId: string;
      let sellerId: string;
      let titleLabel: string;

      if (targetType === 'product') {
        const review = await tx.productReview.findUnique({
          where: { id: reviewId },
          include: { product: { select: { id: true, title: true, sellerId: true } } },
        });
        if (!review) throw new NotFoundException(ReviewsService.PRODUCT_REVIEW_NOT_FOUND);
        buyerId = review.reviewerId;
        sellerId = review.product.sellerId;
        titleLabel = `sản phẩm "${review.product.title}"`;
      } else {
        const review = await tx.review.findUnique({ where: { id: reviewId } });
        if (!review || !review.isShopReview) {
          throw new NotFoundException(ReviewsService.SHOP_REVIEW_NOT_FOUND);
        }
        buyerId = review.reviewerId;
        sellerId = review.targetUserId;
        titleLabel = 'gian hàng của bạn';
      }

      if (userId !== buyerId && userId !== sellerId) {
        throw new ForbiddenException(
          'Chỉ người mua đã đánh giá hoặc người bán sở hữu mới được phản hồi cuộc trò chuyện này.',
        );
      }

      const authorRole = userId === sellerId ? Role.SELLER : Role.BUYER;
      const createdReply = await tx.reviewReply.create({
        data: {
          ...(targetType === 'product'
            ? { productReviewId: reviewId }
            : { shopReviewId: reviewId }),
          authorId: userId,
          authorRole,
          content: dto.content.trim(),
        },
      });

      if (mediaItems.length > 0 && tx.reviewReplyMedia?.createMany) {
        await tx.reviewReplyMedia.createMany({
          data: mediaItems.map((item, idx) => ({
            replyId: createdReply.id,
            mediaType: item.mediaType,
            url: item.url,
            mimeType: item.mimeType,
            sizeBytes: item.sizeBytes,
            sortOrder: idx,
          })),
        });
      }

      if (targetType === 'product' && authorRole === Role.SELLER) {
        await tx.productReview.update({
          where: { id: reviewId },
          data: {
            sellerReply: dto.content.trim(),
            sellerRepliedAt: new Date(),
          },
        });
      }

      const recipientId = userId === sellerId ? buyerId : sellerId;
      if (tx.notification?.create) {
        await tx.notification.create({
          data: {
            userId: recipientId,
            title: 'Phản hồi mới trên đánh giá 💬',
            content: `${authorRole === Role.SELLER ? 'Người bán' : 'Khách hàng'} vừa phản hồi trong đánh giá ${titleLabel}: "${dto.content.trim()}".`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
        });
      }

      return tx.reviewReply.findUnique({
        where: { id: createdReply.id },
        include: {
          author: { select: { id: true, fullName: true, avatarUrl: true } },
          media: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, mediaType: true, url: true, mimeType: true, sizeBytes: true },
          },
        },
      });
    });
  }

  async listReviewReplies(
    targetType: 'product' | 'shop',
    reviewId: string,
    query: FeedbackPageDto,
    viewerId?: string,
  ): Promise<unknown> {
    if (targetType === 'product') {
      const review = await this.prisma.productReview.findUnique({
        where: { id: reviewId },
        select: { id: true },
      });
      if (!review) throw new NotFoundException(ReviewsService.PRODUCT_REVIEW_NOT_FOUND);
    } else {
      const review = await this.prisma.review.findUnique({
        where: { id: reviewId },
        select: { id: true, isShopReview: true },
      });
      if (!review || !review.isShopReview) {
        throw new NotFoundException(ReviewsService.SHOP_REVIEW_NOT_FOUND);
      }
    }

    const skip = (query.page - 1) * query.limit;
    const where: Prisma.ReviewReplyWhereInput = {
      ...(targetType === 'product' ? { productReviewId: reviewId } : { shopReviewId: reviewId }),
      ...(viewerId ? { OR: [{ isHidden: false }, { authorId: viewerId }] } : { isHidden: false }),
    };

    const [items, total] = await Promise.all([
      this.prisma.reviewReply.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          authorId: true,
          authorRole: true,
          content: true,
          isHidden: true,
          hiddenReason: true,
          createdAt: true,
          author: { select: { id: true, fullName: true, avatarUrl: true } },
          media: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, mediaType: true, url: true, mimeType: true, sizeBytes: true },
          },
        },
      }),
      this.prisma.reviewReply.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async adminModerateReviewVisibility(
    adminId: string,
    targetType: 'product' | 'shop' | 'reply',
    id: string,
    dto: AdminModerateReviewVisibilityDto,
    actorRole?: string,
  ): Promise<{ success: boolean; isHidden: boolean; message: string }> {
    const now = dto.isHidden ? new Date() : null;
    const reason = dto.isHidden ? dto.reason?.trim() || 'Nội dung tiêu cực / không phù hợp' : null;
    const actorLabel = actorRole === 'SUPPORT_STAFF' ? 'Nhân viên kiểm duyệt' : 'Admin';
    const refPrefix = actorRole === 'SUPPORT_STAFF' ? 'STAFF_HIDE' : 'ADMIN_HIDE';
    const pointsToDeduct = dto.isHidden ? Number(dto.pointsToDeduct ?? 0) : 0;

    return this.prisma.$transaction(async (tx) => {
      let authorId: string;
      let authorScore = 0;
      let targetLabel = '';

      if (targetType === 'product') {
        const existing = await tx.productReview.findUnique({
          where: { id },
          select: {
            id: true,
            reviewerId: true,
            reviewer: { select: { reputationScore: true } },
            product: { select: { title: true } },
          },
        });
        if (!existing) throw new NotFoundException(ReviewsService.PRODUCT_REVIEW_NOT_FOUND);
        authorId = existing.reviewerId;
        authorScore = existing.reviewer?.reputationScore ?? 0;
        targetLabel = `đánh giá sản phẩm "${existing.product.title}"`;
        await tx.productReview.update({
          where: { id },
          data: {
            isHidden: dto.isHidden,
            hiddenReason: reason,
            hiddenAt: now,
            hiddenById: dto.isHidden ? adminId : null,
          },
        });
      } else if (targetType === 'shop') {
        const existing = await tx.review.findUnique({
          where: { id },
          select: {
            id: true,
            isShopReview: true,
            reviewerId: true,
            reviewer: { select: { reputationScore: true } },
          },
        });
        if (!existing || !existing.isShopReview) {
          throw new NotFoundException(ReviewsService.SHOP_REVIEW_NOT_FOUND);
        }
        authorId = existing.reviewerId;
        authorScore = existing.reviewer?.reputationScore ?? 0;
        targetLabel = 'đánh giá gian hàng';
        await tx.review.update({
          where: { id },
          data: {
            isHidden: dto.isHidden,
            hiddenReason: reason,
            hiddenAt: now,
            hiddenById: dto.isHidden ? adminId : null,
          },
        });
      } else {
        const existingReply = await tx.reviewReply.findUnique({
          where: { id },
          select: {
            id: true,
            authorId: true,
            author: { select: { reputationScore: true } },
          },
        });
        if (!existingReply) throw new NotFoundException('Không tìm thấy phản hồi đánh giá.');
        authorId = existingReply.authorId;
        authorScore = existingReply.author?.reputationScore ?? 0;
        targetLabel = 'phản hồi đánh giá';
        await tx.reviewReply.update({
          where: { id },
          data: {
            isHidden: dto.isHidden,
            hiddenReason: reason,
            hiddenAt: now,
            hiddenById: dto.isHidden ? adminId : null,
          },
        });
      }

      if (dto.isHidden && pointsToDeduct > 0) {
        this.validatePointsToDeduct(pointsToDeduct, authorScore);
        await this.reputationService.adjustScore(
          {
            userId: authorId,
            deltaPoints: -pointsToDeduct,
            reason: `${targetLabel} bị ${actorLabel} ẩn do vi phạm: ${reason}`,
            referenceId: `${refPrefix}_${targetType.toUpperCase()}:${id}`,
          },
          tx,
        );
      }

      if (dto.isHidden && tx.notification?.create) {
        const penaltyText = pointsToDeduct > 0 ? ` Bạn bị trừ ${pointsToDeduct} điểm uy tín.` : '';
        await tx.notification.create({
          data: {
            userId: authorId,
            title: 'Nội dung đánh giá của bạn đã bị ẩn do vi phạm tiêu chuẩn ⚠️',
            content: `Nội dung ${targetLabel} của bạn đã bị ${actorLabel} ẩn với lý do: "${reason}".${penaltyText}`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
        });
      }

      return {
        success: true,
        isHidden: dto.isHidden,
        message: dto.isHidden
          ? `Đã ẩn ${targetLabel} khỏi bên nhận và hiển thị công khai.`
          : `Đã bỏ ẩn ${targetLabel}.`,
      };
    });
  }
}
