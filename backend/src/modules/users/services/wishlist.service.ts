import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { effectivePrice } from '../../../core/domain/product-price';
import { Prisma, ProductStatus, SellerRequestStatus } from '@prisma/client';
import type { WishlistItemDto } from '@nexus/types';

const wishlistProductInclude = {
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
} satisfies Prisma.WishlistItemInclude;

type WishlistItemWithProduct = Prisma.WishlistItemGetPayload<{
  include: typeof wishlistProductInclude;
}>;

/**
 * Service managing user wishlists with database persistence and guest migration.
 */
@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  private mapWishlistItem(item: WishlistItemWithProduct): WishlistItemDto {
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
  }

  /**
   * Retrieves all wishlisted products for a user ordered by most recently added.
   *
   * @param userId Authenticated user identifier.
   * @returns Array of wishlisted item DTOs.
   */
  async getWishlist(userId: string): Promise<WishlistItemDto[]> {
    const items = await this.prisma.wishlistItem.findMany({
      where: {
        userId,
        product: { status: ProductStatus.ACTIVE },
      },
      orderBy: { createdAt: 'desc' },
      include: wishlistProductInclude,
    });

    return items.map((item) => this.mapWishlistItem(item));
  }

  /**
   * Returns an array of wishlisted product IDs for fast membership checks.
   *
   * @param userId Authenticated user identifier.
   * @returns List of wishlisted product IDs.
   */
  async getWishlistIds(userId: string): Promise<string[]> {
    const items = await this.prisma.wishlistItem.findMany({
      where: {
        userId,
        product: { status: ProductStatus.ACTIVE },
      },
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
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found or unavailable.');
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
      include: wishlistProductInclude,
    });

    return this.mapWishlistItem(item);
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
      message: 'Product removed from wishlist.',
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
      where: { id: { in: uniqueIds }, status: ProductStatus.ACTIVE },
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
