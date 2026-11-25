import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { priceView } from '../../../core/domain/product-price';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { QueryShopDto } from '../dtos/query-shop.dto';
import { InventoryService } from './inventory.service';
import { Role, SellerRequestStatus, ProductStatus, Prisma } from '@prisma/client';

export interface ShopSummaryItem {
  id: string;
  name: string;
  sellerFullName: string;
  description: string | null;
  avatarUrl: string | null;
  reputationScore: number;
  trustLevel: string;
  isSellerActive: boolean;
  address: {
    street: string | null;
    ward: string | null;
    city: string | null;
    district: string | null;
    formattedAddress: string | null;
  } | null;
  stats: {
    totalProducts: number;
  };
  sampleProducts: Array<{
    id: string;
    title: string;
    basePrice: number;
    thumbnail: string | null;
  }>;
  createdAt: Date;
}

export interface PaginatedShopsResult {
  items: ShopSummaryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Searches and retrieves paginated marketplace merchant shops.
   *
   * @param query - Query filtering and pagination parameters
   * @returns Paginated merchant shop profiles and product highlights
   */
  async getShops(query: QueryShopDto): Promise<PaginatedShopsResult> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      isShopSuspended: false,
      OR: [
        { role: Role.SELLER },
        {
          sellerUpgradeRequests: {
            some: { status: SellerRequestStatus.APPROVED },
          },
        },
      ],
    };

    const andConditions: Prisma.UserWhereInput[] = [];

    if (query.search) {
      assertCleanContent(query.search, 'Từ khóa tìm kiếm gian hàng');
      const searchKeyword = query.search.trim();
      andConditions.push({
        OR: [
          { fullName: { contains: searchKeyword, mode: 'insensitive' } },
          { email: { contains: searchKeyword, mode: 'insensitive' } },
          {
            sellerUpgradeRequests: {
              some: {
                status: SellerRequestStatus.APPROVED,
                OR: [
                  { storeName: { contains: searchKeyword, mode: 'insensitive' } },
                  { storeDescription: { contains: searchKeyword, mode: 'insensitive' } },
                  { city: { contains: searchKeyword, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      });
    }

    if (query.city) {
      const cityKeyword = query.city.trim();
      andConditions.push({
        sellerUpgradeRequests: {
          some: {
            status: SellerRequestStatus.APPROVED,
            city: { contains: cityKeyword, mode: 'insensitive' },
          },
        },
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    let orderBy: Prisma.UserOrderByWithRelationInput = { reputationScore: 'desc' };
    if (query.sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (query.sortBy === 'products_count') {
      orderBy = { products: { _count: 'desc' } };
    } else {
      orderBy = { reputationScore: 'desc' };
    }

    const [sellers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          sellerUpgradeRequests: {
            where: { status: SellerRequestStatus.APPROVED },
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
          products: {
            where: { status: ProductStatus.ACTIVE },
            select: {
              id: true,
              title: true,
              basePrice: true,
              salePrice: true,
              saleStartsAt: true,
              saleEndsAt: true,
              images: {
                orderBy: { sortOrder: 'asc' },
                take: 1,
                select: { imageUrl: true },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 4,
          },
          _count: {
            select: {
              products: {
                where: { status: ProductStatus.ACTIVE },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formattedItems: ShopSummaryItem[] = sellers.map((seller) => {
      const approvedRequest = seller.sellerUpgradeRequests[0];
      const name = approvedRequest?.storeName || seller.fullName;
      const description = approvedRequest?.storeDescription || null;
      const address = approvedRequest
        ? {
            street: approvedRequest.street || null,
            ward: approvedRequest.ward || null,
            city: approvedRequest.city || null,
            district: approvedRequest.district || null,
            formattedAddress:
              approvedRequest.formattedAddress ||
              [
                approvedRequest.street,
                approvedRequest.ward,
                approvedRequest.district,
                approvedRequest.city,
              ]
                .filter(Boolean)
                .join(', ') ||
              null,
          }
        : null;

      return {
        id: seller.id,
        name,
        sellerFullName: seller.fullName,
        description,
        avatarUrl: seller.shopAvatarUrl,
        reputationScore: seller.reputationScore,
        trustLevel: seller.trustLevel,
        isSellerActive: seller.isSellerActive,
        address,
        stats: {
          totalProducts: seller._count.products,
        },
        sampleProducts: seller.products.map((p) => ({
          id: p.id,
          title: p.title,
          basePrice: Number(p.basePrice),
          ...priceView(p),
          thumbnail: p.images[0]?.imageUrl || null,
        })),
        createdAt: approvedRequest?.createdAt || seller.createdAt,
      };
    });

    return {
      items: formattedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves detailed merchant profile and active catalog products.
   *
   * @param shopId - Unique identifier of the seller shop
   * @param page - Target page index
   * @param limit - Page size limit
   * @returns Shop profile and paginated active inventory items
   * @throws NotFoundException when shop does not exist, is suspended, or user lacks seller status
   */
  async getShopDetail(shopId: string, page = 1, limit = 12) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const seller = await this.prisma.user.findUnique({
      where: { id: shopId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            products: {
              where: { status: ProductStatus.ACTIVE },
            },
            reviewsReceived: true,
          },
        },
      },
    });

    if (!seller || seller.isShopSuspended) {
      throw new NotFoundException('Không tìm thấy gian hàng này.');
    }

    const isSeller =
      seller.role === Role.SELLER ||
      seller.role === Role.ADMIN ||
      seller.sellerUpgradeRequests.length > 0;

    if (!isSeller) {
      throw new NotFoundException('Tài khoản này không phải là gian hàng người bán.');
    }

    const approvedRequest = seller.sellerUpgradeRequests[0];
    const name = approvedRequest?.storeName || seller.fullName;
    const description = approvedRequest?.storeDescription || null;
    const address = approvedRequest
      ? {
          street: approvedRequest.street || null,
          ward: approvedRequest.ward || null,
          city: approvedRequest.city || null,
          district: approvedRequest.district || null,
          formattedAddress:
            approvedRequest.formattedAddress ||
            [
              approvedRequest.street,
              approvedRequest.ward,
              approvedRequest.district,
              approvedRequest.city,
            ]
              .filter(Boolean)
              .join(', ') ||
            null,
        }
      : null;

    const [products, totalProducts] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          sellerId: shopId,
          status: ProductStatus.ACTIVE,
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true, slug: true } },
          inventories: { select: { availableQty: true } },
          options: true,
        },
      }),
      this.prisma.product.count({
        where: {
          sellerId: shopId,
          status: ProductStatus.ACTIVE,
        },
      }),
    ]);

    const formattedProducts = products.map((p) => {
      const availableQty = this.inventoryService.calculateAvailable(p.inventories);
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        basePrice: Number(p.basePrice),
        ...priceView(p),
        options: p.options,
        averageRating: p.averageRating,
        reviewCount: p.reviewCount,
        category: p.category,
        images: p.images.map((img) => img.imageUrl),
        thumbnail: p.images[0]?.imageUrl || null,
        threeModelKey: p.threeModelKey,
        availableQty,
        isOutOfStock: availableQty <= 0,
        createdAt: p.createdAt,
      };
    });

    return {
      shop: {
        id: seller.id,
        name,
        sellerFullName: seller.fullName,
        description,
        avatarUrl: seller.shopAvatarUrl,
        reputationScore: seller.reputationScore,
        trustLevel: seller.trustLevel,
        isSellerActive: seller.isSellerActive,
        address,
        stats: {
          totalProducts,
          totalReviews: seller._count.reviewsReceived,
        },
        createdAt: approvedRequest?.createdAt || seller.createdAt,
      },
      products: {
        items: formattedProducts,
        total: totalProducts,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalProducts / limitNum),
      },
    };
  }
}
