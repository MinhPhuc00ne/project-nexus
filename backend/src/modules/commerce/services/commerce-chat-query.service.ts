import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuctionItemStatus,
  AuctionStatus,
  OrderStatus,
  Prisma,
  ProductStatus,
  ReputationTrustLevel,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { effectivePrice } from '../../catalog/utils/product-price';
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
  totalAmount: true,
  createdAt: true,
  shipment: { select: { status: true, waybillCode: true } },
  afterSales: { select: { status: true } },
  items: {
    select: {
      quantity: true,
      selections: true,
      product: { select: { title: true } },
    },
  },
} satisfies Prisma.OrderSelect;

type RawOrderPayload = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/** Purchased or sold line summary safe to show in chatbot order responses. */
export interface CommerceChatOrderItem {
  name: string;
  quantity: number;
  selections: Record<string, string>;
}

/** Minimal order state that excludes addresses and payment credentials. */
export interface CommerceChatOrder {
  id: string;
  status: OrderStatus;
  shipment: RawOrderPayload['shipment'];
  afterSales: RawOrderPayload['afterSales'];
  items: CommerceChatOrderItem[];
  totalAmount?: number | null;
  createdAt?: Date | null;
}

/** A deterministic page and the total matching orders in the same snapshot. */
export interface CommerceChatOrders {
  scope: 'PURCHASES' | 'SALES';
  items: (CommerceChatOrder & { totalAmount: number; createdAt: Date })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Normalizes order item relations and variant selections for safe display.
 * @param items Optional raw Prisma order item rows.
 * @returns Sanitized product summaries without internal seller or pricing metadata.
 */
function formatOrderItems(items?: RawOrderPayload['items']): CommerceChatOrderItem[] {
  return (items ?? []).map((item) => {
    const rawSelections =
      item.selections && typeof item.selections === 'object' && !Array.isArray(item.selections)
        ? Object.entries(item.selections as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          )
        : [];
    return {
      name: item.product?.title ?? 'Sản phẩm',
      quantity: item.quantity,
      selections: Object.fromEntries(rawSelections),
    };
  });
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

/** Public storefront product match safe to present in chatbot search results. */
export interface CommerceChatProductHit {
  id: string;
  title: string;
  price: number;
  availableQty: number;
}

/** Public approved auction lot or single-lot room match for chatbot search results. */
export interface CommerceChatAuctionHit {
  id: string;
  auctionId: string;
  title: string;
  auctionTitle: string;
  status: AuctionStatus;
  price: number;
}

/** Combined public product and auction matches for a shopping query. */
export interface CommerceChatCatalogResult {
  query: string;
  products: CommerceChatProductHit[];
  auctions: CommerceChatAuctionHit[];
}

/** Per-auction eligibility summary evaluated against the authenticated user. */
export interface CommerceChatAuctionEligibility {
  id: string;
  title: string;
  status: AuctionStatus;
  minBuyerReputation: number;
  eligible: boolean;
  reasons: string[];
  matchedItems: string[];
}

/** Account reputation, wallet and auction eligibility snapshot for the authenticated user. */
export interface CommerceChatAccountStatus {
  role: Role;
  isVerified: boolean;
  isSellerActive: boolean;
  isShopSuspended: boolean;
  reputationScore: number;
  trustLevel: ReputationTrustLevel;
  hasWallet: boolean;
  availableBalance: number;
  lockedBalance: number;
  minBuyerReputation: number;
  auctionEligible: boolean;
  auctionReasons: string[];
  auctions: CommerceChatAuctionEligibility[];
  eligibleAuctions: CommerceChatAuctionEligibility[];
  ineligibleAuctions: CommerceChatAuctionEligibility[];
}

function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchesTokens(haystack: string, tokens: string[], normalizedQuery: string): boolean {
  if (!tokens.length) return true;
  const normalized = normalizeSearchText(haystack);
  return (
    normalized.includes(normalizedQuery) || tokens.every((token) => normalized.includes(token))
  );
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
    const rawTotal = (order as { totalAmount?: Prisma.Decimal | number | null }).totalAmount;
    const rawCreatedAt = (order as { createdAt?: Date | null }).createdAt;
    return {
      id: order.id,
      status: order.status,
      shipment: order.shipment,
      afterSales: order.afterSales,
      items: formatOrderItems(order.items),
      totalAmount: rawTotal !== undefined && rawTotal !== null ? Number(rawTotal) : null,
      createdAt: rawCreatedAt ?? null,
    };
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
          items: rows.map((row) => ({
            id: row.id,
            status: row.status,
            shipment: row.shipment,
            afterSales: row.afterSales,
            items: formatOrderItems(row.items),
            totalAmount: Number(row.totalAmount),
            createdAt: row.createdAt,
          })),
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

  /**
   * Searches active storefront products and public live/scheduled auctions for a shopping query.
   * @param keyword Raw or normalized product keyword; empty string lists top active items.
   * @returns Bounded matching products and auctions.
   */
  async searchCatalog(keyword: string): Promise<CommerceChatCatalogResult> {
    const normalizedQuery = normalizeSearchText(keyword);
    const tokens = normalizedQuery ? normalizedQuery.split(' ').filter(Boolean) : [];
    const activeAuctionStatuses: AuctionStatus[] = [
      AuctionStatus.ACTIVE,
      AuctionStatus.EXTENDED,
      AuctionStatus.SCHEDULED,
    ];

    const [rawProducts, rawAuctions] = await Promise.all([
      typeof this.prisma.product?.findMany === 'function'
        ? this.prisma.product.findMany({
            where: {
              status: ProductStatus.ACTIVE,
              hiddenByShopSuspension: false,
              seller: { isShopSuspended: false },
            },
            select: {
              id: true,
              title: true,
              description: true,
              basePrice: true,
              salePrice: true,
              saleStartsAt: true,
              saleEndsAt: true,
              category: { select: { name: true } },
              inventories: { select: { availableQty: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })
        : Promise.resolve([]),
      typeof this.prisma.auction?.findMany === 'function'
        ? this.prisma.auction.findMany({
            where: { status: { in: activeAuctionStatuses } },
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              startingPrice: true,
              currentHighestBid: true,
              items: {
                where: {
                  status: AuctionItemStatus.APPROVED,
                  lotStatus: { in: activeAuctionStatuses },
                },
                orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
                select: {
                  id: true,
                  title: true,
                  description: true,
                  lotStatus: true,
                  startingPrice: true,
                  proposedStartingPrice: true,
                  currentHighestBid: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
          })
        : Promise.resolve([]),
    ]);

    const now = new Date();
    const matchedProducts = rawProducts
      .filter((p) =>
        matchesTokens(
          `${p.title} ${p.description ?? ''} ${p.category?.name ?? ''}`,
          tokens,
          normalizedQuery,
        ),
      )
      .sort((a, b) => {
        const aTitle = matchesTokens(a.title, tokens, normalizedQuery) ? 0 : 1;
        const bTitle = matchesTokens(b.title, tokens, normalizedQuery) ? 0 : 1;
        return aTitle - bTitle;
      })
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        price: effectivePrice(p, now),
        availableQty: (p.inventories ?? []).reduce(
          (sum, inv) => sum + Math.max(0, inv.availableQty),
          0,
        ),
      }));

    const auctionCandidates: { hit: CommerceChatAuctionHit; titleHit: boolean }[] = [];
    for (const auction of rawAuctions) {
      if (auction.items && auction.items.length > 0) {
        for (const item of auction.items) {
          if (
            matchesTokens(
              `${item.title} ${item.description ?? ''} ${auction.title}`,
              tokens,
              normalizedQuery,
            )
          ) {
            const highest = Number(item.currentHighestBid ?? 0);
            const starting = Number(item.startingPrice ?? item.proposedStartingPrice ?? 0);
            auctionCandidates.push({
              hit: {
                id: item.id,
                auctionId: auction.id,
                title: item.title,
                auctionTitle: auction.title,
                status: item.lotStatus,
                price: highest > 0 ? highest : starting,
              },
              titleHit: matchesTokens(item.title, tokens, normalizedQuery),
            });
          }
        }
      } else if (
        matchesTokens(`${auction.title} ${auction.description ?? ''}`, tokens, normalizedQuery)
      ) {
        const highest = Number(auction.currentHighestBid ?? 0);
        const starting = Number(auction.startingPrice ?? 0);
        auctionCandidates.push({
          hit: {
            id: auction.id,
            auctionId: auction.id,
            title: auction.title,
            auctionTitle: auction.title,
            status: auction.status,
            price: highest > 0 ? highest : starting,
          },
          titleHit: matchesTokens(auction.title, tokens, normalizedQuery),
        });
      }
    }

    const statusRank = (status: AuctionStatus): number =>
      status === AuctionStatus.ACTIVE || status === AuctionStatus.EXTENDED ? 0 : 1;
    const matchedAuctions = auctionCandidates
      .sort((a, b) => {
        const titleDiff = Number(b.titleHit) - Number(a.titleHit);
        return titleDiff !== 0 ? titleDiff : statusRank(a.hit.status) - statusRank(b.hit.status);
      })
      .slice(0, 5)
      .map((entry) => entry.hit);

    return {
      query: keyword.trim(),
      products: matchedProducts,
      auctions: matchedAuctions,
    };
  }

  /**
   * Reads the authenticated user's reputation, wallet balance, and per-auction eligibility.
   * @param userId Authenticated account identifier.
   * @param auctionNameFilter Optional accent-insensitive filter on auction room or approved lot title.
   * @returns Account eligibility snapshot with per-auction breakdown, or null when unavailable.
   */
  async accountEligibility(
    userId: string,
    auctionNameFilter?: string,
  ): Promise<CommerceChatAccountStatus | null> {
    if (typeof this.prisma.user?.findUnique !== 'function') return null;
    const activeAuctionStatuses: AuctionStatus[] = [
      AuctionStatus.ACTIVE,
      AuctionStatus.EXTENDED,
      AuctionStatus.SCHEDULED,
    ];
    const [user, rawAuctions] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          role: true,
          isVerified: true,
          isSellerActive: true,
          isShopSuspended: true,
          reputationScore: true,
          trustLevel: true,
          wallet: { select: { balance: true, lockedBalance: true } },
        },
      }),
      typeof this.prisma.auction?.findMany === 'function'
        ? this.prisma.auction.findMany({
            where: { status: { in: activeAuctionStatuses } },
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              minBuyerReputation: true,
              items: {
                where: {
                  status: AuctionItemStatus.APPROVED,
                  lotStatus: { in: activeAuctionStatuses },
                },
                orderBy: [{ lotNumber: 'asc' }, { createdAt: 'asc' }],
                select: { id: true, title: true, description: true },
              },
            },
            orderBy: [{ minBuyerReputation: 'asc' }, { createdAt: 'desc' }],
            take: 50,
          })
        : Promise.resolve([]),
    ]);
    if (!user || typeof user.reputationScore !== 'number') return null;

    const minBuyerReputation = 40;
    const globalReasons: string[] = [];
    if (user.role === Role.ADMIN || user.role === Role.SUPPORT_STAFF) {
      globalReasons.push('Tài khoản Admin / Nhân viên hỗ trợ không tham gia đặt giá.');
    }
    if (user.isSellerActive) {
      globalReasons.push(
        'Tài khoản đang bật chế độ Người bán. Cần chuyển về chế độ Người mua để đặt giá.',
      );
    }
    if (user.isShopSuspended || user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      globalReasons.push('Tài khoản đang bị tạm khóa hoặc hạn chế quyền giao dịch.');
    }
    if (!user.wallet) {
      globalReasons.push('Chưa khởi tạo ví NEXUS Pay để khóa tiền đặt giá.');
    }

    const normalizedFilter = normalizeSearchText(auctionNameFilter ?? '');
    const filterTokens = normalizedFilter ? normalizedFilter.split(' ').filter(Boolean) : [];
    const filteredAuctions = filterTokens.length
      ? rawAuctions.filter((auction) => {
          const roomMatch = matchesTokens(
            `${auction.title} ${auction.description ?? ''}`,
            filterTokens,
            normalizedFilter,
          );
          const itemMatch = (auction.items ?? []).some((item) =>
            matchesTokens(
              `${item.title} ${item.description ?? ''}`,
              filterTokens,
              normalizedFilter,
            ),
          );
          return roomMatch || itemMatch;
        })
      : rawAuctions;

    const evaluatedAuctions: CommerceChatAuctionEligibility[] = filteredAuctions.map((auction) => {
      const requiredRep =
        typeof auction.minBuyerReputation === 'number'
          ? auction.minBuyerReputation
          : minBuyerReputation;
      const reasons = [...globalReasons];
      if (user.reputationScore < requiredRep) {
        reasons.push(
          `Điểm uy tín hiện tại (${user.reputationScore}) thấp hơn yêu cầu của phiên (${requiredRep}).`,
        );
      }
      const matchedItems = filterTokens.length
        ? (auction.items ?? [])
            .filter((item) =>
              matchesTokens(
                `${item.title} ${item.description ?? ''}`,
                filterTokens,
                normalizedFilter,
              ),
            )
            .map((item) => item.title)
        : [];
      return {
        id: auction.id,
        title: auction.title,
        status: auction.status,
        minBuyerReputation: requiredRep,
        eligible: reasons.length === 0,
        reasons,
        matchedItems,
      };
    });

    const eligibleAuctions = evaluatedAuctions.filter((a) => a.eligible);
    const ineligibleAuctions = evaluatedAuctions.filter((a) => !a.eligible);

    const summaryReasons = [...globalReasons];
    if (user.reputationScore < minBuyerReputation) {
      summaryReasons.push(
        `Điểm uy tín hiện tại (${user.reputationScore}) thấp hơn mức tối thiểu (${minBuyerReputation}).`,
      );
    }

    return {
      role: user.role,
      isVerified: user.isVerified,
      isSellerActive: user.isSellerActive,
      isShopSuspended: user.isShopSuspended,
      reputationScore: user.reputationScore,
      trustLevel: user.trustLevel,
      hasWallet: Boolean(user.wallet),
      availableBalance: Number(user.wallet?.balance ?? 0),
      lockedBalance: Number(user.wallet?.lockedBalance ?? 0),
      minBuyerReputation,
      auctionEligible: evaluatedAuctions.length
        ? eligibleAuctions.length > 0
        : summaryReasons.length === 0,
      auctionReasons: summaryReasons,
      auctions: evaluatedAuctions,
      eligibleAuctions,
      ineligibleAuctions,
    };
  }
}
