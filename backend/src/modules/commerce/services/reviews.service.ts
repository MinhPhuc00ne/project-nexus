import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ReputationService } from '../../users/services/reputation.service';
import {
  AdminDeleteReviewDto,
  FeedbackPageDto,
  QueryAdminReviewsDto,
  ReviewDto,
  SellerReplyReviewDto,
} from '../dtos/feedback.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputationService: ReputationService,
  ) {}

  private static readonly EMPTY_COMMENT_FALLBACK = 'Không có bình luận';
  private static readonly PRODUCT_REVIEW_NOT_FOUND = 'Không tìm thấy đánh giá sản phẩm.';

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
    },
  ): Promise<unknown> {
    const { userId, orderId, sellerId, orderItems, dto, kind, productId } = params;
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
            data: { rating: dto.rating, comment: dto.comment?.trim() || null },
          })
        : await tx.review.create({
            data: { ...values, reviewerId: userId, targetUserId: sellerId, isShopReview: true },
          });

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
    const mediaUrls = (dto.mediaUrls ?? []).map((url) => url.trim()).filter(Boolean);
    const created = await tx.productReview.create({
      data: { ...values, mediaUrls, reviewerId: userId, productId },
    });
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
  ): Promise<unknown> {
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
  ): Promise<unknown> {
    const skip = (query.page - 1) * query.limit;
    const pagination = { skip, take: query.limit, orderBy: { createdAt: 'desc' as const } };
    const author = { select: { id: true, fullName: true, avatarUrl: true } };
    if (kind === 'shop') {
      const shop = await this.prisma.user.findFirst({
        where: { id: targetId, role: 'SELLER', isShopSuspended: false },
        select: { id: true },
      });
      if (!shop) throw new NotFoundException('Không tìm thấy shop.');
      const where = { targetUserId: targetId, isShopReview: true };
      const [items, total] = await Promise.all([
        this.prisma.review.findMany({
          where,
          ...pagination,
          select: { id: true, rating: true, comment: true, createdAt: true, reviewer: author },
        }),
        this.prisma.review.count({ where }),
      ]);
      return { items, total, page: query.page, limit: query.limit };
    }
    if (kind === 'customer') {
      const where = { buyerId: targetId };
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
    const where: Prisma.ProductReviewWhereInput =
      kind === 'product' ? { productId: targetId } : { product: { sellerId: targetId } };
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
          createdAt: true,
          reviewer: author,
        },
      }),
      this.prisma.productReview.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
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
    const authorSelect = {
      select: { id: true, fullName: true, email: true, reputationScore: true, trustLevel: true },
    };

    if (query.type === 'SHOP') {
      const where: Prisma.ReviewWhereInput = {
        isShopReview: true,
        ...(query.search ? { comment: { contains: query.search, mode: 'insensitive' } } : {}),
      };
      const [items, total] = await Promise.all([
        this.prisma.review.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
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
      ...(query.search ? { comment: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
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
}
