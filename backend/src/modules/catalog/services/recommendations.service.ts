import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { FeedbackPageDto } from '../../commerce/dtos/feedback.dto';
import { formatProductSummary } from '../utils/product.util';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, query: FeedbackPageDto): Promise<unknown> {
    const [cart, purchases] = await Promise.all([
      this.prisma.cartItem.findMany({
        where: { cart: { userId } },
        take: 100,
        orderBy: { id: 'asc' },
        select: { product: { select: { categoryId: true } } },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { buyerId: userId, status: 'CONFIRMED' } },
        orderBy: { order: { createdAt: 'desc' } },
        take: 100,
        select: { product: { select: { categoryId: true } } },
      }),
    ]);
    const categories = [...new Set([...cart, ...purchases].map((item) => item.product.categoryId))];
    const visible = {
      status: 'ACTIVE' as const,
      sellerId: { not: userId },
      seller: { isShopSuspended: false },
    };
    const include = {
      images: { orderBy: { sortOrder: 'asc' as const } },
      category: { select: { id: true, name: true, slug: true } },
      options: true,
      seller: { select: { id: true, fullName: true, avatarUrl: true, shopAvatarUrl: true } },
      inventories: { select: { availableQty: true } },
    };
    const preferred = categories.length
      ? await this.prisma.product.findMany({
          where: {
            ...visible,
            categoryId: { in: categories },
            inventories: { some: { availableQty: { gt: 0 } } },
          },
          include,
          orderBy: [{ averageRating: 'desc' }, { createdAt: 'desc' }],
          take: 100,
        })
      : [];
    const fallback = await this.prisma.product.findMany({
      where: {
        ...visible,
        inventories: { some: { availableQty: { gt: 0 } } },
        id: { notIn: preferred.map((p) => p.id) },
      },
      include,
      orderBy: [{ reviewCount: 'desc' }, { averageRating: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const limit = Math.min(query.limit, 50);
    return {
      items: [...preferred, ...fallback].slice(0, limit).map((product) => ({
        ...formatProductSummary(
          product,
          product.inventories.reduce((sum, inv) => sum + inv.availableQty, 0),
        ),
        recommendationReason: categories.includes(product.categoryId)
          ? 'CATEGORY_INTEREST'
          : 'POPULAR_OR_RECENT',
      })),
      personalized: categories.length > 0,
    };
  }
}
