import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ReputationService } from '../../users/services/reputation.service';
import {
  AdminDeleteReviewInput,
  AdminModerateReviewVisibilityInput,
  QueryAdminReviewsInput,
} from '../dtos/feedback.dto';
import { PRODUCT_REVIEW_NOT_FOUND, SHOP_REVIEW_NOT_FOUND } from './reviews-media.helper';

@Injectable()
export class ReviewsModerationHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputationService: ReputationService,
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  async adminListReviews(query: QueryAdminReviewsInput): Promise<unknown> {
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
      throw new BadRequestException('Reputation points to deduct must be greater than 0.');
    }
    if (pointsToDeduct > currentScore) {
      throw new BadRequestException(
        `Cannot deduct more than the user's current score (max ${currentScore} points).`,
      );
    }
  }

  async adminDeleteReview(
    id: string,
    type: 'product' | 'shop',
    dto: AdminDeleteReviewInput,
    actorRole?: string,
    actorId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const actorLabel = actorRole === 'SUPPORT_STAFF' ? 'Moderation Staff' : 'Admin';
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
            reason: `Product comment on "${review.product.title}" removed by ${actorLabel} for violation: ${dto.reason.trim()}`,
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

        await this.auditLog?.record(
          {
            eventName: 'admin.review.deleted',
            operatorId: actorId ?? null,
            payload: {
              reviewId: id,
              targetType: 'product',
              reviewerId: review.reviewerId,
              pointsDeducted: dto.pointsToDeduct,
              reason: dto.reason.trim(),
              actorRole: actorRole ?? null,
            },
          },
          tx,
        );

        if (typeof tx?.notification?.create === 'function') {
          await publishNotification(
            tx,
            {
              userId: review.reviewerId,
              title: 'Your review was removed for policy violation ⚠️',
              content: `Your comment on "${review.product.title}" was removed by ${actorLabel} for reason: "${dto.reason.trim()}". ${dto.pointsToDeduct} reputation points were deducted.`,
              type: NotificationType.SYSTEM,
              channel: NotificationChannel.IN_APP,
            },
            this.notifications,
          );
        }

        return {
          success: true,
          message: 'Product review deleted and user reputation points deducted.',
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
          reason: `Shop review removed by ${actorLabel} for violation: ${dto.reason.trim()}`,
          referenceId: `${refPrefix}_SHOP_REVIEW:${id}`,
        },
        tx,
      );

      await tx.review.delete({ where: { id } });

      await this.auditLog?.record(
        {
          eventName: 'admin.review.deleted',
          operatorId: actorId ?? null,
          payload: {
            reviewId: id,
            targetType: 'shop',
            reviewerId: review.reviewerId,
            pointsDeducted: dto.pointsToDeduct,
            reason: dto.reason.trim(),
            actorRole: actorRole ?? null,
          },
        },
        tx,
      );

      if (typeof tx?.notification?.create === 'function') {
        await publishNotification(
          tx,
          {
            userId: review.reviewerId,
            title: 'Your shop review was removed for policy violation ⚠️',
            content: `Your shop review was removed by ${actorLabel} for reason: "${dto.reason.trim()}". ${dto.pointsToDeduct} reputation points were deducted.`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
      }

      return { success: true, message: 'Shop review deleted and user reputation points deducted.' };
    });
  }

  async adminRemoveSellerReply(
    reviewId: string,
    dto: AdminDeleteReviewInput,
    actorRole?: string,
    actorId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const actorLabel = actorRole === 'SUPPORT_STAFF' ? 'Moderation Staff' : 'Admin';
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
        throw new NotFoundException('Seller reply not found.');
      }

      this.validatePointsToDeduct(dto.pointsToDeduct, review.product.seller.reputationScore);

      await this.reputationService.adjustScore(
        {
          userId: review.product.sellerId,
          deltaPoints: -dto.pointsToDeduct,
          reason: `Review reply on product "${review.product.title}" removed by ${actorLabel} for violation: ${dto.reason.trim()}`,
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

      await this.auditLog?.record(
        {
          eventName: 'admin.review.seller_reply_removed',
          operatorId: actorId ?? null,
          payload: {
            reviewId,
            sellerId: review.product.sellerId,
            pointsDeducted: dto.pointsToDeduct,
            reason: dto.reason.trim(),
            actorRole: actorRole ?? null,
          },
        },
        tx,
      );

      if (typeof tx?.notification?.create === 'function') {
        await publishNotification(
          tx,
          {
            userId: review.product.sellerId,
            title: 'Your review reply was removed for policy violation ⚠️',
            content: `Your reply on product "${review.product.title}" was removed by ${actorLabel} for reason: "${dto.reason.trim()}". ${dto.pointsToDeduct} reputation points were deducted.`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
      }

      return {
        success: true,
        message: 'Seller reply removed and seller reputation points deducted.',
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
        targetLabel: `product review for "${existing.product.title}"`,
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
        targetLabel: 'shop review',
      };
    }

    const existingReply = await tx.reviewReply.findUnique({
      where: { id },
      select: { id: true, authorId: true, author: { select: { reputationScore: true } } },
    });
    if (!existingReply) throw new NotFoundException('Review reply not found.');
    await tx.reviewReply.update({ where: { id }, data: visibilityData });
    return {
      authorId: existingReply.authorId,
      authorScore: existingReply.author?.reputationScore ?? 0,
      targetLabel: 'review reply',
    };
  }

  async adminModerateReviewVisibility(
    adminId: string,
    targetType: 'product' | 'shop' | 'reply',
    id: string,
    dto: AdminModerateReviewVisibilityInput,
    actorRole?: string,
  ): Promise<{ success: boolean; isHidden: boolean; message: string }> {
    const reason = dto.isHidden ? dto.reason?.trim() || 'Inappropriate / negative content' : null;
    const actorLabel = actorRole === 'SUPPORT_STAFF' ? 'Moderation Staff' : 'Admin';
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
            reason: `${targetLabel} hidden by ${actorLabel} for violation: ${reason}`,
            referenceId: `${refPrefix}_${targetType.toUpperCase()}:${id}`,
          },
          tx,
        );
      }

      if (dto.isHidden && typeof tx?.notification?.create === 'function') {
        const penaltyText =
          pointsToDeduct > 0 ? ` ${pointsToDeduct} reputation points were deducted.` : '';
        await publishNotification(
          tx,
          {
            userId: authorId,
            title: 'Your review content was hidden for policy violation ⚠️',
            content: `Your ${targetLabel} was hidden by ${actorLabel} for reason: "${reason}".${penaltyText}`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
      }

      await this.auditLog?.record(
        {
          eventName: 'admin.review.visibility_updated',
          operatorId: adminId,
          payload: {
            reviewId: id,
            targetType,
            isHidden: dto.isHidden,
            pointsDeducted: pointsToDeduct,
            reason,
            actorRole: actorRole ?? null,
          },
        },
        tx,
      );

      return {
        success: true,
        isHidden: dto.isHidden,
        message: dto.isHidden
          ? `Hidden ${targetLabel} from public view.`
          : `Unhidden ${targetLabel}.`,
      };
    });
  }
}
