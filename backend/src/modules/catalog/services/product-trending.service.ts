import { Injectable } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationType,
  OrderStatus,
  ProductStatus,
  SellerRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { formatProductSummary } from '../utils/product.util';
import { InventoryService } from './inventory.service';

const QUALIFYING_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.CONFIRMED,
];

export interface TrendingSellerInfo {
  id: string;
  fullName: string;
  storeName: string | null;
  avatarUrl: string | null;
  shopAvatarUrl: string | null;
  reputationScore: number;
  trustLevel: string | null;
}

export type TrendingProductItem = Omit<ReturnType<typeof formatProductSummary>, 'seller'> & {
  seller: TrendingSellerInfo | null;
  shopName: string | null;
  reputationScore: number;
  buyerCount: number;
  purchaseCount: number;
  lastPurchaseAt: Date | null;
  isTrending: boolean;
  trendingNotifiedAt: Date | null;
};

export interface TrendingProductsResult {
  items: TrendingProductItem[];
  total: number;
}

/** Computes storefront trending products by purchase count then earliest milestone timestamp, and notifies the #1 shop. */
@Injectable()
export class ProductTrendingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Lists top active products ranked by purchase count descending, then earliest timestamp reaching that count ascending.
   * @param rawLimit Maximum number of trending items to return (1..50, default 10).
   * @param notifyTopOne Whether to send an in-app notification when a product holds the #1 trending spot.
   * @returns Ranked trending products with shop name, reputation score, review count, `purchaseCount`, and `isTrending` metadata.
   */
  async getTrendingProducts(rawLimit = 10, notifyTopOne = true): Promise<TrendingProductsResult> {
    const limit = Math.max(1, Math.min(50, Number(rawLimit) || 10));
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        productId: { not: null },
        order: { status: { in: QUALIFYING_ORDER_STATUSES } },
      },
      select: {
        productId: true,
        quantity: true,
        createdAt: true,
        order: { select: { buyerId: true, createdAt: true } },
      },
    });

    const stats = new Map<
      string,
      { buyers: Set<string>; purchaseCount: number; lastPurchaseAtMs: number }
    >();
    for (const item of orderItems) {
      if (!item.productId || item.quantity <= 0) continue;
      let entry = stats.get(item.productId);
      if (!entry) {
        entry = { buyers: new Set<string>(), purchaseCount: 0, lastPurchaseAtMs: 0 };
        stats.set(item.productId, entry);
      }
      if (item.order?.buyerId) {
        entry.buyers.add(item.order.buyerId);
      }
      entry.purchaseCount += item.quantity;
      const itemTime = item.createdAt?.getTime() ?? item.order?.createdAt?.getTime() ?? 0;
      if (itemTime > entry.lastPurchaseAtMs) {
        entry.lastPurchaseAtMs = itemTime;
      }
    }

    if (stats.size === 0) {
      return { items: [], total: 0 };
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: Array.from(stats.keys()) },
        status: ProductStatus.ACTIVE,
        hiddenByShopSuspension: false,
        trendingExcluded: false,
        seller: { isShopSuspended: false },
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: { select: { id: true, name: true, slug: true } },
        seller: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            shopAvatarUrl: true,
            reputationScore: true,
            trustLevel: true,
            sellerUpgradeRequests: {
              where: { status: SellerRequestStatus.APPROVED },
              orderBy: { reviewedAt: 'desc' },
              take: 1,
              select: { storeName: true },
            },
          },
        },
        inventories: { select: { availableQty: true } },
        options: true,
      },
    });

    const ranked = products
      .map((product) => {
        const entry = stats.get(product.id);
        return {
          product,
          buyerCount: entry?.buyers.size ?? 0,
          purchaseCount: entry?.purchaseCount ?? 0,
          lastPurchaseAtMs: entry?.lastPurchaseAtMs ?? 0,
        };
      })
      .filter((entry) => entry.purchaseCount > 0)
      .sort(
        (a, b) =>
          b.purchaseCount - a.purchaseCount ||
          a.lastPurchaseAtMs - b.lastPurchaseAtMs ||
          a.product.createdAt.getTime() - b.product.createdAt.getTime() ||
          a.product.id.localeCompare(b.product.id),
      )
      .slice(0, limit);

    if (notifyTopOne && ranked.length > 0) {
      await this.notifyTopOneTrending(ranked[0]);
    }

    const items = ranked.map(({ product, buyerCount, purchaseCount, lastPurchaseAtMs }) => {
      const availableQty = this.inventoryService.calculateAvailable(product.inventories);
      const storeName =
        product.seller?.sellerUpgradeRequests?.[0]?.storeName ?? product.seller?.fullName ?? null;
      return {
        ...formatProductSummary(product, availableQty),
        seller: product.seller
          ? {
              id: product.seller.id,
              fullName: product.seller.fullName,
              storeName,
              avatarUrl: product.seller.shopAvatarUrl ?? null,
              shopAvatarUrl: product.seller.shopAvatarUrl ?? null,
              reputationScore: product.seller.reputationScore ?? 0,
              trustLevel: product.seller.trustLevel ?? null,
            }
          : null,
        shopName: storeName,
        reputationScore: product.seller?.reputationScore ?? 0,
        buyerCount,
        purchaseCount,
        lastPurchaseAt: lastPurchaseAtMs > 0 ? new Date(lastPurchaseAtMs) : null,
        isTrending: true,
        trendingNotifiedAt: product.trendingNotifiedAt,
      };
    });

    return { items, total: items.length };
  }

  private async notifyTopOneTrending(top: {
    product: { id: string; sellerId: string; title: string; trendingNotifiedAt: Date | null };
    purchaseCount: number;
  }): Promise<void> {
    if (top.product.trendingNotifiedAt) return;

    await this.prisma.product.updateMany({
      where: {
        id: { not: top.product.id },
        trendingNotifiedAt: { not: null },
      },
      data: { trendingNotifiedAt: null },
    });

    const now = new Date();
    const claimed = await this.prisma.product.updateMany({
      where: { id: top.product.id, trendingNotifiedAt: null, trendingExcluded: false },
      data: { trendingNotifiedAt: now },
    });
    if (claimed.count === 1 && this.prisma.notification?.create) {
      await this.prisma.notification.create({
        data: {
          userId: top.product.sellerId,
          title: 'Sản phẩm của bạn đã đạt Top 1 Xu hướng',
          content: `Chúc mừng! Sản phẩm "${top.product.title}" đang đứng thứ nhất trên Xu hướng với ${top.purchaseCount} lượt mua.`,
          targetUrl: '/seller/products',
          type: NotificationType.SYSTEM,
          channel: NotificationChannel.IN_APP,
        },
      });
      top.product.trendingNotifiedAt = now;
    }
  }
}
