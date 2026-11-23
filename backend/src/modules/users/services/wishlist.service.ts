import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { effectivePrice } from '../../catalog/utils/product-price';
import { SellerRequestStatus } from '@prisma/client';
import type { WishlistItemDto } from '@nexus/types';

/**
 * Service managing user wishlists with database persistence and guest migration.
 */
@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all wishlisted products for a user ordered by most recently added.
   *
   * @param userId Authenticated user identifier.
   * @returns Array of wishlisted item DTOs.
   */
  async getWishlist(userId: string): Promise<WishlistItemDto[]> {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
            },
            category: true,
            seller: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                shopAvatarUrl: true,
                sellerUpgradeRequests: {
                  where: { status: SellerRequestStatus.APPROVED },
                  select: { storeName: true },
                  take: 1,
                },
              },
            },
            inventories: {
              select: { availableQty: true },
            },
          },
        },
      },
    });

    return items.map((item) => {
      const { product } = item;
      const primaryImage = product.images[0]?.imageUrl ?? '';
      const approvedStore = product.seller.sellerUpgradeRequests[0]?.storeName;
      const shopName = approvedStore || product.seller.fullName || 'Shop';
      const inStock = product.inventories.reduce((acc, inv) => acc + inv.availableQty, 0) > 0;
      const currentPrice = effectivePrice(product);
      const isSale = product.salePrice !== null && currentPrice < Number(product.basePrice);

      return {
        id: product.id,
        wishlistId: item.id,
        name: product.title,
        price: currentPrice,
        originalPrice: isSale ? Number(product.basePrice) : undefined,
        img: primaryImage,
        shopName,
        category: product.category?.name,
        inStock,
        addedAt: item.createdAt.toISOString(),
      };
    });
  }

  /**
   * Returns an array of wishlisted product IDs for fast membership checks.
   *
   * @param userId Authenticated user identifier.
   * @returns List of wishlisted product IDs.
   */
  async getWishlistIds(userId: string): Promise<string[]> {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
    });
    return items.map((item) => item.productId);
  }

  /**
   * Adds a product to the user's wishlist idempotently.
   *
   * @param userId Authenticated user identifier.
   * @param productId Target product identifier.
   * @returns Added or existing wishlist item DTO.
   */
  async addToWishlist(userId: string, productId: string): Promise<WishlistItemDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại.');
    }

    const item = await this.prisma.wishlistItem.upsert({
      where: {
        userId_productId: { userId, productId },
      },
      create: {
        userId,
        productId,
      },
      update: {},
      include: {
        product: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            category: true,
            seller: {
              select: {
                id: true,
                fullName: true,
                sellerUpgradeRequests: {
                  where: { status: SellerRequestStatus.APPROVED },
                  select: { storeName: true },
                  take: 1,
                },
              },
            },
            inventories: {
              select: { availableQty: true },
            },
          },
        },
      },
    });

    const currentPrice = effectivePrice(item.product);
    const approvedStore = item.product.seller.sellerUpgradeRequests[0]?.storeName;

    return {
      id: item.product.id,
      wishlistId: item.id,
      name: item.product.title,
      price: currentPrice,
      originalPrice:
        item.product.salePrice !== null && currentPrice < Number(item.product.basePrice)
          ? Number(item.product.basePrice)
          : undefined,
      img: item.product.images[0]?.imageUrl ?? '',
      shopName: approvedStore || item.product.seller.fullName || 'Shop',
      category: item.product.category?.name,
      inStock: item.product.inventories.reduce((acc, inv) => acc + inv.availableQty, 0) > 0,
      addedAt: item.createdAt.toISOString(),
    };
  }

  /**
   * Removes a product from the user's wishlist.
   *
   * @param userId Authenticated user identifier.
   * @param productId Target product identifier.
   * @returns Removal confirmation.
   */
  async removeFromWishlist(
    userId: string,
    productId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });

    return {
      success: true,
      message: 'Đã xóa sản phẩm khỏi danh sách yêu thích.',
    };
  }

  /**
   * Merges guest wishlist product IDs into the authenticated user's wishlist.
   *
   * @param userId Authenticated user identifier.
   * @param productIds Guest product identifiers to merge.
   * @returns Updated full wishlist.
   */
  async syncGuestWishlist(userId: string, productIds: string[]): Promise<WishlistItemDto[]> {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return this.getWishlist(userId);
    }

    const uniqueIds = [...new Set(productIds.filter((id) => typeof id === 'string' && id.trim()))];
    if (uniqueIds.length === 0) {
      return this.getWishlist(userId);
    }

    const validProducts = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });

    if (validProducts.length > 0) {
      await this.prisma.wishlistItem.createMany({
        data: validProducts.map((p) => ({
          userId,
          productId: p.id,
        })),
        skipDuplicates: true,
      });
    }

    return this.getWishlist(userId);
  }
}
