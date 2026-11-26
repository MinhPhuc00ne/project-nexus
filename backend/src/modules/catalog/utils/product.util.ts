import { Prisma, ProductStatus, SellerRequestStatus } from '@prisma/client';
import { QueryProductInput } from '../dtos/query-product.dto';
import { PricedProduct, priceView } from '../../../core/domain/product-price';
import { ProductChoice } from '../../../core/domain/product-options';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductSummaryInput extends PricedProduct {
  id: string;
  title: string;
  description: string;
  basePrice: Prisma.Decimal | number;
  threeModelKey: string | null;
  createdAt: Date;
  images: Array<{ imageUrl: string }>;
  category: { id: string; name: string; slug: string } | null;
  seller: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    shopAvatarUrl?: string | null;
  } | null;
  options?: ProductChoice[];
  averageRating?: number;
  reviewCount?: number;
}

export interface ProductDetailInput extends ProductSummaryInput {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  status: ProductStatus;
}

export function buildProductWhere(
  query: QueryProductInput,
  categoryIds?: string[],
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    status: ProductStatus.ACTIVE,
    AND: [
      {
        seller: {
          isShopSuspended: false,
        },
      },
    ],
  };

  if (query.search) {
    const trimmed = query.search.trim();
    where.OR = [
      { title: { contains: trimmed, mode: 'insensitive' } },
      { description: { contains: trimmed, mode: 'insensitive' } },
      { seller: { fullName: { contains: trimmed, mode: 'insensitive' } } },
      {
        seller: {
          sellerUpgradeRequests: {
            some: {
              status: SellerRequestStatus.APPROVED,
              storeName: { contains: trimmed, mode: 'insensitive' },
            },
          },
        },
      },
    ];
  }

  if (categoryIds && categoryIds.length > 0) {
    where.categoryId = { in: categoryIds };
  }

  if (query.sellerId) {
    where.sellerId = query.sellerId;
  }

  const and = where.AND as Prisma.ProductWhereInput[];
  if (query.city)
    and.push({
      seller: {
        sellerUpgradeRequests: {
          some: { status: 'APPROVED', city: { contains: query.city.trim(), mode: 'insensitive' } },
        },
      },
    });
  if (query.minRating !== undefined) where.averageRating = { gte: query.minRating };
  if (query.inStock === 'true') and.push({ inventories: { some: { availableQty: { gt: 0 } } } });
  if (query.inStock === 'false') and.push({ inventories: { none: { availableQty: { gt: 0 } } } });
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const now = new Date();
    const price = { gte: query.minPrice, lte: query.maxPrice };
    const activeSale: Prisma.ProductWhereInput = {
      salePrice: { not: null },
      AND: [
        { OR: [{ saleStartsAt: null }, { saleStartsAt: { lte: now } }] },
        { OR: [{ saleEndsAt: null }, { saleEndsAt: { gt: now } }] },
      ],
    };
    and.push({
      OR: [
        { AND: [activeSale, { salePrice: price }] },
        { AND: [{ NOT: activeSale }, { basePrice: price }] },
      ],
    });
  }

  return where;
}

export function formatProductSummary(p: ProductSummaryInput, availableQty: number) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    basePrice: Number(p.basePrice),
    ...priceView(p),
    options: p.options ?? [],
    averageRating: p.averageRating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    category: p.category,
    seller: p.seller ? { ...p.seller, avatarUrl: p.seller.shopAvatarUrl ?? null } : null,
    images: p.images.map((img) => img.imageUrl),
    thumbnail: p.images[0]?.imageUrl || null,
    threeModelKey: p.threeModelKey,
    availableQty,
    isOutOfStock: availableQty <= 0,
    createdAt: p.createdAt,
  };
}

export function formatProductDetail(p: ProductDetailInput, availableQty: number, totalQty: number) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    basePrice: Number(p.basePrice),
    ...priceView(p),
    options: p.options ?? [],
    averageRating: p.averageRating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    weightGrams: p.weightGrams,
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    status: p.status,
    category: p.category,
    seller: p.seller ? { ...p.seller, avatarUrl: p.seller.shopAvatarUrl ?? null } : null,
    images: p.images.map((img) => img.imageUrl),
    thumbnail: p.images[0]?.imageUrl || null,
    threeModelKey: p.threeModelKey,
    availableQty,
    totalQty,
    isOutOfStock: availableQty <= 0,
    createdAt: p.createdAt,
  };
}
