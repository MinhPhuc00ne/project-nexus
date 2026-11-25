import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ReputationService } from '../../users/services/reputation.service';
import {
  AdminDeleteReviewDto,
  AdminModerateReviewVisibilityDto,
  QueryAdminReviewsDto,
} from '../dtos/feedback.dto';
import { PRODUCT_REVIEW_NOT_FOUND, SHOP_REVIEW_NOT_FOUND } from './reviews-media.helper';

export class ReviewsModerationHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputationService: ReputationService,
  ) {}

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
        if (!review) throw new NotFoundException(PRODUCT_REVIEW_NOT_FOUND);

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
      if (!review) throw new NotFoundException(SHOP_REVIEW_NOT_FOUND);

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

  private async adjustProductRatingOnVisibilityChange(
    tx: Prisma.TransactionClient,
    productId: string,
    rating: number,
    isHidden: boolean,
    wasHidden: boolean,
  ): Promise<void> {
    if (isHidden === wasHidden || !tx.product?.update) return;
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { ratingSum: true, reviewCount: true },
    });
    if (!product) return;
    const deltaCount = isHidden ? -1 : 1;
    const deltaSum = isHidden ? -rating : rating;
    const newCount = Math.max(0, product.reviewCount + deltaCount);
    const newSum = Math.max(0, product.ratingSum + deltaSum);
    await tx.product.update({
      where: { id: productId },
      data: {
        reviewCount: newCount,
        ratingSum: newSum,
        averageRating: newCount > 0 ? newSum / newCount : 0,
      },
    });
  }

  private async applyReviewVisibilityUpdate(
    tx: Prisma.TransactionClient,
    targetType: 'product' | 'shop' | 'reply',
    id: string,
    visibilityData: {
      isHidden: boolean;
      hiddenReason: string | null;
      hiddenAt: Date | null;
      hiddenById: string | null;
    },
  ): Promise<{ authorId: string; authorScore: number; targetLabel: string }> {
    if (targetType === 'product') {
      const existing = await tx.productReview.findUnique({
        where: { id },
        select: {
          id: true,
          productId: true,
          rating: true,
          isHidden: true,
          reviewerId: true,
          reviewer: { select: { reputationScore: true } },
          product: { select: { title: true } },
        },
      });
      if (!existing) throw new NotFoundException(PRODUCT_REVIEW_NOT_FOUND);
      await tx.productReview.update({ where: { id }, data: visibilityData });
      await this.adjustProductRatingOnVisibilityChange(
        tx,
        existing.productId,
        existing.rating,
        visibilityData.isHidden,
        Boolean(existing.isHidden),
      );
      return {
        authorId: existing.reviewerId,
        authorScore: existing.reviewer?.reputationScore ?? 0,
        targetLabel: `đánh giá sản phẩm "${existing.product.title}"`,
      };
    }

    if (targetType === 'shop') {
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
        throw new NotFoundException(SHOP_REVIEW_NOT_FOUND);
      }
      await tx.review.update({ where: { id }, data: visibilityData });
      return {
        authorId: existing.reviewerId,
        authorScore: existing.reviewer?.reputationScore ?? 0,
        targetLabel: 'đánh giá gian hàng',
      };
    }

    const existingReply = await tx.reviewReply.findUnique({
      where: { id },
      select: { id: true, authorId: true, author: { select: { reputationScore: true } } },
    });
    if (!existingReply) throw new NotFoundException('Không tìm thấy phản hồi đánh giá.');
    await tx.reviewReply.update({ where: { id }, data: visibilityData });
    return {
      authorId: existingReply.authorId,
      authorScore: existingReply.author?.reputationScore ?? 0,
      targetLabel: 'phản hồi đánh giá',
    };
  }

  async adminModerateReviewVisibility(
    adminId: string,
    targetType: 'product' | 'shop' | 'reply',
    id: string,
    dto: AdminModerateReviewVisibilityDto,
    actorRole?: string,
  ): Promise<{ success: boolean; isHidden: boolean; message: string }> {
    const reason = dto.isHidden ? dto.reason?.trim() || 'Nội dung tiêu cực / không phù hợp' : null;
    const actorLabel = actorRole === 'SUPPORT_STAFF' ? 'Nhân viên kiểm duyệt' : 'Admin';
    const refPrefix = actorRole === 'SUPPORT_STAFF' ? 'STAFF_HIDE' : 'ADMIN_HIDE';
    const pointsToDeduct = dto.isHidden ? Number(dto.pointsToDeduct ?? 0) : 0;
    const visibilityData = {
      isHidden: dto.isHidden,
      hiddenReason: reason,
      hiddenAt: dto.isHidden ? new Date() : null,
      hiddenById: dto.isHidden ? adminId : null,
    };

    return this.prisma.$transaction(async (tx) => {
      const { authorId, authorScore, targetLabel } = await this.applyReviewVisibilityUpdate(
        tx,
        targetType,
        id,
        visibilityData,
      );

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
