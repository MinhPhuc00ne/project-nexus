import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { formatCartItem, summarizeCart } from '../../../core/domain/cart-item';
import type { CommerceChatCart, CommerceChatQuery } from '../../../core/domain/commerce-chat.types';

@Injectable()
export class CartChatFacade {
  constructor(private readonly prisma: PrismaService) {}

  async cart(userId: string, query: CommerceChatQuery): Promise<CommerceChatCart> {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      select: {
        expiresAt: true,
        items: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            product: {
              include: {
                options: true,
                images: { orderBy: { sortOrder: 'asc' } },
                seller: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    shopAvatarUrl: true,
                    isShopSuspended: true,
                  },
                },
                inventories: { select: { availableQty: true } },
              },
            },
          },
        },
      },
    });
    const items = (cart?.items ?? []).map(formatCartItem);
    const page = Math.max(1, Math.min(100000, query.page ?? 1));
    const limit = Math.max(1, Math.min(20, query.limit ?? 5));
    const total = items.length;
    return {
      ...summarizeCart(items),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      expiresAt: cart?.expiresAt ?? null,
      isExpired: cart ? cart.expiresAt.getTime() <= Date.now() : false,
      hasUnavailableItems: items.some(
        (item) => item.isUnavailable || item.isOutOfStock || item.isStockInsufficient,
      ),
      items: items.slice((page - 1) * limit, page * limit).map((item) => ({
        productId: item.productId,
        name: item.name,
        selections: item.selections,
        quantity: item.quantity,
        currentPrice: item.currentPrice,
        priceAtAdded: item.priceAtAdded,
        itemSubtotal: item.itemSubtotal,
        hasPriceChanged: item.hasPriceChanged,
        isOutOfStock: item.isOutOfStock,
        isStockInsufficient: item.isStockInsufficient,
        isUnavailable: item.isUnavailable,
        hasInvalidSelections: item.hasInvalidSelections,
      })),
    };
  }
}
