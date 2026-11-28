import type { AuctionStatus, OrderStatus, ReputationTrustLevel, Role } from '@prisma/client';
import type { FormattedCartItem } from './cart-item';

export interface CommerceChatQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

export interface CommerceChatOrderItem {
  name: string;
  quantity: number;
  selections: Record<string, string>;
}

export interface CommerceChatOrder {
  id: string;
  status: OrderStatus;
  shipment: { status: string; waybillCode: string | null } | null;
  afterSales: { status: string } | null;
  items: CommerceChatOrderItem[];
  totalAmount?: number | null;
  createdAt?: Date | null;
}

export interface CommerceChatOrders {
  scope: 'PURCHASES' | 'SALES';
  items: (CommerceChatOrder & { totalAmount: number; createdAt: Date })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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

export interface CommerceChatProductHit {
  id: string;
  title: string;
  price: number;
  availableQty: number;
}

export interface CommerceChatAuctionHit {
  id: string;
  auctionId: string;
  title: string;
  auctionTitle: string;
  status: AuctionStatus;
  price: number;
}

export interface CommerceChatCatalogResult {
  query: string;
  products: CommerceChatProductHit[];
  auctions: CommerceChatAuctionHit[];
}

export interface CommerceChatAuctionEligibility {
  id: string;
  title: string;
  status: AuctionStatus;
  minBuyerReputation: number;
  eligible: boolean;
  reasons: string[];
  matchedItems: string[];
}

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

export function normalizeChatSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function matchesChatSearchTokens(
  haystack: string,
  tokens: string[],
  normalizedQuery: string,
): boolean {
  if (!tokens.length) return true;
  const normalized = normalizeChatSearchText(haystack);
  return (
    normalized.includes(normalizedQuery) || tokens.every((token) => normalized.includes(token))
  );
}
