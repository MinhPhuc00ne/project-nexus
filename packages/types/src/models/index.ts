import { AuctionStatus, DisputeStatus, EscrowStatus, OrderStatus, Role } from '../enums/index.js';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  traceId?: string;
  errors?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserSummaryDto {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  walletBalance: number;
  reputationScore: number;
  isSellerActive: boolean;
  isShopSuspended?: boolean;
  suspensionReason?: string | null;
}

export interface ProductSummaryDto {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  sellerId: string;
  category: string;
  images: string[];
  threeModelKey?: string | null;
}

export interface AuctionSummaryDto {
  id: string;
  title: string;
  productId: string;
  sellerId: string;
  startingPrice: number;
  currentHighestBid: number;
  bidIncrement: number;
  status: AuctionStatus;
  startTime: string;
  consignmentDeadline?: string | null;
  isConsignmentLocked?: boolean;
  consignmentLockedAt?: string | null;
  endTime: string;
  threeModelKey?: string | null;
  imageUrl?: string | null;
  totalBidsCount: number;
}

export interface OrderSummaryDto {
  id: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
}

export interface EscrowSummaryDto {
  id: string;
  orderId: string;
  totalAmount: number;
  platformFee: number;
  sellerPayout: number;
  status: EscrowStatus;
}

export interface DisputeSummaryDto {
  id: string;
  orderId: string;
  openedByUserId: string;
  reason: string;
  status: DisputeStatus;
  createdAt: string;
}

export interface WishlistItemDto {
  id: string;
  wishlistId: string;
  name: string;
  price: number;
  originalPrice?: number;
  img: string;
  shopName: string;
  category?: string;
  inStock: boolean;
  addedAt: string;
}

export interface WishlistSyncDto {
  productIds: string[];
}
