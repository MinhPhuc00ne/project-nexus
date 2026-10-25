import { Prisma, ProductStatus, SellerRequestStatus } from '@prisma/client';
import { QueryProductDto } from '../dtos/query-product.dto';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductSummaryInput {
  id: string;
  title: string;
  description: string;
  basePrice: Prisma.Decimal | number;
  threeModelKey: string | null;
  createdAt: Date;
  images: Array<{ imageUrl: string }>;
  category: { id: string; name: string; slug: string } | null;
  seller: { id: string; fullName: string; avatarUrl: string | null } | null;
}

export interface ProductDetailInput extends ProductSummaryInput {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  status: ProductStatus;
}

export function buildProductWhere(
  query: QueryProductDto,
  categoryIds?: string[],
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    status: query.status || ProductStatus.ACTIVE,
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

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.basePrice = {};
    if (query.minPrice !== undefined) where.basePrice.gte = query.minPrice;
    if (query.maxPrice !== undefined) where.basePrice.lte = query.maxPrice;
  }

  return where;
}

export function formatProductSummary(p: ProductSummaryInput, availableQty: number) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    basePrice: Number(p.basePrice),
    category: p.category,
    seller: p.seller,
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
    weightGrams: p.weightGrams,
    lengthCm: p.lengthCm,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    status: p.status,
    category: p.category,
    seller: p.seller,
    images: p.images.map((img) => img.imageUrl),
    thumbnail: p.images[0]?.imageUrl || null,
    threeModelKey: p.threeModelKey,
    availableQty,
    totalQty,
    isOutOfStock: availableQty <= 0,
    createdAt: p.createdAt,
  };
}
