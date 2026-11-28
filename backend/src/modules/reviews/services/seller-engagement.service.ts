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
  QuerySellerDisputesInput,
  QuerySellerReviewsInput,
  RespondDisputeInput,
} from '../dtos/seller-engagement.dto';

@Injectable()
export class SellerEngagementService {
  private readonly logger = new Logger(SellerEngagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. List customer reviews submitted for the shop with star distribution stats.
   */
  async getReviews(sellerId: string, query: QuerySellerReviewsInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.ReviewWhereInput = {
      targetUserId: sellerId,
      isHidden: false,
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
    const sortOrder: Prisma.SortOrder = query.sortBy === 'oldest' ? 'asc' : 'desc';

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
        orderBy: { createdAt: sortOrder },
        include: {
          reviewer: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          media: {
            orderBy: { sortOrder: 'asc' },
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
                  titleSnapshot: true,
                  product: {
                    select: {
                      id: true,
                      title: true,
                      images: { take: 1, orderBy: { sortOrder: 'asc' } },
                    },
                  },
                  auctionItem: { select: { title: true, images: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    // Compute average rating and star distribution (1 - 5 stars)
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
      mediaUrls: r.mediaUrls,
      media: r.media,
      createdAt: r.createdAt,
      reviewer: r.reviewer,
      order: {
        id: r.order.id,
        totalAmount: Number(r.order.totalAmount),
        items: r.order.items.map((it) => ({
          id: it.id,
          title: it.product?.title || it.auctionItem?.title || it.titleSnapshot || 'Auction item',
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          thumbnail: it.product?.images?.[0]?.imageUrl || it.auctionItem?.images?.[0] || null,
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
   * 2. List disputes on the seller's orders.
   */
  async getDisputes(sellerId: string, query: QuerySellerDisputesInput) {
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
                  titleSnapshot: true,
                  product: {
                    select: {
                      id: true,
                      title: true,
                      images: { take: 1, orderBy: { sortOrder: 'asc' } },
                    },
                  },
                  auctionItem: { select: { title: true, images: true } },
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
          title: it.product?.title || it.auctionItem?.title || it.titleSnapshot || 'Auction item',
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          thumbnail: it.product?.images?.[0]?.imageUrl || it.auctionItem?.images?.[0] || null,
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
   * 3. Seller submits an explanation/response for a dispute.
   */
  async respondToDispute(sellerId: string, disputeId: string, dto: RespondDisputeInput) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: { select: { sellerId: true } },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute record not found.');
    }

    if (dispute.order.sellerId !== sellerId) {
      throw new ForbiddenException('You do not have permission to respond to this order dispute.');
    }

    if (
      dispute.status === DisputeStatus.RESOLVED_BUYER_FAVOR ||
      dispute.status === DisputeStatus.RESOLVED_SELLER_FAVOR ||
      dispute.status === DisputeStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot submit a response because the dispute already ended in '${dispute.status}' status.`,
      );
    }

    const timestamp = new Date().toISOString();
    const existingNotes = dispute.resolutionNotes ? `${dispute.resolutionNotes}\n\n` : '';
    const newNotes = `${existingNotes}[Seller Response - ${timestamp}]: ${dto.responseNotes.trim()}`;

    // Merge evidence URLs
    let updatedEvidences: string[] = [];
    if (Array.isArray(dispute.evidenceUrls)) {
      updatedEvidences = [...(dispute.evidenceUrls as string[])];
    }
    if (dto.evidenceUrls && dto.evidenceUrls.length > 0) {
      updatedEvidences = Array.from(new Set([...updatedEvidences, ...dto.evidenceUrls]));
    }

    const updated = await this.prisma.dispute.updateMany({
      where: { id: disputeId, status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
      data: {
        resolutionNotes: newNotes,
        evidenceUrls: updatedEvidences as unknown as Prisma.InputJsonValue,
        status: DisputeStatus.UNDER_REVIEW,
      },
    });
    if (updated.count !== 1)
      throw new BadRequestException('Dispute has already been resolved and cannot be overwritten.');

    this.logger.log(`Seller ${sellerId} responded to dispute ${disputeId}`);

    return {
      success: true,
      message:
        'Dispute response submitted successfully. The Nexus moderation team will review your case.',
      disputeId,
      status: DisputeStatus.UNDER_REVIEW,
    };
  }
}
