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
  purchaseCount: number;
  lastPurchaseAt: Date | null;
  isTrending: boolean;
  trendingNotifiedAt: Date | null;
};

export interface TrendingProductsResult {
  items: TrendingProductItem[];
  total: number;
}

/** Computes storefront trending products via database aggregation and synchronizes #1 trending notifications. */
@Injectable()
export class ProductTrendingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Lists top active products ranked by purchase count descending, then earliest timestamp reaching that count ascending.
   * Purely read-only: performs aggregation in PostgreSQL without mutating database state.
   * @param rawLimit Maximum number of trending items to return (1..50, default 10).
   * @returns Ranked trending products with shop name, reputation score, review count, `purchaseCount`, and `isTrending` metadata.
   */
  async getTrendingProducts(rawLimit = 10): Promise<TrendingProductsResult> {
    const limit = Math.max(1, Math.min(50, Number(rawLimit) || 10));
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        quantity: { gt: 0 },
        order: { status: { in: QUALIFYING_ORDER_STATUSES } },
        product: {
          status: ProductStatus.ACTIVE,
          hiddenByShopSuspension: false,
          trendingExcluded: false,
          seller: { isShopSuspended: false },
        },
      },
      _sum: { quantity: true },
      _max: { createdAt: true },
      orderBy: [{ _sum: { quantity: 'desc' } }, { _max: { createdAt: 'asc' } }],
      take: limit,
    });

    const stats = new Map<string, { purchaseCount: number; lastPurchaseAtMs: number }>();
    for (const row of grouped) {
      const purchaseCount = Number(row._sum?.quantity ?? 0);
      if (!row.productId || purchaseCount <= 0) continue;
      stats.set(row.productId, {
        purchaseCount,
        lastPurchaseAtMs: row._max?.createdAt?.getTime() ?? 0,
      });
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

    const items = ranked.map(({ product, purchaseCount, lastPurchaseAtMs }) => {
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
        purchaseCount,
        lastPurchaseAt: lastPurchaseAtMs > 0 ? new Date(lastPurchaseAtMs) : null,
        isTrending: true,
        trendingNotifiedAt: product.trendingNotifiedAt,
      };
    });

    return { items, total: items.length };
  }

  /**
   * Synchronizes the #1 trending product notification after purchase or moderation events.
   * Sends an in-app notification to the seller only when a product newly holds the #1 spot.
   */
  async syncTopOneTrendingNotification(): Promise<void> {
    const topRows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        quantity: { gt: 0 },
        order: { status: { in: QUALIFYING_ORDER_STATUSES } },
        product: {
          status: ProductStatus.ACTIVE,
          hiddenByShopSuspension: false,
          trendingExcluded: false,
          seller: { isShopSuspended: false },
        },
      },
      _sum: { quantity: true },
      _max: { createdAt: true },
      orderBy: [{ _sum: { quantity: 'desc' } }, { _max: { createdAt: 'asc' } }],
      take: 1,
    });

    const topRow = topRows[0];
    const purchaseCount = Number(topRow?._sum?.quantity ?? 0);
    if (!topRow?.productId || purchaseCount <= 0) return;

    const topProduct = await this.prisma.product.findUnique({
      where: { id: topRow.productId },
      select: {
        id: true,
        sellerId: true,
        title: true,
        trendingNotifiedAt: true,
        trendingExcluded: true,
      },
    });
    if (!topProduct || topProduct.trendingExcluded || topProduct.trendingNotifiedAt) return;

    await this.prisma.product.updateMany({
      where: {
        id: { not: topProduct.id },
        trendingNotifiedAt: { not: null },
      },
      data: { trendingNotifiedAt: null },
    });

    const now = new Date();
    const claimed = await this.prisma.product.updateMany({
      where: { id: topProduct.id, trendingNotifiedAt: null, trendingExcluded: false },
      data: { trendingNotifiedAt: now },
    });
    if (claimed.count === 1 && this.prisma.notification?.create) {
      await this.prisma.notification.create({
        data: {
          userId: topProduct.sellerId,
          title: 'Sản phẩm của bạn đã đạt Top 1 Xu hướng',
          content: `Chúc mừng! Sản phẩm "${topProduct.title}" đang đứng thứ nhất trên Xu hướng với ${purchaseCount} lượt mua.`,
          targetUrl: '/seller/products',
          type: NotificationType.SYSTEM,
          channel: NotificationChannel.IN_APP,
        },
      });
    }
  }
}
