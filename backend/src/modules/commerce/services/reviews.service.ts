import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ReputationService } from '../../users/services/reputation.service';
import { FeedbackPageDto, ReviewDto } from '../dtos/feedback.dto';

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
          createdReview = await tx.review.create({
            data: {
              ...values,
              reviewerId: userId,
              targetUserId: order.sellerId,
              isShopReview: true,
            },
          });
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
        }

        if (kind !== 'customer') {
          if (dto.rating === 5) {
            await this.reputationService.adjustScore(
              {
                userId: order.sellerId,
                deltaPoints: 1,
                reason: `Đơn hàng #${order.id.slice(0, 8)} nhận được đánh giá 5 sao từ người mua`,
                referenceId: order.id,
              },
              tx,
            );
          } else if (dto.rating === 1) {
            await this.reputationService.adjustScore(
              {
                userId: order.sellerId,
                deltaPoints: -15,
                reason: `Đơn hàng #${order.id.slice(0, 8)} bị người mua đánh giá 1 sao`,
                referenceId: order.id,
              },
              tx,
            );

            const admins = await tx.user.findMany({
              where: { role: 'ADMIN' },
              select: { id: true },
            });
            for (const admin of admins) {
              await tx.notification.create({
                data: {
                  userId: admin.id,
                  title: `[CẢNH BÁO SHOP] Đơn hàng #${order.id.slice(0, 8)} nhận đánh giá 1 sao`,
                  content: `Người mua đã đánh giá 1 sao cho Shop ${order.sellerId} tại đơn hàng #${order.id.slice(0, 8)}. Nhận xét: "${dto.comment || 'Không có bình luận'}". Hệ thống đã tự động trừ -15 điểm uy tín và chuyển thông tin đến Ban Quản Trị giám sát.`,
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
}
