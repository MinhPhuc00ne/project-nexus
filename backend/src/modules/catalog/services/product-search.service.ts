import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { ProductStatus } from '@prisma/client';
import { QueryProductDto } from '../dtos/query-product.dto';
import { InventoryService } from './inventory.service';
import { buildProductWhere, formatProductSummary, PaginatedResult } from '../utils/product.util';
import { priceSortedIds } from '../utils/product-price-sort';

@Injectable()
export class ProductSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}
  async getProducts(query: QueryProductDto): Promise<PaginatedResult<unknown>> {
    if (query.status && query.status !== ProductStatus.ACTIVE)
      throw new BadRequestException('Danh sách công khai chỉ trả sản phẩm đang bán.');
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    )
      throw new BadRequestException('Giá tối thiểu không được lớn hơn giá tối đa.');
    if (query.search) assertCleanContent(query.search, 'Từ khóa tìm kiếm');

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
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sortBy === 'price_asc') orderBy = { basePrice: 'asc' };
    else if (query.sortBy === 'price_desc') orderBy = { basePrice: 'desc' };

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
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, fullName: true, avatarUrl: true, shopAvatarUrl: true } },
          inventories: { select: { availableQty: true } },
          options: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    if (sortedIds) items.sort((a, b) => sortedIds.indexOf(a.id) - sortedIds.indexOf(b.id));
    const formattedItems = items.map((p) => {
      const availableQty = this.inventoryService.calculateAvailable(p.inventories);
      return formatProductSummary(p, availableQty);
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
