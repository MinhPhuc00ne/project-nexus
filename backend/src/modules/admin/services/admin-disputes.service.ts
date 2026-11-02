import { Injectable, Logger } from '@nestjs/common';
import { DisputeStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { QueryAdminDisputesDto } from '../dtos/query-admin-disputes.dto';

@Injectable()
export class AdminDisputesService {
  private readonly logger = new Logger(AdminDisputesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách các khiếu nại đang chờ xử lý và toàn bộ khiếu nại trên toàn sàn
   */
  async getDisputes(query: QueryAdminDisputesDto) {
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

    const [allDisputes, total, disputes] = await Promise.all([
      this.prisma.dispute.findMany({
        select: { status: true },
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

    const counters = {
      all: allDisputes.length,
      pendingReview: allDisputes.filter(
        (d) => d.status === DisputeStatus.OPEN || d.status === DisputeStatus.UNDER_REVIEW,
      ).length,
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
