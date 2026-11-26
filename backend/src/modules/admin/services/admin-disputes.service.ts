import { Injectable } from '@nestjs/common';
import { DisputeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { QueryAdminDisputesInput } from '../dtos/query-admin-disputes.dto';

@Injectable()
export class AdminDisputesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves paginated platform disputes with search and status filtering.
   *
   * @param query - Dispute query parameters including pagination and filters
   * @returns Paginated disputes and status summary metrics
   */
  async getDisputes(query: QueryAdminDisputesInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.DisputeWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { id: { contains: term, mode: 'insensitive' } },
        { orderId: { contains: term, mode: 'insensitive' } },
        { reason: { contains: term, mode: 'insensitive' } },
        { resolutionNotes: { contains: term, mode: 'insensitive' } },
        { openedBy: { fullName: { contains: term, mode: 'insensitive' } } },
        { openedBy: { email: { contains: term, mode: 'insensitive' } } },
        { openedBy: { phoneNumber: { contains: term, mode: 'insensitive' } } },
        { order: { seller: { fullName: { contains: term, mode: 'insensitive' } } } },
        { order: { seller: { email: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const [statusTotals, total, disputes] = await Promise.all([
      // Counted in the database. Reading every dispute to count them in
      // JavaScript moved the whole table across the wire on each page of a
      // paginated list, and grew with the dispute history for ever.
      this.prisma.dispute.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.dispute.count({ where }),
      this.prisma.dispute.findMany({
        where,
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
          resolvedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          order: {
            select: {
              id: true,
              subtotal: true,
              shippingFee: true,
              totalAmount: true,
              status: true,
              createdAt: true,
              buyer: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phoneNumber: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phoneNumber: true,
                  avatarUrl: true,
                  shopAvatarUrl: true,
                },
              },
              escrowRecord: {
                select: {
                  id: true,
                  totalAmount: true,
                  platformFee: true,
                  sellerPayout: true,
                  status: true,
                },
              },
              items: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
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

    /** Disputes in one status, or zero when there are none. */
    const countOf = (...statuses: DisputeStatus[]): number =>
      statusTotals
        .filter((row) => statuses.includes(row.status))
        .reduce((sum, row) => sum + row._count._all, 0);

    const counters = {
      all: statusTotals.reduce((sum, row) => sum + row._count._all, 0),
      pendingReview: countOf(DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW),
      open: countOf(DisputeStatus.OPEN),
      underReview: countOf(DisputeStatus.UNDER_REVIEW),
      resolvedSellerFavor: countOf(DisputeStatus.RESOLVED_SELLER_FAVOR),
      resolvedBuyerFavor: countOf(DisputeStatus.RESOLVED_BUYER_FAVOR),
      cancelled: countOf(DisputeStatus.CANCELLED),
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
      resolvedBy: d.resolvedBy,
      order: {
        id: d.order.id,
        totalAmount: Number(d.order.totalAmount),
        subtotal: Number(d.order.subtotal),
        shippingFee: Number(d.order.shippingFee),
        status: d.order.status,
        createdAt: d.order.createdAt,
        buyer: d.order.buyer,
        seller: d.order.seller,
        escrowRecord: d.order.escrowRecord
          ? {
              id: d.order.escrowRecord.id,
              totalAmount: Number(d.order.escrowRecord.totalAmount),
              platformFee: Number(d.order.escrowRecord.platformFee),
              sellerPayout: Number(d.order.escrowRecord.sellerPayout),
              status: d.order.escrowRecord.status,
            }
          : null,
        items: d.order.items.map((it) => ({
          id: it.id,
          title: it.product?.title || '',
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          totalPrice: Number(it.totalPrice),
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
}
