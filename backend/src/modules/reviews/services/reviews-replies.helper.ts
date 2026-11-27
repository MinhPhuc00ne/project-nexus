import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { MediaService } from '../../media/services/media.service';
import {
  CreateReviewReplyInput,
  FeedbackPageInput,
  SellerReplyReviewInput,
} from '../dtos/feedback.dto';
import {
  PRODUCT_REVIEW_NOT_FOUND,
  SHOP_REVIEW_NOT_FOUND,
  prepareReviewMedia,
} from './reviews-media.helper';

@Injectable()
export class ReviewsRepliesHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService?: MediaService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  async replyToProductReview(
    sellerId: string,
    reviewId: string,
    dto: SellerReplyReviewInput,
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
        throw new NotFoundException(PRODUCT_REVIEW_NOT_FOUND);
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

      if (typeof tx?.notification?.create === 'function') {
        await publishNotification(
          tx,
          {
            userId: review.reviewerId,
            title: 'Người bán đã phản hồi đánh giá của bạn 💬',
            content: `Người bán vừa trả lời đánh giá của bạn cho sản phẩm "${review.product.title}": "${updated.sellerReply}".`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
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
        throw new NotFoundException(PRODUCT_REVIEW_NOT_FOUND);
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

  private async resolveReplyTarget(
    tx: Prisma.TransactionClient,
    targetType: 'product' | 'shop',
    reviewId: string,
    userId: string,
  ): Promise<{ buyerId: string; sellerId: string; titleLabel: string }> {
    let buyerId: string;
    let sellerId: string;
    let titleLabel: string;
    let isHidden = false;

    if (targetType === 'product') {
      const review = await tx.productReview.findUnique({
        where: { id: reviewId },
        include: { product: { select: { id: true, title: true, sellerId: true } } },
      });
      if (!review) throw new NotFoundException(PRODUCT_REVIEW_NOT_FOUND);
      buyerId = review.reviewerId;
      sellerId = review.product.sellerId;
      titleLabel = `sản phẩm "${review.product.title}"`;
      isHidden = Boolean(review.isHidden);
    } else {
      const review = await tx.review.findUnique({ where: { id: reviewId } });
      if (!review || !review.isShopReview) {
        throw new NotFoundException(SHOP_REVIEW_NOT_FOUND);
      }
      buyerId = review.reviewerId;
      sellerId = review.targetUserId;
      titleLabel = 'gian hàng của bạn';
      isHidden = Boolean(review.isHidden);
    }

    if (userId !== buyerId && userId !== sellerId) {
      throw new ForbiddenException(
        'Chỉ người mua đã đánh giá hoặc người bán sở hữu mới được phản hồi cuộc trò chuyện này.',
      );
    }
    if (isHidden) {
      throw new BadRequestException('Đánh giá này đã bị ẩn, không thể gửi thêm phản hồi.');
    }

    return { buyerId, sellerId, titleLabel };
  }

  async createReviewReply(
    userId: string,
    targetType: 'product' | 'shop',
    reviewId: string,
    dto: CreateReviewReplyInput,
    files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.prisma.$transaction(async (tx) => {
      const { buyerId, sellerId, titleLabel } = await this.resolveReplyTarget(
        tx,
        targetType,
        reviewId,
        userId,
      );
      const { items: mediaItems } = await prepareReviewMedia(
        this.mediaService,
        dto.mediaUrls,
        files,
      );
      const authorRole = userId === sellerId ? Role.SELLER : Role.BUYER;
      const content = dto.content.trim();
      const createdReply = await tx.reviewReply.create({
        data: {
          ...(targetType === 'product'
            ? { productReviewId: reviewId }
            : { shopReviewId: reviewId }),
          authorId: userId,
          authorRole,
          content,
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
          data: { sellerReply: content, sellerRepliedAt: new Date() },
        });
      }

      const recipientId = userId === sellerId ? buyerId : sellerId;
      if (typeof tx?.notification?.create === 'function') {
        const senderLabel = authorRole === Role.SELLER ? 'Người bán' : 'Khách hàng';
        await publishNotification(
          tx,
          {
            userId: recipientId,
            title: 'Phản hồi mới trên đánh giá 💬',
            content: `${senderLabel} vừa phản hồi trong đánh giá ${titleLabel}: "${content}".`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
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
    query: FeedbackPageInput,
    viewerId?: string,
  ): Promise<unknown> {
    if (targetType === 'product') {
      const review = await this.prisma.productReview.findUnique({
        where: { id: reviewId },
        select: { id: true },
      });
      if (!review) throw new NotFoundException(PRODUCT_REVIEW_NOT_FOUND);
    } else {
      const review = await this.prisma.review.findUnique({
        where: { id: reviewId },
        select: { id: true, isShopReview: true },
      });
      if (!review || !review.isShopReview) {
        throw new NotFoundException(SHOP_REVIEW_NOT_FOUND);
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
}
