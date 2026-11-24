import type { AuctionStatus, BidStatus } from '@nexus/types';
import type { AuctionConsignmentItem, SellerAuctionConsignment } from './auction-consignment.types';
export type {
  AuctionConsignmentItem,
  AuctionConsignmentStatus,
  SellerAuctionConsignment,
} from './auction-consignment.types';
export type { AuctionSocketClient } from './auction-socket.types';

export interface AuctionProduct {
  id: string;
  title: string;
  threeModelKey?: string | null;
  basePrice: number;
  category?: { id: string; name: string; slug?: string };
  images?: Array<{ id: string; imageUrl: string; isThumbnail: boolean }>;
}

export interface AuctionSeller {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface AuctionBidItem {
  id: string;
  auctionItemId?: string | null;
  bidAmount: number;
  status: BidStatus;
  placedAt: string;
  bidder: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
}

export interface BuyerEligibilityResponse {
  isEligible: boolean;
  isFlaggedViewOnly: boolean;
  currentScore?: number;
  requiredScore: number;
  reason?: string;
}

export interface MyBidItem {
  id: string;
  bidAmount: number;
  status: BidStatus;
  placedAt: string;
  auction: {
    id: string;
    title: string;
    status: AuctionStatus;
    endTime: string;
    currentHighestBid: number;
    isLeading: boolean;
    product?: {
      id: string;
      title: string;
      images?: Array<{ id: string; imageUrl: string; isThumbnail?: boolean }>;
      basePrice: number;
    };
  };
}

export interface AuctionEntity {
  id: string;
  productId?: string | null;
  sellerId?: string | null;
  title: string;
  description?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  startingPrice: number;
  reservePrice?: number | null;
  currentHighestBid: number;
  currentHighestBidderId?: string | null;
  bidIncrement: number;
  minBuyerReputation?: number;
  minSellerReputation?: number;
  status: AuctionStatus;
  startTime: string;
  endTime: string;
  originalEndTime: string;
  isExtended: boolean;
  totalBidsCount: number;
  consignmentDeadline?: string | null;
  isConsignmentLocked?: boolean;
  consignmentLockedAt?: string | null;
  product?: AuctionProduct;
  seller?: AuctionSeller;
  bids?: AuctionBidItem[];
  items?: AuctionConsignmentItem[];
  buyerEligibility?: BuyerEligibilityResponse;
  serverTime?: string;
  introDurationMs?: number;
  elapsedMs?: number;
  isIntroActive?: boolean;
  lots?: AuctionConsignmentItem[];
}

export interface AdminAuctionLot extends AuctionConsignmentItem {
  staffNote?: string | null;
  hasReservePrice?: boolean;
  reserveMet?: boolean;
  minimumNextBid?: number;
  lotStatus: AuctionStatus;
  currentHighestBid: number;
  currentHighestBidderId: string | null;
  totalBidsCount: number;
  startTime: string;
  endTime: string;
  isExtended: boolean;
  bids: AuctionBidItem[];
  activeAward?: {
    id: string;
    status: string;
    offerAmount: number;
    buyer: { id: string; fullName: string } | null;
  } | null;
}

export interface AdminAuctionLotsResponse {
  id: string;
  title: string;
  status: AuctionStatus;
  startTime: string;
  endTime: string;
  serverTime?: string;
  introDurationMs?: number;
  elapsedMs?: number;
  isIntroActive?: boolean;
  lots: AdminAuctionLot[];
}

export interface AuctionQueryInput {
  status?: AuctionStatus;
  sellerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuctionListResponse {
  items: AuctionEntity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateAuctionInput {
  productId: string;
  title: string;
  startingPrice: number;
  reservePrice?: number;
  bidIncrement?: number;
  startTime: string;
  endTime: string;
}

export interface PlaceBidInput {
  bidAmount: number;
  auctionItemId?: string;
}

export interface AdminCreateAuctionInput {
  title: string;
  description?: string;
  imageUrl?: string | null;
  startTime: string;
  endTime: string;
  consignmentDeadline?: string;
  minBuyerReputation: number;
  minSellerReputation: number;
}

export interface AdminAuctionEntity extends AdminCreateAuctionInput {
  id: string;
  status: AuctionStatus;
  isConsignmentLocked: boolean;
  consignmentLockedAt?: string | null;
  createdByAdmin?: AuctionSeller | null;
  seller?: AuctionSeller | null;
  totalBidsCount: number;
  product?: AuctionProduct | null;
  startingPrice: number | string;
  _count?: { items: number; bids: number; awards?: number };
}

export type AdminUpdateAuctionInput = Partial<
  Omit<AdminCreateAuctionInput, 'consignmentDeadline'>
> & {
  consignmentDeadline?: string | null;
};

export interface RegisterAuctionItemInput {
  title: string;
  description: string;
  images: string[];
  proposedStartingPrice: number;
  proposedReservePrice?: number;
  proposedBidIncrement?: number;
  appraisalCertificateNumber?: string;
  appraisalAgency?: string;
  certificateImages: string[];
  certificateIssueDate?: string;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

type AuctionPrice = number | string;

/**
 * Appraised auction item returned by the administrative review endpoint.
 */
export interface AdminAuctionItem extends Omit<
  RegisterAuctionItemInput,
  'proposedStartingPrice' | 'proposedReservePrice' | 'proposedBidIncrement'
> {
  id: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  proposedStartingPrice: AuctionPrice;
  proposedReservePrice: AuctionPrice | null;
  proposedBidIncrement: AuctionPrice;
  threeModelKey?: string | null;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  seller: AuctionSeller & {
    platformEmail?: string;
    shopAvatarUrl?: string | null;
    reputationScore?: number;
    trustLevel?: string;
    isShopSuspended?: boolean;
  };
  startingPrice: AuctionPrice | null;
  reservePrice?: AuctionPrice | null;
  bidIncrement?: AuctionPrice | null;
  createdAt?: string;
  reviewedAt?: string | null;
  reviewedByAdmin?: { id: string; fullName: string } | null;
  rejectionReason?: string | null;
  lotNumber?: number | null;
  isSellerFlagged: boolean;
  flagReason?: string | null;
  staffNote?: string | null;
  awards?: NonNullable<AdminAuctionLot['activeAward']>[];
}

export interface AdminAuctionItemsResponse {
  auctionId: string;
  auctionTitle: string;
  auctionStatus: AuctionStatus;
  totalCount: number;
  items: AdminAuctionItem[];
}

export type ReviewAuctionItemInput =
  | {
      action: 'APPROVE';
      lotNumber?: number;
      startingPrice?: number;
      reservePrice?: number;
      bidIncrement?: number;
    }
  | { action: 'REJECT'; rejectionReason: string };

export interface AdminAuctionListResponse {
  items: AdminAuctionEntity[];
  pagination: AuctionListResponse['pagination'];
}

export interface PlaceBidResponse {
  bidId: string;
  bidAmount: number;
  currentHighestBid?: number;
  nextMinimumBid?: number;
  totalBidsCount?: number;
  auctionId?: string;
  auctionItemId?: string;
  lotStatus?: AuctionStatus;
  endTime?: string | Date;
  extended?: boolean;
  isExtended?: boolean;
  status?: AuctionStatus;
  success?: boolean;
}

/**
 * Response payload returned after submitting an item for auction appraisal.
 */
export interface RegisterAuctionItemResponse {
  success: boolean;
  message: string;
  item: SellerAuctionConsignment;
}

export interface AuctionIntroShowcaseResponse {
  auctionId: string;
  title: string;
  description?: string | null;
  status: AuctionStatus;
  startedAt: string;
  endTime: string;
  serverTime: string;
  introDurationMs: number;
  isIntroActive: boolean;
  elapsedMs: number;
  items: AuctionConsignmentItem[];
}

export interface StaffAuctionOverviewResponse {
  auctions: Array<{
    id: string;
    title: string;
    status: AuctionStatus;
    startTime: string;
    endTime: string;
    items?: AuctionConsignmentItem[];
  }>;
}

export type AuctionAwardTierType = 'PRIMARY_WINNER' | 'SECOND_CHANCE';

export type AuctionAwardStatusType =
  | 'AWAITING_ACCEPTANCE'
  | 'AWAITING_DEPOSIT'
  | 'AWAITING_CHECKOUT'
  | 'PAID'
  | 'PAYMENT_DEFAULT'
  | 'DECLINED'
  | 'BUYER_WITHDRAWN'
  | 'EXPIRED';

export interface AuctionAwardItem {
  id: string;
  auctionId: string;
  auctionItemId?: string | null;
  buyerId?: string;
  bidId: string;
  orderId?: string | null;
  depositAmount: number | string;
  offerAmount?: number | string;
  tier?: AuctionAwardTierType | string;
  status: AuctionAwardStatusType | string;
  expiresAt: string;
  confirmedAt?: string | null;
  completedAt?: string | null;
  resolutionNote?: string | null;
  bid?: {
    id: string;
    bidAmount: number | string;
  };
  auction?: {
    id: string;
    title: string;
    sellerId?: string;
  };
  auctionItem?: {
    id: string;
    title: string;
    images?: string[];
    startingPrice?: number | string;
    seller?: {
      id: string;
      fullName: string;
      shopAvatarUrl?: string | null;
    };
  };
  order?: {
    id: string;
    subtotal: number | string;
    totalAmount: number | string;
    status: string;
    shippingFee: number | string;
  };
}

export interface AuctionAwardQuote {
  awardId: string;
  tier: AuctionAwardTierType | string;
  offerAmount: number;
  depositAmount: number;
  remainingProductAmount: number;
  shippingFee: number;
  dueNow: number;
  totalOrderAmount: number;
  expiresAt: string;
}

export interface CheckoutAuctionAwardInput {
  addressId?: string;
  shippingAddress?: {
    recipientName: string;
    phoneNumber: string;
    province: string;
    district: string;
    ward: string;
    detailAddress: string;
    provinceId?: number;
    districtId?: number;
    wardCode?: string;
  };
  recipientName?: string;
  phone?: string;
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
}

export interface CreateAuctionComplaintInput {
  auctionItemId?: string;
  reason: string;
  evidenceUrls?: string[];
}
