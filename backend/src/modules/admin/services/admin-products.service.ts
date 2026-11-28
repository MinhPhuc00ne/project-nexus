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
      throw new NotFoundException('Product not found.');
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
      throw new NotFoundException('Product not found.');
    }

    if (dto.status === ProductStatus.ACTIVE && product.seller?.isShopSuspended) {
      throw new BadRequestException(
        'Cannot activate product because this seller store is currently suspended.',
      );
    }

    const oldStatus = product.status;
    const isHidden = dto.status === ProductStatus.INACTIVE;
    const actionText = isHidden ? 'has been temporarily hidden/locked' : 'has been set to active';

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${product.sellerId} FOR UPDATE`;
      const seller = await tx.user.findUnique({
        where: { id: product.sellerId },
        select: { isShopSuspended: true },
      });
      if (!seller || (dto.status === ProductStatus.ACTIVE && seller.isShopSuspended)) {
        throw new BadRequestException('Cannot activate product for a suspended store.');
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
            ? 'Your product was hidden by an Administrator ⚠️'
            : 'Product activated 🎉',
          content: `Your product "${product.title}" ${actionText}.${dto.reason ? ` Reason: ${dto.reason}` : ''}`,
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
      `Admin (${adminId}) changed product ${product.title} (${product.id}) status from ${oldStatus} to ${dto.status}.`,
    );

    return {
      success: true,
      message: `Product status successfully updated to ${dto.status}.`,
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
      throw new NotFoundException('Product not found.');
    }

    if (!targetCategory) {
      throw new NotFoundException('Target category not found.');
    }

    if (product.categoryId === targetCategory.id) {
      return {
        success: true,
        message: `Product is already in category "${targetCategory.name}".`,
        product: {
          id: product.id,
          title: product.title,
          categoryId: product.categoryId,
          category: targetCategory,
        },
      };
    }

    const oldCategoryName = product.category?.name || 'Uncategorized';
    const note = dto.reason?.trim() ? ` Note: ${dto.reason.trim()}` : '';

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
            title: 'Product category updated 🏷️',
            content: `Your product "${product.title}" was recategorized by an Administrator from "${oldCategoryName}" to "${targetCategory.name}".${note}`,
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
      `Admin (${adminId}) assigned category "${targetCategory.name}" (${targetCategory.id}) to product ${product.title} (${product.id}).`,
    );

    return {
      success: true,
      message: `Category "${targetCategory.name}" assigned to product successfully.`,
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
      throw new NotFoundException('Product not found.');
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
          'Product has historical orders, so it was set to INACTIVE to preserve transaction history.',
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

    this.logger.log(`Admin (${adminId}) permanently deleted product ${product.title} (${id}).`);

    return {
      success: true,
      message: `Permanently deleted product "${product.title}".`,
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
      throw new NotFoundException('Product not found.');
    }

    if (product.trendingExcluded) {
      return {
        success: true,
        message: `Product "${product.title}" was already removed from Trending.`,
        product: { id: product.id, title: product.title, trendingExcluded: true },
      };
    }

    const note = dto?.reason?.trim() ? ` Reason: ${dto.reason.trim()}` : '';
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
            title: 'Product removed from Trending',
            content: `Your product "${product.title}" was removed from the homepage Trending list by an Administrator.${note}`,
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
      `Admin (${adminId}) removed product ${product.title} (${product.id}) from Trending.`,
    );

    if (this.trendingService) {
      await this.trendingService.syncTopTrendingNotifications();
    }

    return {
      success: true,
      message: `Removed "${product.title}" from the Trending list.`,
      product: updated,
    };
  }
}
