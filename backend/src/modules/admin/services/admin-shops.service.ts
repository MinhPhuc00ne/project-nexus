import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { trustLevelFor } from '../../users/services/reputation-policy';
import { ReputationService } from '../../users/services/reputation.service';
import {
  NotificationType,
  OrderStatus,
  Prisma,
  ProductStatus,
  Role,
  SellerRequestStatus,
  ShopActionType,
  ViolationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { QueryAdminShopsDto } from '../dtos/query-admin-shops.dto';
import { UpdateShopStatusDto } from '../dtos/update-shop-status.dto';
import { WarnShopDto } from '../dtos/warn-shop.dto';
import { CreateShopViolationDto } from '../dtos/create-shop-violation.dto';
import { ResolveShopAppealDto } from '../dtos/resolve-shop-appeal.dto';

@Injectable()
export class AdminShopsService {
  private readonly logger = new Logger(AdminShopsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: ReputationService,
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

  /**
   * Suspends or restores store operations, toggling product visibility and logging admin audit entries.
   *
   * @param sellerId - Unique identifier of the seller
   * @param adminId - Unique identifier of the reviewing administrator
   * @param dto - Shop status update payload
   * @returns Updated shop status confirmation
   * @throws NotFoundException when the seller does not exist
   */
  async updateShopStatus(sellerId: string, adminId: string, dto: UpdateShopStatusDto) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          take: 1,
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
    }

    const isSuspending = !dto.isSellerActive;
    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;
    const actionReason =
      dto.reason?.trim() ||
      (isSuspending
        ? 'Gian hàng bị Quản trị viên tạm đình chỉ hoạt động'
        : 'Gian hàng được Quản trị viên khôi phục hoạt động');

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`;
      const updatedUser = await tx.user.update({
        where: { id: sellerId },
        data: {
          isSellerActive: dto.isSellerActive,
          isShopSuspended: isSuspending,
          suspensionReason: isSuspending ? actionReason : null,
        },
      });

      if (isSuspending) {
        await tx.product.updateMany({
          where: { sellerId, status: ProductStatus.ACTIVE },
          data: { status: ProductStatus.INACTIVE, hiddenByShopSuspension: true },
        });
      } else {
        await tx.product.updateMany({
          where: { sellerId, status: ProductStatus.INACTIVE, hiddenByShopSuspension: true },
          data: { status: ProductStatus.ACTIVE, hiddenByShopSuspension: false },
        });
      }

      await tx.shopActionLog.create({
        data: {
          shopId: sellerId,
          adminId,
          action: isSuspending ? ShopActionType.SUSPEND : ShopActionType.RESTORE,
          reason: actionReason,
        },
      });

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: isSuspending
            ? 'Gian hàng của bạn đã bị tạm đình chỉ hoạt động ⚠️'
            : 'Gian hàng của bạn đã được mở lại 🎉',
          content: isSuspending
            ? `Gian hàng "${storeName}" đã bị Quản trị viên tạm đình chỉ. Lý do: ${actionReason}. Toàn bộ sản phẩm của gian hàng đã được tạm ẩn. Bạn vẫn có thể sử dụng tài khoản để mua sắm bình thường.`
            : `Gian hàng "${storeName}" đã được khôi phục. Sản phẩm bị ẩn do đình chỉ đã được hiển thị lại; sản phẩm bị ẩn riêng vẫn giữ nguyên.`,
          type: NotificationType.SYSTEM,
        },
      });

      return updatedUser;
    });

    this.logger.log(
      `Admin (${adminId}) đã chuyển trạng thái gian hàng ${storeName} (${sellerId}) thành ${dto.isSellerActive ? 'ACTIVE' : 'SUSPENDED'}.`,
    );

    return {
      success: true,
      message: isSuspending
        ? `Đã tạm đình chỉ hoạt động gian hàng "${storeName}". Sản phẩm của shop đã được ẩn khỏi sàn.`
        : `Đã mở lại hoạt động cho gian hàng "${storeName}".`,
      shop: {
        id: result.id,
        storeName,
        isSellerActive: result.isSellerActive,
        isShopSuspended: result.isShopSuspended,
        suspensionReason: result.suspensionReason,
        status: result.isShopSuspended
          ? 'SUSPENDED'
          : result.isSellerActive
            ? 'ACTIVE'
            : 'INACTIVE',
      },
    };
  }

  /**
   * Issues a formal warning to a seller store, optionally deducting reputation points.
   *
   * @param sellerId - Unique identifier of the seller
   * @param adminId - Unique identifier of the administrator
   * @param dto - Warning details including reason and penalty points
   * @returns Created warning action log
   * @throws NotFoundException when the seller store does not exist
   */
  async warnShop(sellerId: string, adminId: string, dto: WarnShopDto) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          take: 1,
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
    }

    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;
    const penaltyPoints = Math.max(0, dto.penaltyPoints || 0);

    const log = await this.prisma.$transaction(async (tx) => {
      if (penaltyPoints > 0) {
        await this.reputation.adjustScore(
          {
            userId: sellerId,
            deltaPoints: -penaltyPoints,
            reason: `Cảnh cáo vi phạm gian hàng: ${dto.reason.trim()}`,
            skipNotification: true,
          },
          tx,
        );
      }

      const createdLog = await tx.shopActionLog.create({
        data: {
          shopId: sellerId,
          adminId,
          action: ShopActionType.WARN,
          reason: dto.reason.trim(),
        },
        include: {
          admin: { select: { id: true, fullName: true, email: true } },
        },
      });

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: 'Cảnh cáo vi phạm quy định gian hàng ⚠️',
          content: `Gian hàng "${storeName}" đã nhận cảnh cáo từ Quản trị viên. Lý do: ${dto.reason.trim()}.${
            penaltyPoints > 0 ? ` Tài khoản bị trừ ${penaltyPoints} điểm uy tín.` : ''
          } Vui lòng rà soát lại thông tin và hoạt động kinh doanh để tránh bị tạm đình chỉ.`,
          type: NotificationType.SYSTEM,
        },
      });

      return createdLog;
    });

    return {
      success: true,
      message: `Đã gửi văn bản cảnh cáo tới gian hàng "${storeName}" thành công.`,
      warning: {
        id: log.id,
        action: log.action,
        reason: log.reason,
        createdAt: log.createdAt,
        penaltyPointsDeducted: penaltyPoints,
        admin: log.admin,
      },
    };
  }

  /**
   * Records a confirmed violation report for a seller store.
   *
   * @param sellerId - Unique identifier of the seller
   * @param adminId - Unique identifier of the reviewing administrator
   * @param dto - Violation creation payload
   * @returns Created violation record
   * @throws NotFoundException when the seller store does not exist
   */
  async createShopViolation(sellerId: string, adminId: string, dto: CreateShopViolationDto) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          take: 1,
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
    }

    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;

    const violation = await this.prisma.$transaction(async (tx) => {
      const v = await tx.shopViolation.create({
        data: {
          shopId: sellerId,
          title: dto.title.trim(),
          description: dto.description.trim(),
          evidenceUrls: dto.evidenceUrls || [],
          penaltyLevel: dto.penaltyLevel?.trim() || 'WARNING',
          status: dto.status || ViolationStatus.CONFIRMED,
          resolutionNotes: dto.resolutionNotes?.trim() || null,
          handledByAdminId: adminId,
          handledAt: new Date(),
        },
        include: {
          handledBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: 'Xác nhận vi phạm quy chế sàn thương mại điện tử ⚠️',
          content: `Gian hàng "${storeName}" vừa bị lập biên bản vi phạm: "${dto.title}". Mức xử lý: ${
            dto.penaltyLevel || 'Cảnh cáo'
          }.${dto.resolutionNotes ? ` Hướng giải quyết: ${dto.resolutionNotes}` : ''}`,
          type: NotificationType.SYSTEM,
        },
      });

      return v;
    });

    return {
      success: true,
      message: `Đã ghi nhận hồ sơ vi phạm của gian hàng "${storeName}" thành công.`,
      violation,
    };
  }

  /**
   * Retrieves violation records for a specific seller store.
   *
   * @param sellerId - Unique identifier of the seller
   * @returns List of shop violations
   */
  async getShopViolations(sellerId: string) {
    const violations = await this.prisma.shopViolation.findMany({
      where: { shopId: sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        handledBy: { select: { id: true, fullName: true, email: true } },
        reporter: { select: { id: true, fullName: true, email: true } },
      },
    });

    return {
      total: violations.length,
      items: violations,
    };
  }

  /**
   * Retrieves administrator action audit logs for a seller store.
   *
   * @param sellerId - Unique identifier of the seller
   * @returns List of shop action logs
   */
  async getShopActionLogs(sellerId: string) {
    const logs = await this.prisma.shopActionLog.findMany({
      where: { shopId: sellerId },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { id: true, fullName: true, email: true } },
      },
    });

    return {
      total: logs.length,
      items: logs,
    };
  }

  /**
   * Approves an appeal for a suspended or penalized seller store, restores reputation standing,
   * reactivates catalog products, and records an administrative audit log.
   *
   * @param sellerId - Unique identifier of the seller
   * @param adminId - Unique identifier of the acting administrator
   * @param dto - Appeal resolution details
   * @returns Resolution confirmation and updated store status
   * @throws NotFoundException when the seller store does not exist
   */
  async resolveShopAppeal(sellerId: string, adminId: string, dto: ResolveShopAppealDto) {
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          take: 1,
        },
      },
    });

    if (!seller || seller.role !== Role.SELLER) {
      throw new NotFoundException('Không tìm thấy gian hàng của người bán này.');
    }

    const storeName = seller.sellerUpgradeRequests[0]?.storeName || seller.fullName;
    const targetScore = Math.max(50, Math.min(2147483647, dto.restoredScore ?? 100));
    const deltaPoints = targetScore - seller.reputationScore;

    const newTrustLevel = trustLevelFor(targetScore);

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: sellerId },
        data: {
          reputationScore: targetScore,
          trustLevel: newTrustLevel,
          isShopSuspended: false,
          suspensionReason: null,
          isSellerActive: true,
        },
      });

      await tx.product.updateMany({
        where: { sellerId, status: ProductStatus.INACTIVE },
        data: { status: ProductStatus.ACTIVE },
      });

      await tx.reputationLog.create({
        data: {
          userId: sellerId,
          deltaPoints,
          balanceAfter: targetScore,
          reason: `Chấp thuận giải trình kháng cáo gian hàng: ${dto.reason.trim()}`,
        },
      });

      const actionLog = await tx.shopActionLog.create({
        data: {
          shopId: sellerId,
          adminId,
          action: ShopActionType.RESTORE,
          reason: dto.reason.trim(),
        },
        include: {
          admin: { select: { id: true, fullName: true, email: true } },
        },
      });

      await tx.notification.create({
        data: {
          userId: sellerId,
          title: 'Tài khoản gian hàng đã được khôi phục!',
          content: `Giải trình của bạn đã được Ban Quản Trị chấp thuận. Gian hàng "${storeName}" đã được mở khóa và khôi phục điểm uy tín lên ${targetScore} (${newTrustLevel}). Danh sách sản phẩm của bạn đã hoạt động trở lại.`,
          type: NotificationType.SYSTEM,
        },
      });

      return { updatedUser, actionLog };
    });

    this.logger.log(
      `Admin (${adminId}) approved appeal for store '${storeName}' (${sellerId}). Restored score: ${targetScore}, Trust: ${newTrustLevel}.`,
    );

    return {
      success: true,
      message: `Đã chấp thuận giải trình và khôi phục hoạt động cho gian hàng "${storeName}".`,
      shop: {
        id: seller.id,
        storeName,
        reputationScore: targetScore,
        trustLevel: newTrustLevel,
        isShopSuspended: false,
        restoredByAdmin: result.actionLog.admin,
      },
    };
  }
}
