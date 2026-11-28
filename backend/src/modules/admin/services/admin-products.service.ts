import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { NotificationChannel, NotificationType, Prisma, ProductStatus } from '@prisma/client';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ProductTrendingService } from '../../catalog/services/product-trending.service';
import { QueryAdminProductsInput } from '../dtos/query-admin-products.dto';
import { RemoveTrendingProductInput } from '../dtos/remove-trending-product.dto';
import { UpdateProductCategoryInput } from '../dtos/update-product-category.dto';
import { UpdateProductStatusInput } from '../dtos/update-product-status.dto';

@Injectable()
export class AdminProductsService {
  private readonly logger = new Logger(AdminProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly trendingService?: ProductTrendingService,
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  /**
   * Retrieves paginated platform products with moderation and seller filters.
   *
   * @param query - Product query parameters including status, seller, and pagination
   * @returns Paginated products with stock aggregates and category metadata
   */
  async listProducts(query: QueryAdminProductsInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          seller: {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true, level: true } },
          seller: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              avatarUrl: true,
              isSellerActive: true,
            },
          },
          images: { orderBy: { sortOrder: 'asc' } },
          inventories: { select: { availableQty: true, totalQty: true, reservedQty: true } },
        },
      }),
    ]);

    const items = products.map((p) => {
      const availableQty = p.inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
      const totalQty = p.inventories.reduce((acc, curr) => acc + curr.totalQty, 0);
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        basePrice: Number(p.basePrice),
        status: p.status,
        threeModelKey: p.threeModelKey,
        weightGrams: p.weightGrams,
        category: p.category,
        seller: p.seller,
        thumbnailUrl: p.images[0]?.imageUrl || null,
        imagesCount: p.images.length,
        stock: {
          availableQty,
          totalQty,
        },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
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
   * Retrieves detailed product moderation information including inventory warehouses and 3D asset metadata.
   *
   * @param id - Unique identifier of the product
   * @returns Detailed product entity with seller, category, and inventory summaries
   * @throws NotFoundException when the product does not exist
   */
  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            level: true,
            parent: { select: { id: true, name: true } },
          },
        },
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            isSellerActive: true,
            reputationScore: true,
            trustLevel: true,
          },
        },
        images: { orderBy: { sortOrder: 'asc' } },
        inventories: {
          include: {
            warehouse: { select: { id: true, code: true, name: true, address: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    const availableQty = product.inventories.reduce((acc, curr) => acc + curr.availableQty, 0);
    const totalQty = product.inventories.reduce((acc, curr) => acc + curr.totalQty, 0);

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      basePrice: Number(product.basePrice),
      status: product.status,
      threeModelKey: product.threeModelKey,
      weightGrams: product.weightGrams,
      dimensions: {
        lengthCm: product.lengthCm,
        widthCm: product.widthCm,
        heightCm: product.heightCm,
      },
      category: product.category,
      seller: product.seller,
      images: product.images,
      inventories: product.inventories,
      stockSummary: {
        availableQty,
        totalQty,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  /**
   * Updates product publication status with shop suspension safeguards and seller notifications.
   *
   * @param id - Unique identifier of the product
   * @param adminId - Unique identifier of the reviewing administrator
   * @param dto - Status update payload including optional reason
   * @returns Updated product confirmation
   * @throws NotFoundException when the product does not exist
   * @throws BadRequestException when activating a product from a suspended shop
   */
  async updateProductStatus(id: string, adminId: string, dto: UpdateProductStatusInput) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            email: true,
            isShopSuspended: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    if (dto.status === ProductStatus.ACTIVE && product.seller?.isShopSuspended) {
      throw new BadRequestException(
        'Không thể kích hoạt sản phẩm vì gian hàng của người bán này đang bị đình chỉ hoạt động.',
      );
    }

    const oldStatus = product.status;
    const isHidden = dto.status === ProductStatus.INACTIVE;
    const actionText = isHidden ? 'đã bị tạm ẩn/khóa' : 'đã được chuyển sang trạng thái hoạt động';

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${product.sellerId} FOR UPDATE`;
      const seller = await tx.user.findUnique({
        where: { id: product.sellerId },
        select: { isShopSuspended: true },
      });
      if (!seller || (dto.status === ProductStatus.ACTIVE && seller.isShopSuspended)) {
        throw new BadRequestException('Không thể kích hoạt sản phẩm của shop đang bị đình chỉ.');
      }
      const result = await tx.product.update({
        where: { id },
        data: { status: dto.status, hiddenByShopSuspension: false },
      });
      await publishNotification(
        tx,
        {
          userId: product.sellerId,
          title: isHidden
            ? 'Sản phẩm của bạn đã bị ẩn bởi Quản trị viên ⚠️'
            : 'Sản phẩm đã được kích hoạt 🎉',
          content: `Sản phẩm "${product.title}" của bạn ${actionText}.${dto.reason ? ` Lý do: ${dto.reason}` : ''}`,
          type: NotificationType.SYSTEM,
        },
        this.notifications,
      );
      await this.auditLog?.record(
        {
          eventName: 'admin.product.status_updated',
          operatorId: adminId,
          payload: {
            productId: id,
            title: product.title,
            previousStatus: oldStatus,
            newStatus: dto.status,
            reason: dto.reason?.trim() || null,
          },
        },
        tx,
      );
      return result;
    });

    this.logger.log(
      `Admin (${adminId}) đã đổi trạng thái sản phẩm ${product.title} (${product.id}) từ ${oldStatus} sang ${dto.status}.`,
    );

    return {
      success: true,
      message: `Đã cập nhật trạng thái sản phẩm thành ${dto.status} thành công.`,
      product: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
      },
    };
  }

  /**
   * Assigns or updates a product's catalog category and notifies the seller when changed.
   *
   * @param id - Unique identifier of the product
   * @param adminId - Unique identifier of the administrator
   * @param dto - Target category payload and optional explanation note
   * @returns Updated product and category assignment details
   * @throws NotFoundException when the product or target category does not exist
   */
  async updateProductCategory(id: string, adminId: string, dto: UpdateProductCategoryInput) {
    const [product, targetCategory] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true, name: true, slug: true, level: true },
      }),
    ]);

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    if (!targetCategory) {
      throw new NotFoundException('Không tìm thấy danh mục cần gắn cho sản phẩm.');
    }

    if (product.categoryId === targetCategory.id) {
      return {
        success: true,
        message: `Sản phẩm đã thuộc danh mục "${targetCategory.name}".`,
        product: {
          id: product.id,
          title: product.title,
          categoryId: product.categoryId,
          category: targetCategory,
        },
      };
    }

    const oldCategoryName = product.category?.name || 'Chưa phân loại';
    const note = dto.reason?.trim() ? ` Ghi chú: ${dto.reason.trim()}` : '';

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.product.update({
        where: { id },
        data: { categoryId: targetCategory.id },
        include: {
          category: { select: { id: true, name: true, slug: true, level: true } },
        },
      });

      if (typeof tx?.notification?.create === 'function') {
        await publishNotification(
          tx,
          {
            userId: product.sellerId,
            title: 'Sản phẩm đã được cập nhật danh mục 🏷️',
            content: `Sản phẩm "${product.title}" của bạn đã được Quản trị viên phân loại lại từ danh mục "${oldCategoryName}" sang "${targetCategory.name}".${note}`,
            targetUrl: '/seller/products',
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
      }

      await this.auditLog?.record(
        {
          eventName: 'admin.product.category_updated',
          operatorId: adminId,
          payload: {
            productId: id,
            title: product.title,
            previousCategoryId: product.categoryId,
            newCategoryId: targetCategory.id,
            reason: dto.reason?.trim() || null,
          },
        },
        tx,
      );

      return result;
    });

    this.logger.log(
      `Admin (${adminId}) đã gắn danh mục "${targetCategory.name}" (${targetCategory.id}) cho sản phẩm ${product.title} (${product.id}).`,
    );

    return {
      success: true,
      message: `Đã gắn danh mục "${targetCategory.name}" cho sản phẩm thành công.`,
      product: {
        id: updated.id,
        title: updated.title,
        categoryId: updated.categoryId,
        category: updated.category,
      },
    };
  }

  /**
   * Deletes a product safely, converting to inactive when past orders exist.
   *
   * @param id - Unique identifier of the product
   * @param adminId - Unique identifier of the administrator
   * @returns Deletion or archival confirmation
   * @throws NotFoundException when the product does not exist
   */
  async deleteProduct(id: string, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: { select: { id: true }, take: 1 },
      },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    if (product.orderItems.length > 0) {
      await this.prisma.product.update({
        where: { id },
        data: { status: ProductStatus.INACTIVE, hiddenByShopSuspension: false },
      });
      await this.auditLog?.record({
        eventName: 'admin.product.archived',
        operatorId: adminId,
        payload: {
          productId: id,
          title: product.title,
          sellerId: product.sellerId,
        },
      });
      return {
        success: true,
        message:
          'Sản phẩm đã phát sinh đơn hàng trong quá khứ nên hệ thống đã chuyển sang trạng thái ẨN (INACTIVE) để bảo toàn lịch sử giao dịch.',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.inventoryReservation.deleteMany({ where: { inventory: { productId: id } } });
      const inventories = await tx.inventory.findMany({ where: { productId: id } });
      for (const inv of inventories) {
        await tx.inventoryLedger.deleteMany({ where: { inventoryId: inv.id } });
      }
      await tx.inventory.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
      await this.auditLog?.record(
        {
          eventName: 'admin.product.deleted',
          operatorId: adminId,
          payload: {
            productId: id,
            title: product.title,
            sellerId: product.sellerId,
          },
        },
        tx,
      );
    });

    this.logger.log(`Admin (${adminId}) đã xóa vĩnh viễn sản phẩm ${product.title} (${id}).`);

    return {
      success: true,
      message: `Đã xóa vĩnh viễn sản phẩm "${product.title}" thành công.`,
    };
  }

  /**
   * Lists current trending products ranked by total purchases for Admin moderation.
   *
   * @param limit - Maximum number of trending products to return
   * @returns Trending product list with purchase counts
   */
  async listTrendingProducts(
    limit = 20,
  ): Promise<Awaited<ReturnType<ProductTrendingService['getTrendingProducts']>>> {
    if (!this.trendingService) {
      return { items: [], total: 0 };
    }
    return this.trendingService.getTrendingProducts(limit);
  }

  /**
   * Removes a product from the HomePage trending list and notifies the seller.
   * Admin cannot manually add products to trending; only removal is permitted.
   *
   * @param id - Unique identifier of the product
   * @param adminId - Unique identifier of the administrator
   * @param dto - Optional removal reason
   * @returns Confirmation of trending exclusion
   * @throws NotFoundException when the product does not exist
   */
  async removeProductFromTrending(
    id: string,
    adminId: string,
    dto?: RemoveTrendingProductInput,
  ): Promise<{
    success: boolean;
    message: string;
    product: {
      id: string;
      title: string;
      trendingExcluded: boolean;
      trendingExcludedAt?: Date | null;
    };
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, title: true, sellerId: true, trendingExcluded: true },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }

    if (product.trendingExcluded) {
      return {
        success: true,
        message: `Sản phẩm "${product.title}" đã được gỡ khỏi Xu hướng trước đó.`,
        product: { id: product.id, title: product.title, trendingExcluded: true },
      };
    }

    const note = dto?.reason?.trim() ? ` Lý do: ${dto.reason.trim()}` : '';
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.product.update({
        where: { id },
        data: {
          trendingExcluded: true,
          trendingExcludedAt: new Date(),
        },
        select: { id: true, title: true, trendingExcluded: true, trendingExcludedAt: true },
      });

      if (typeof tx?.notification?.create === 'function') {
        await publishNotification(
          tx,
          {
            userId: product.sellerId,
            title: 'Sản phẩm đã bị gỡ khỏi Xu hướng',
            content: `Sản phẩm "${product.title}" của bạn đã bị Quản trị viên gỡ khỏi danh sách Xu hướng trên trang chủ.${note}`,
            targetUrl: '/seller/products',
            type: NotificationType.SYSTEM,
            channel: NotificationChannel.IN_APP,
          },
          this.notifications,
        );
      }

      await this.auditLog?.record(
        {
          eventName: 'admin.product.trending_removed',
          operatorId: adminId,
          payload: {
            productId: id,
            title: product.title,
            reason: dto?.reason?.trim() || null,
          },
        },
        tx,
      );

      return result;
    });

    this.logger.log(
      `Admin (${adminId}) đã gỡ sản phẩm ${product.title} (${product.id}) khỏi Xu hướng.`,
    );

    if (this.trendingService) {
      await this.trendingService.syncTopTrendingNotifications();
    }

    return {
      success: true,
      message: `Đã gỡ sản phẩm "${product.title}" khỏi danh sách Xu hướng.`,
      product: updated,
    };
  }
}
