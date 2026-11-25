import { Injectable, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  ProductStatus,
  Role,
  SellerRequestStatus,
  ViolationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateShopViolationDto } from '../dtos/create-shop-violation.dto';
import { QueryAdminShopsDto } from '../dtos/query-admin-shops.dto';
import { ResolveShopAppealDto } from '../dtos/resolve-shop-appeal.dto';
import { UpdateShopStatusDto } from '../dtos/update-shop-status.dto';
import { WarnShopDto } from '../dtos/warn-shop.dto';
import { AdminShopsModerationHelper } from './admin-shops-moderation.helper';

@Injectable()
export class AdminShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderationHelper: AdminShopsModerationHelper,
  ) {}

  /**
   * Retrieves paginated platform seller stores with operational metrics and search filters.
   *
   * @param query - Query filter and pagination parameters
   * @returns Paginated list of store summaries with violation flags and revenue totals
   */
  async listShops(query: QueryAdminShopsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: Role.SELLER,
    };

    if (query.status === 'ACTIVE') {
      where.isShopSuspended = false;
    } else if (query.status === 'SUSPENDED') {
      where.isShopSuspended = true;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        {
          sellerUpgradeRequests: {
            some: {
              OR: [
                { storeName: { contains: search, mode: 'insensitive' } },
                { storeDescription: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    if (query.city?.trim()) {
      where.addresses = {
        some: {
          city: { contains: query.city.trim(), mode: 'insensitive' },
        },
      };
    }

    const [total, sellers] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sellerUpgradeRequests: {
            where: { status: SellerRequestStatus.APPROVED },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          addresses: {
            where: { isDefault: true },
            take: 1,
          },
          _count: {
            select: {
              products: true,
            },
          },
        },
      }),
    ]);

    const items = sellers.map((s) => {
      const latestRequest = s.sellerUpgradeRequests[0];
      const defaultAddress = s.addresses[0];
      return {
        id: s.id,
        sellerFullName: s.fullName,
        sellerEmail: s.email,
        sellerPhone: s.phoneNumber,
        storeName: latestRequest?.storeName || s.fullName,
        storeDescription: latestRequest?.storeDescription || null,
        avatarUrl: s.shopAvatarUrl,
        isSellerActive: s.isSellerActive,
        isShopSuspended: s.isShopSuspended,
        suspensionReason: s.suspensionReason,
        status: s.isShopSuspended ? 'SUSPENDED' : 'ACTIVE',
        totalProducts: s._count.products,
        address: defaultAddress
          ? {
              street: defaultAddress.street,
              ward: defaultAddress.ward,
              district: defaultAddress.district,
              city: defaultAddress.city,
              formattedAddress: defaultAddress.formattedAddress,
            }
          : null,
        createdAt: s.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves comprehensive 360-degree store profile for administrator review.
   *
   * @param shopId - Unique identifier of the seller
   * @returns Detailed seller store profile with products, orders, violations, and audit history
   * @throws NotFoundException when the seller profile does not exist
   */
  async getShopDetail(shopId: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id: shopId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
        products: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            category: { select: { id: true, name: true, slug: true } },
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            inventories: { select: { availableQty: true, totalQty: true } },
            auctions: { select: { id: true, status: true }, take: 1 },
          },
        },
        shopViolations: {
          orderBy: { createdAt: 'desc' },
          include: {
            handledBy: { select: { id: true, fullName: true, email: true } },
            reporter: { select: { id: true, fullName: true, email: true } },
          },
        },
        shopActionLogs: {
          orderBy: { createdAt: 'desc' },
          include: {
            admin: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
    }

    const latestApprovedRequest = seller.sellerUpgradeRequests[0];
    const defaultAddress = seller.addresses[0];

    const [allProducts, orders, reviews, disputes] = await Promise.all([
      this.prisma.product.findMany({
        where: { sellerId: shopId },
        select: {
          id: true,
          status: true,
          inventories: { select: { availableQty: true } },
          auctions: { select: { id: true, status: true }, take: 1 },
        },
      }),
      this.prisma.order.findMany({
        where: { sellerId: shopId },
        include: {
          escrowRecord: true,
        },
      }),
      this.prisma.review.findMany({
        where: { targetUserId: shopId, isShopReview: true },
        select: { rating: true },
      }),
      this.prisma.dispute.findMany({
        where: { order: { sellerId: shopId } },
        select: { id: true, status: true },
      }),
    ]);

    let activeCount = 0;
    let outOfStockCount = 0;
    let inactiveCount = 0;
    let draftCount = 0;
    let regularCount = 0;
    let auctionCount = 0;

    for (const p of allProducts) {
      const availableQty = p.inventories.reduce((acc, inv) => acc + inv.availableQty, 0);
      if (p.status === ProductStatus.ACTIVE) {
        if (availableQty > 0) {
          activeCount++;
        } else {
          outOfStockCount++;
        }
      } else if (p.status === ProductStatus.INACTIVE) {
        inactiveCount++;
      } else if (p.status === ProductStatus.DRAFT) {
        draftCount++;
      }

      if (p.auctions && p.auctions.length > 0) {
        auctionCount++;
      } else {
        regularCount++;
      }
    }

    const pendingViolations = seller.shopViolations.filter(
      (v) => v.status === ViolationStatus.PENDING || v.status === ViolationStatus.INVESTIGATING,
    );
    const confirmedViolations = seller.shopViolations.filter(
      (v) => v.status === ViolationStatus.CONFIRMED,
    );

    const completedOrders = orders.filter((o) => o.status === OrderStatus.CONFIRMED);
    const completedOrdersCount = completedOrders.length;
    const completedOrderValue = completedOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
    const refundedOrders = orders.filter(
      (o) => o.status === OrderStatus.REFUNDED || o.escrowRecord?.status === 'REFUNDED',
    );
    const refundedAmount = refundedOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0);
    const platformFeeCollected = orders.reduce((acc, o) => {
      if (o.escrowRecord?.status === 'DISBURSED' && o.escrowRecord.platformFee !== null) {
        return acc + Number(o.escrowRecord.platformFee);
      }
      return acc;
    }, 0);

    const processingOrdersCount = orders.filter(
      (o) => o.status === OrderStatus.PAID || o.status === OrderStatus.PREPARING,
    ).length;
    const shippingOrdersCount = orders.filter((o) => o.status === OrderStatus.SHIPPING).length;
    const cancelledOrdersCount = orders.filter((o) => o.status === OrderStatus.CANCELLED).length;

    const totalReviews = reviews.length;
    const ratingScore =
      totalReviews > 0
        ? Number((reviews.reduce((acc, r) => acc + Number(r.rating), 0) / totalReviews).toFixed(1))
        : null;
    const sellerCancelledOrders = orders.filter(
      (o) => o.status === 'CANCELLED' && o.cancellationActor === 'SELLER',
    ).length;
    const unknownCancellationCount = orders.filter(
      (o) => o.status === 'CANCELLED' && !o.cancellationActor,
    ).length;
    const cancellationRate = unknownCancellationCount
      ? null
      : orders.length > 0
        ? Number(((sellerCancelledOrders / orders.length) * 100).toFixed(1))
        : 0;
    const disputeCount = disputes.length;
    const returnOrDisputeRate =
      orders.length > 0 ? Number(((disputeCount / orders.length) * 100).toFixed(1)) : 0;
    // Legacy shipments do not store an authoritative carrier delivery timestamp.
    const lateDeliveryRate = null;

    return {
      shop: {
        id: seller.id,
        storeName: latestApprovedRequest?.storeName || seller.fullName,
        avatarUrl: seller.shopAvatarUrl,
        storeDescription: latestApprovedRequest?.storeDescription || null,
        owner: {
          id: seller.id,
          fullName: seller.fullName,
          email: seller.email,
          phone: seller.phoneNumber,
          avatarUrl: seller.avatarUrl,
        },
        contact: {
          phone: latestApprovedRequest?.phone || seller.phoneNumber,
          businessEmail: latestApprovedRequest?.businessEmail || seller.email,
          identityCardNumber: latestApprovedRequest?.identityCardNumber || null,
          address: latestApprovedRequest
            ? {
                street: latestApprovedRequest.street,
                ward: latestApprovedRequest.ward,
                district: latestApprovedRequest.district,
                city: latestApprovedRequest.city,
                formattedAddress: latestApprovedRequest.formattedAddress,
                latitude: latestApprovedRequest.latitude
                  ? Number(latestApprovedRequest.latitude)
                  : null,
                longitude: latestApprovedRequest.longitude
                  ? Number(latestApprovedRequest.longitude)
                  : null,
              }
            : defaultAddress
              ? {
                  street: defaultAddress.street,
                  ward: defaultAddress.ward,
                  district: defaultAddress.district,
                  city: defaultAddress.city,
                  formattedAddress: defaultAddress.formattedAddress,
                  latitude: defaultAddress.latitude ? Number(defaultAddress.latitude) : null,
                  longitude: defaultAddress.longitude ? Number(defaultAddress.longitude) : null,
                }
              : null,
        },
        openedAt: latestApprovedRequest?.createdAt || seller.createdAt,
        status: {
          isSellerActive: seller.isSellerActive,
          isShopSuspended: seller.isShopSuspended,
          currentStatus: seller.isShopSuspended ? 'SUSPENDED' : 'ACTIVE',
          suspensionReason: seller.suspensionReason,
          reputationScore: seller.reputationScore,
          trustLevel: seller.trustLevel,
        },
      },
      products: {
        breakdown: {
          total: allProducts.length,
          active: activeCount,
          outOfStock: outOfStockCount,
          inactive: inactiveCount,
          draft: draftCount,
          regular: regularCount,
          auction: auctionCount,
        },
        sampleList: seller.products.map((p) => {
          const availableQty = p.inventories.reduce((acc, inv) => acc + inv.availableQty, 0);
          const totalQty = p.inventories.reduce((acc, inv) => acc + inv.totalQty, 0);
          const hasAuction = Boolean((p as { auctions?: unknown[] }).auctions?.length);
          return {
            id: p.id,
            title: p.title,
            basePrice: Number(p.basePrice),
            status: p.status,
            category: p.category,
            thumbnail: p.images[0]?.imageUrl || null,
            availableQty,
            totalQty,
            isOutOfStock: availableQty <= 0,
            productType: hasAuction ? 'AUCTION' : 'REGULAR',
            createdAt: p.createdAt,
          };
        }),
      },
      business: {
        completedOrderValue,
        completedOrdersCount,
        refundedAmount,
        platformFeeCollected,
        totalRevenue: completedOrderValue,
        currency: 'VND',
      },
      orders: {
        summary: {
          total: orders.length,
          processing: processingOrdersCount,
          shipping: shippingOrdersCount,
          completed: completedOrdersCount,
          cancelled: cancelledOrdersCount,
          refunded: refundedOrders.length,
        },
      },
      serviceQuality: {
        ratingScore,
        totalReviews,
        cancellationRate,
        sellerCancelledOrders,
        unknownCancellationCount,
        lateDeliveryRate,
        lateDeliveryDataAvailable: false,
        returnOrDisputeRate,
        disputeCount,
      },
      violations: {
        summary: {
          total: seller.shopViolations.length,
          pending: pendingViolations.length,
          confirmed: confirmedViolations.length,
        },
        items: seller.shopViolations.map((v) => ({
          id: v.id,
          productId: v.productId,
          title: v.title,
          description: v.description,
          evidenceUrls: v.evidenceUrls,
          penaltyLevel: v.penaltyLevel,
          status: v.status,
          resolutionNotes: v.resolutionNotes,
          handledAt: v.handledAt,
          handledBy: v.handledBy
            ? {
                id: v.handledBy.id,
                fullName: v.handledBy.fullName,
                email: v.handledBy.email,
              }
            : null,
          reporter: v.reporter
            ? {
                id: v.reporter.id,
                fullName: v.reporter.fullName,
                email: v.reporter.email,
              }
            : null,
          createdAt: v.createdAt,
        })),
      },
      moderationHistory: seller.shopActionLogs.map((log) => ({
        id: log.id,
        action: log.action,
        reason: log.reason,
        createdAt: log.createdAt,
        admin: {
          id: log.admin.id,
          fullName: log.admin.fullName,
          email: log.admin.email,
        },
      })),
    };
  }

  /**
   * Retrieves paginated orders for a specific seller store for administrator inspection.
   *
   * @param shopId - Unique identifier of the seller
   * @param query - Order status filter and pagination parameters
   * @returns Paginated orders for the store
   * @throws NotFoundException when the seller store does not exist
   */
  async getShopOrders(
    shopId: string,
    query: { status?: OrderStatus; page?: number; limit?: number },
  ) {
    if (
      !(await this.prisma.user.findFirst({
        where: { id: shopId, role: 'SELLER' },
        select: { id: true },
      }))
    ) {
      throw new NotFoundException('Không tìm thấy shop.');
    }
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      sellerId: shopId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              avatarUrl: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  images: { take: 1, orderBy: { sortOrder: 'asc' } },
                },
              },
            },
          },
          shipment: true,
          escrowRecord: true,
        },
      }),
    ]);

    const items = orders.map((o) => ({
      id: o.id,
      buyer: o.buyer,
      subtotal: Number(o.subtotal),
      shippingFee: Number(o.shippingFee),
      totalAmount: Number(o.totalAmount),
      status: o.status,
      shippingAddress: o.shippingAddressSnapshot,
      itemsCount: o.items.reduce((acc, it) => acc + it.quantity, 0),
      items: o.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        selections: it.selections,
        title: it.product?.title || '',
        thumbnail: it.product?.images?.[0]?.imageUrl || null,
        unitPrice: Number(it.unitPrice),
        quantity: it.quantity,
        totalPrice: Number(it.totalPrice),
      })),
      shipment: o.shipment
        ? {
            carrier: o.shipment.carrier,
            trackingNumber: o.shipment.trackingNumber,
            waybillCode: o.shipment.waybillCode,
            status: o.shipment.status,
          }
        : null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  updateShopStatus(sellerId: string, adminId: string, dto: UpdateShopStatusDto) {
    return this.moderationHelper.updateShopStatus(sellerId, adminId, dto);
  }

  warnShop(sellerId: string, adminId: string, dto: WarnShopDto) {
    return this.moderationHelper.warnShop(sellerId, adminId, dto);
  }

  createShopViolation(sellerId: string, adminId: string, dto: CreateShopViolationDto) {
    return this.moderationHelper.createShopViolation(sellerId, adminId, dto);
  }

  getShopViolations(sellerId: string) {
    return this.moderationHelper.getShopViolations(sellerId);
  }

  getShopActionLogs(sellerId: string) {
    return this.moderationHelper.getShopActionLogs(sellerId);
  }

  resolveShopAppeal(sellerId: string, adminId: string, dto: ResolveShopAppealDto) {
    return this.moderationHelper.resolveShopAppeal(sellerId, adminId, dto);
  }
}
