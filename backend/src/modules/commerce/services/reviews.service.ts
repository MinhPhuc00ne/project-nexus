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
} from '../dtos/feedback.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputationService: ReputationService,
  ) {}

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
        const values = { orderId, rating: dto.rating, comment: dto.comment?.trim() || null };
        let createdReview: unknown;
        if (kind === 'customer') {
          createdReview = await tx.customerReview.create({
            data: { ...values, sellerId: userId, buyerId: order.buyerId },
          });
        } else if (kind === 'shop') {
          if (tx.orderItem?.aggregate) {
            const orderItemsAgg = await tx.orderItem.aggregate({
              _sum: { quantity: true },
              where: {
                order: {
                  buyerId: userId,
                  sellerId: order.sellerId,
                  status: 'CONFIRMED',
                },
              },
            });
            const totalPurchasedQty = orderItemsAgg._sum.quantity ?? 0;
            if (totalPurchasedQty < 2) {
              throw new BadRequestException(
                'Bạn cần mua và hoàn tất ít nhất 2 sản phẩm từ gian hàng này để có thể đánh giá shop.',
              );
            }
          }

          const existingShopReview = await tx.review.findFirst({
            where: { reviewerId: userId, targetUserId: order.sellerId, isShopReview: true },
          });
          if (existingShopReview) {
            createdReview = await tx.review.update({
              where: { id: existingShopReview.id },
              data: { rating: dto.rating, comment: dto.comment?.trim() || null },
            });
          } else {
            createdReview = await tx.review.create({
              data: {
                ...values,
                reviewerId: userId,
                targetUserId: order.sellerId,
                isShopReview: true,
              },
            });
          }

          if (tx.notification?.create) {
            const buyer = tx.user?.findUnique
              ? await tx.user.findUnique({ where: { id: userId }, select: { fullName: true } })
              : null;
            await tx.notification.create({
              data: {
                userId: order.sellerId,
                title: 'Đánh giá gian hàng mới ⭐',
                content: `Khách hàng ${buyer?.fullName || 'Người mua'} vừa đánh giá ${dto.rating} sao cho gian hàng của bạn. Nhận xét: "${dto.comment || 'Không có bình luận'}".`,
                type: NotificationType.SYSTEM,
                channel: NotificationChannel.IN_APP,
              },
            });
          }
        } else {
          if (!productId || !order.items.some((item) => item.productId === productId)) {
            throw new BadRequestException('Sản phẩm không thuộc đơn hàng này.');
          }
          await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
          createdReview = await tx.productReview.create({
            data: { ...values, reviewerId: userId, productId },
          });
          const product = await tx.product.update({
            where: { id: productId },
            data: {
              ratingSum: { increment: dto.rating },
              reviewCount: { increment: 1 },
            },
          });
          await tx.product.update({
            where: { id: productId },
            data: { averageRating: product.ratingSum / product.reviewCount },
          });

          if (tx.notification?.create) {
            const buyer = tx.user?.findUnique
              ? await tx.user.findUnique({ where: { id: userId }, select: { fullName: true } })
              : null;
            const prod = tx.product?.findUnique
              ? await tx.product.findUnique({ where: { id: productId }, select: { title: true } })
              : null;
            await tx.notification.create({
              data: {
                userId: order.sellerId,
                title: 'Đánh giá mới cho sản phẩm 🌟',
                content: `Khách hàng ${buyer?.fullName || 'Người mua'} vừa đánh giá ${dto.rating} sao cho sản phẩm "${prod?.title || 'Sản phẩm'}" trong đơn #${order.id.slice(0, 8)}. Nhận xét: "${dto.comment || 'Không có bình luận'}".`,
                type: NotificationType.SYSTEM,
                channel: NotificationChannel.IN_APP,
              },
            });
          }
        }

        if (kind !== 'customer') {
          const bonusReference = `REVIEW_BONUS:${order.id}`;
          if (
            dto.rating === 5 &&
            !(await tx.reputationLog.findFirst({
              where: { userId: order.sellerId, referenceId: bonusReference },
            }))
          ) {
            await this.reputationService.adjustScore(
              {
                userId: order.sellerId,
                deltaPoints: 1,
                reason: `Đơn hàng #${order.id.slice(0, 8)} nhận được đánh giá 5 sao từ người mua`,
                referenceId: bonusReference,
              },
              tx,
            );
          } else if (dto.rating === 1) {
            const admins = await tx.user.findMany({
              where: { role: 'ADMIN' },
              select: { id: true },
            });
            for (const admin of admins) {
              await tx.notification.create({
                data: {
                  userId: admin.id,
                  title: `[CẢNH BÁO SHOP] Đơn hàng #${order.id.slice(0, 8)} nhận đánh giá 1 sao`,
                  content: `Người mua đã đánh giá 1 sao cho Shop ${order.sellerId} tại đơn hàng #${order.id.slice(0, 8)}. Nhận xét: "${dto.comment || 'Không có bình luận'}". Vui lòng kiểm tra bằng chứng và xử lý qua luồng báo cáo vi phạm.`,
                  type: 'DISPUTE',
                  channel: 'IN_APP',
                },
              });
            }
          }
        }

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
      if (!existing) throw new NotFoundException('Không tìm thấy đánh giá sản phẩm.');
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

      const updatedReview = await tx.productReview.update({
        where: { orderId_productId: { orderId, productId } },
        data: { rating: dto.rating, comment: dto.comment?.trim() || null },
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
            content: `Khách hàng vừa cập nhật đánh giá sản phẩm "${existing.product.title}" sang ${dto.rating} sao. Nhận xét mới: "${dto.comment || 'Không có bình luận'}".`,
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
      if (!existing) throw new NotFoundException('Không tìm thấy đánh giá sản phẩm.');
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
            content: `Khách hàng vừa cập nhật đánh giá gian hàng của bạn sang ${dto.rating} sao. Nhận xét: "${dto.comment || 'Không có bình luận'}".`,
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

  async adminDeleteReview(
    id: string,
    type: 'product' | 'shop',
    dto: AdminDeleteReviewDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      if (type === 'product') {
        const review = await tx.productReview.findUnique({
          where: { id },
          include: { reviewer: true, product: true },
        });
        if (!review) throw new NotFoundException('Không tìm thấy đánh giá sản phẩm.');

        if (dto.pointsToDeduct <= 0) {
          throw new BadRequestException('Số điểm uy tín trừ phải lớn hơn 0.');
        }
        if (dto.pointsToDeduct > review.reviewer.reputationScore) {
          throw new BadRequestException(
            `Không thể trừ quá số điểm hiện có của người dùng (tối đa ${review.reviewer.reputationScore} điểm).`,
          );
        }

        await this.reputationService.adjustScore(
          {
            userId: review.reviewerId,
            deltaPoints: -dto.pointsToDeduct,
            reason: `Bình luận sản phẩm "${review.product.title}" bị Admin xóa do vi phạm: ${dto.reason.trim()}`,
            referenceId: `ADMIN_DELETE_REVIEW:${id}`,
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
              content: `Bình luận của bạn tại sản phẩm "${review.product.title}" đã bị Admin xóa với lý do: "${dto.reason.trim()}". Bạn bị trừ ${dto.pointsToDeduct} điểm uy tín.`,
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

      if (dto.pointsToDeduct <= 0) {
        throw new BadRequestException('Số điểm uy tín trừ phải lớn hơn 0.');
      }
      if (dto.pointsToDeduct > review.reviewer.reputationScore) {
        throw new BadRequestException(
          `Không thể trừ quá số điểm hiện có của người dùng (tối đa ${review.reviewer.reputationScore} điểm).`,
        );
      }

      await this.reputationService.adjustScore(
        {
          userId: review.reviewerId,
          deltaPoints: -dto.pointsToDeduct,
          reason: `Đánh giá gian hàng bị Admin xóa do vi phạm: ${dto.reason.trim()}`,
          referenceId: `ADMIN_DELETE_SHOP_REVIEW:${id}`,
        },
        tx,
      );

      await tx.review.delete({ where: { id } });

      if (tx.notification?.create) {
        await tx.notification.create({
          data: {
            userId: review.reviewerId,
            title: 'Đánh giá gian hàng của bạn đã bị gỡ bỏ do vi phạm tiêu chuẩn ⚠️',
            content: `Đánh giá gian hàng của bạn đã bị Admin xóa với lý do: "${dto.reason.trim()}". Bạn bị trừ ${dto.pointsToDeduct} điểm uy tín.`,
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
        });
      }

      return { success: true, message: 'Đã xóa đánh giá gian hàng và trừ điểm uy tín người dùng.' };
    });
  }
}
