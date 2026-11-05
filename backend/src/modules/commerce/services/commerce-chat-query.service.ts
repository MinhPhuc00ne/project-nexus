import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { formatCartItem, summarizeCart, FormattedCartItem } from '../utils/cart.util';

/** Validated filters for a bounded commerce lookup owned by the authenticated user. */
export interface CommerceChatQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

const orderSelect = {
  id: true,
  status: true,
  shipment: { select: { status: true, waybillCode: true } },
  afterSales: { select: { status: true } },
} satisfies Prisma.OrderSelect;

/** Minimal order state that excludes addresses and payment credentials. */
export type CommerceChatOrder = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/** A deterministic page and the total matching orders in the same snapshot. */
export interface CommerceChatOrders {
  scope: 'PURCHASES' | 'SALES';
  items: (CommerceChatOrder & { totalAmount: number; createdAt: Date })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Product information safe to return in the owner's chatbot response. */
export type CommerceChatCartItem = Pick<
  FormattedCartItem,
  | 'productId'
  | 'name'
  | 'selections'
  | 'quantity'
  | 'currentPrice'
  | 'priceAtAdded'
  | 'itemSubtotal'
  | 'hasPriceChanged'
  | 'isOutOfStock'
  | 'isStockInsufficient'
  | 'isUnavailable'
  | 'hasInvalidSelections'
>;

/** Cart totals cover all lines; items contains only the requested page. */
export interface CommerceChatCart {
  totalCount: number;
  totalPrice: number;
  hasPriceChanged: boolean;
  hasUnavailableItems: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  expiresAt: Date | null;
  isExpired: boolean;
  items: CommerceChatCartItem[];
}

/** Provides ownership-scoped commerce reads without executing purchase operations. */
@Injectable()
export class CommerceChatQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param userId Authenticated account identifier.
   * @param orderId NEXUS order UUID.
   * @returns The saved state of an order owned by the buyer or seller.
   * @throws NotFoundException when the order is missing or belongs to another account.
   */
  async order(userId: string, orderId: string): Promise<CommerceChatOrder> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: orderSelect,
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng của bạn.');
    return order;
  }

  /**
   * @param userId Authenticated buyer or seller identifier.
   * @param scope Purchases or sales, always restricted to this account.
   * @param query Status and pagination filters.
   * @returns Orders and count read in one repeatable-read snapshot.
   * @throws ForbiddenException when a non-seller requests sales.
   */
  async orders(
    userId: string,
    scope: 'PURCHASES' | 'SALES',
    query: CommerceChatQuery,
  ): Promise<CommerceChatOrders> {
    if (scope === 'SALES') {
      const account = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (!account || !['SELLER', 'ADMIN'].includes(account.role))
        throw new ForbiddenException('Chỉ người bán mới có thể tra cứu đơn bán của mình.');
    }
    const page = Math.max(1, Math.min(100000, query.page ?? 1));
    const limit = Math.max(1, Math.min(20, query.limit ?? 5));
    const where: Prisma.OrderWhereInput = {
      ...(scope === 'SALES' ? { sellerId: userId } : { buyerId: userId }),
      ...(query.status ? { status: query.status } : {}),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.order.count({ where });
        const rows = await tx.order.findMany({
          where,
          select: { ...orderSelect, totalAmount: true, createdAt: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        });
        return {
          scope,
          items: rows.map((row) => ({ ...row, totalAmount: Number(row.totalAmount) })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  /**
   * Reads without creating a cart or refreshing its expiry time.
   * @param userId Authenticated cart owner.
   * @param query Pagination for cart lines.
   * @returns Revalidated merchandise totals and warnings, excluding delivery fees.
   */
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
