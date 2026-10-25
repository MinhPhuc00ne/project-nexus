import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DisputeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  QuerySellerDisputesDto,
  QuerySellerReviewsDto,
  RespondDisputeDto,
} from '../dtos/seller-engagement.dto';

@Injectable()
export class SellerEngagementService {
  private readonly logger = new Logger(SellerEngagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Lấy danh sách đánh giá của khách hàng gửi cho gian hàng kèm thống kê số sao
   */
  async getReviews(sellerId: string, query: QuerySellerReviewsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.ReviewWhereInput = {
      targetUserId: sellerId,
    };

    const filterWhere: Prisma.ReviewWhereInput = {
      ...baseWhere,
      ...(query.rating && {
        rating: {
          gte: query.rating,
          lt: query.rating + 1,
        },
      }),
    };

    const [allReviews, total, reviews] = await Promise.all([
      this.prisma.review.findMany({
        where: baseWhere,
        select: { rating: true },
      }),
      this.prisma.review.count({ where: filterWhere }),
      this.prisma.review.findMany({
        where: filterWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          order: {
            select: {
              id: true,
              totalAmount: true,
              items: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  product: {
                    select: {
                      id: true,
                      title: true,
                      images: { take: 1, orderBy: { sortOrder: 'asc' } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Tính điểm trung bình và phân bố sao (1 - 5 sao)
    const totalAll = allReviews.length;
    const averageRating =
      totalAll > 0
        ? Number((allReviews.reduce((acc, r) => acc + Number(r.rating), 0) / totalAll).toFixed(1))
        : 5.0;

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const r of allReviews) {
      const star = Math.min(5, Math.max(1, Math.floor(Number(r.rating)))) as 1 | 2 | 3 | 4 | 5;
      distribution[star]++;
    }

    const items = reviews.map((r) => ({
      id: r.id,
      rating: Number(r.rating),
      comment: r.comment,
      createdAt: r.createdAt,
      reviewer: r.reviewer,
      order: {
        id: r.order.id,
        totalAmount: Number(r.order.totalAmount),
        items: r.order.items.map((it) => ({
          id: it.id,
          title: it.product?.title || '',
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          thumbnail: it.product?.images?.[0]?.imageUrl || null,
        })),
      },
    }));

    return {
      stats: {
        averageRating,
        totalReviews: totalAll,
        distribution,
      },
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 2. Lấy danh sách khiếu nại (Disputes) trên các đơn hàng của người bán
   */
  async getDisputes(sellerId: string, query: QuerySellerDisputesDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.DisputeWhereInput = {
      order: { sellerId },
    };

    const filterWhere: Prisma.DisputeWhereInput = {
      ...baseWhere,
      ...(query.status && { status: query.status }),
    };

    const [allDisputes, total, disputes] = await Promise.all([
      this.prisma.dispute.findMany({
        where: baseWhere,
        select: { status: true },
      }),
      this.prisma.dispute.count({ where: filterWhere }),
      this.prisma.dispute.findMany({
        where: filterWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          openedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              avatarUrl: true,
            },
          },
          order: {
            select: {
              id: true,
              totalAmount: true,
              status: true,
              items: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  product: {
                    select: {
                      id: true,
                      title: true,
                      images: { take: 1, orderBy: { sortOrder: 'asc' } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const counters = {
      all: allDisputes.length,
      open: allDisputes.filter((d) => d.status === DisputeStatus.OPEN).length,
      underReview: allDisputes.filter((d) => d.status === DisputeStatus.UNDER_REVIEW).length,
      resolvedSellerFavor: allDisputes.filter(
        (d) => d.status === DisputeStatus.RESOLVED_SELLER_FAVOR,
      ).length,
      resolvedBuyerFavor: allDisputes.filter((d) => d.status === DisputeStatus.RESOLVED_BUYER_FAVOR)
        .length,
      cancelled: allDisputes.filter((d) => d.status === DisputeStatus.CANCELLED).length,
    };

    const items = disputes.map((d) => ({
      id: d.id,
      orderId: d.orderId,
      reason: d.reason,
      evidenceUrls: d.evidenceUrls,
      status: d.status,
      resolutionNotes: d.resolutionNotes,
      resolvedAt: d.resolvedAt,
      createdAt: d.createdAt,
      openedBy: d.openedBy,
      order: {
        id: d.order.id,
        totalAmount: Number(d.order.totalAmount),
        status: d.order.status,
        items: d.order.items.map((it) => ({
          id: it.id,
          title: it.product?.title || '',
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          thumbnail: it.product?.images?.[0]?.imageUrl || null,
        })),
      },
    }));

    return {
      items,
      counters,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 3. Người bán gửi giải trình / đối chất cho khiếu nại
   */
  async respondToDispute(sellerId: string, disputeId: string, dto: RespondDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: { select: { sellerId: true } },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Không tìm thấy bản ghi khiếu nại.');
    }

    if (dispute.order.sellerId !== sellerId) {
      throw new ForbiddenException('Bạn không có quyền phản hồi khiếu nại của đơn hàng này.');
    }

    if (
      dispute.status === DisputeStatus.RESOLVED_BUYER_FAVOR ||
      dispute.status === DisputeStatus.RESOLVED_SELLER_FAVOR ||
      dispute.status === DisputeStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Không thể gửi giải trình vì khiếu nại đã kết thúc ở trạng thái '${dispute.status}'.`,
      );
    }

    const timestamp = new Date().toISOString();
    const existingNotes = dispute.resolutionNotes ? `${dispute.resolutionNotes}\n\n` : '';
    const newNotes = `${existingNotes}[Phản hồi từ Người bán - ${timestamp}]: ${dto.responseNotes.trim()}`;

    // Hợp nhất bằng chứng
    let updatedEvidences: string[] = [];
    if (Array.isArray(dispute.evidenceUrls)) {
      updatedEvidences = [...(dispute.evidenceUrls as string[])];
    }
    if (dto.evidenceUrls && dto.evidenceUrls.length > 0) {
      updatedEvidences = Array.from(new Set([...updatedEvidences, ...dto.evidenceUrls]));
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        resolutionNotes: newNotes,
        evidenceUrls: updatedEvidences as unknown as Prisma.InputJsonValue,
        status: DisputeStatus.UNDER_REVIEW,
      },
    });

    this.logger.log(`Seller ${sellerId} responded to dispute ${disputeId}`);

    return {
      success: true,
      message: 'Đã gửi phản hồi giải trình thành công. Đội ngũ kiểm duyệt Nexus sẽ xem xét hồ sơ.',
      disputeId: updated.id,
      status: updated.status,
    };
  }
}
