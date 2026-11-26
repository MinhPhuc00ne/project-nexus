import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { QueryProductInput } from '../dtos/query-product.dto';
import { InventoryService } from './inventory.service';
import { PaginatedResult, buildProductWhere, formatProductSummary } from '../utils/product.util';
import { priceSortedIds } from '../utils/product-price-sort';

const QUALIFYING_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.CONFIRMED,
];

const TRENDING_TOP_LIMIT = 10;

@Injectable()
export class ProductSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  private async loadPurchaseCounts(productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        quantity: { gt: 0 },
        order: { status: { in: QUALIFYING_ORDER_STATUSES } },
      },
      _sum: { quantity: true },
    });
    const map = new Map<string, number>();
    for (const row of grouped) {
      if (row.productId) {
        map.set(row.productId, Number(row._sum?.quantity ?? 0));
      }
    }
    return map;
  }

  private async loadTrendingProductIds(limit = TRENDING_TOP_LIMIT): Promise<Set<string>> {
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

    const ids = new Set<string>();
    for (const row of grouped) {
      if (row.productId && Number(row._sum?.quantity ?? 0) > 0) {
        ids.add(row.productId);
      }
    }
    return ids;
  }

  async getProductPurchaseMeta(
    productId: string,
    trendingExcluded = false,
  ): Promise<{ purchaseCount: number; isTrending: boolean }> {
    const [purchaseCounts, trendingIds] = await Promise.all([
      this.loadPurchaseCounts([productId]),
      trendingExcluded ? Promise.resolve(new Set<string>()) : this.loadTrendingProductIds(),
    ]);
    return {
      purchaseCount: purchaseCounts.get(productId) ?? 0,
      isTrending: !trendingExcluded && trendingIds.has(productId),
    };
  }

  private formatProductItems<
    T extends Parameters<typeof formatProductSummary>[0] & {
      id: string;
      trendingExcluded?: boolean | null;
      inventories: unknown;
    },
  >(items: T[], purchaseCounts: Map<string, number>, trendingIds: Set<string>) {
    return items.map((p) => {
      const availableQty = this.inventoryService.calculateAvailable(
        p.inventories as Parameters<InventoryService['calculateAvailable']>[0],
      );
      return {
        ...formatProductSummary(p, availableQty),
        purchaseCount: purchaseCounts.get(p.id) ?? 0,
        isTrending: !p.trendingExcluded && trendingIds.has(p.id),
      };
    });
  }

  private async filterAndSortByPurchases(
    where: Prisma.ProductWhereInput,
    query: QueryProductInput,
  ): Promise<{ matchingIds: string[]; purchaseCounts: Map<string, number> }> {
    const candidates = await this.prisma.product.findMany({
      where,
      select: { id: true, createdAt: true, trendingExcluded: true, averageRating: true },
    });
    const candidateIds = candidates.map((c) => c.id);
    const purchaseCounts = await this.loadPurchaseCounts(candidateIds);
    const minPurchase = query.minPurchaseCount ?? (query.trendingOnly ? 1 : 0);

    const filtered = candidates.filter((c) => {
      if (query.trendingOnly && c.trendingExcluded) return false;
      const count = purchaseCounts.get(c.id) ?? 0;
      return count >= minPurchase;
    });

    if (query.sortBy === 'best_selling' || query.sortBy === 'trending') {
      filtered.sort((a, b) => {
        const diff = (purchaseCounts.get(b.id) ?? 0) - (purchaseCounts.get(a.id) ?? 0);
        if (diff !== 0) return diff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } else if (query.sortBy === 'top_rated') {
      filtered.sort((a, b) => {
        const diff = (b.averageRating ?? 0) - (a.averageRating ?? 0);
        if (diff !== 0) return diff;
        return (purchaseCounts.get(b.id) ?? 0) - (purchaseCounts.get(a.id) ?? 0);
      });
    } else {
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return { matchingIds: filtered.map((c) => c.id), purchaseCounts };
  }

  private validateProductQuery(query: QueryProductInput): void {
    if (query.status && query.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Danh sách công khai chỉ trả sản phẩm đang bán.');
    }
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw new BadRequestException('Giá tối thiểu không được lớn hơn giá tối đa.');
    }
    if (query.search) {
      assertCleanContent(query.search, 'Từ khóa tìm kiếm');
    }
  }

  private resolveOrderBy(
    sortBy?: QueryProductInput['sortBy'],
  ): Prisma.ProductOrderByWithRelationInput {
    if (sortBy === 'price_asc') return { basePrice: 'asc' };
    if (sortBy === 'price_desc') return { basePrice: 'desc' };
    if (sortBy === 'top_rated') return { averageRating: 'desc' };
    return { createdAt: 'desc' };
  }

  async getProducts(query: QueryProductInput): Promise<PaginatedResult<unknown>> {
    this.validateProductQuery(query);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    let categoryIds: string[] | undefined;
    if (query.categoryId) {
      const childCategories = await this.prisma.category.findMany({
        where: { parentId: query.categoryId },
        select: { id: true },
      });
      categoryIds = [query.categoryId, ...childCategories.map((c) => c.id)];
    }

    const where = buildProductWhere(query, categoryIds);
    const requiresPurchaseAggregation =
      query.trendingOnly === true ||
      query.minPurchaseCount !== undefined ||
      query.sortBy === 'best_selling' ||
      query.sortBy === 'trending';

    const include = {
      images: { orderBy: { sortOrder: 'asc' as const } },
      category: { select: { id: true, name: true, slug: true } },
      seller: { select: { id: true, fullName: true, avatarUrl: true, shopAvatarUrl: true } },
      inventories: { select: { availableQty: true } },
      options: true,
    };

    if (requiresPurchaseAggregation) {
      const [{ matchingIds, purchaseCounts }, trendingIds] = await Promise.all([
        this.filterAndSortByPurchases(where, query),
        this.loadTrendingProductIds(),
      ]);
      const total = matchingIds.length;
      const pageIds = matchingIds.slice(skip, skip + limit);
      const items =
        pageIds.length > 0
          ? await this.prisma.product.findMany({
              where: { id: { in: pageIds } },
              include,
            })
          : [];
      items.sort((a, b) => pageIds.indexOf(a.id) - pageIds.indexOf(b.id));
      const formattedItems = this.formatProductItems(items, purchaseCounts, trendingIds);
      return { items: formattedItems, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    const orderBy = this.resolveOrderBy(query.sortBy);

    const sortedIds =
      query.sortBy === 'price_asc' || query.sortBy === 'price_desc'
        ? await priceSortedIds(this.prisma, query, categoryIds, skip, limit)
        : undefined;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: sortedIds ? { AND: [where, { id: { in: sortedIds } }] } : where,
        skip: sortedIds ? undefined : skip,
        take: limit,
        orderBy,
        include,
      }),
      this.prisma.product.count({ where }),
    ]);

    if (sortedIds) items.sort((a, b) => sortedIds.indexOf(a.id) - sortedIds.indexOf(b.id));
    const [purchaseCounts, trendingIds] = await Promise.all([
      this.loadPurchaseCounts(items.map((item) => item.id)),
      this.loadTrendingProductIds(),
    ]);
    const formattedItems = this.formatProductItems(items, purchaseCounts, trendingIds);

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
