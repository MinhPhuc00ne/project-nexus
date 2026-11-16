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
}

export interface AdminCreateAuctionInput {
  title: string;
  description?: string;
  imageUrl?: string | null;
  startTime: string;
  endTime: string;
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
  _count?: { items: number; bids: number };
}

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
}

/**
 * Appraised auction item returned by the administrative review endpoint.
 */
export interface AdminAuctionItem extends Omit<
  RegisterAuctionItemInput,
  'proposedStartingPrice' | 'proposedReservePrice' | 'proposedBidIncrement'
> {
  id: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  proposedStartingPrice: number | string;
  proposedReservePrice: number | string | null;
  proposedBidIncrement: number | string;
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
  startingPrice: number | string | null;
  reservePrice?: number | string | null;
  bidIncrement?: number | string | null;
  createdAt?: string;
  reviewedAt?: string | null;
  reviewedByAdmin?: { id: string; fullName: string } | null;
  rejectionReason?: string | null;
  lotNumber?: number | null;
  isSellerFlagged: boolean;
  flagReason?: string | null;
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
  success: boolean;
  bidId: string;
  bidAmount: number;
  currentHighestBid: number;
  endTime: string;
  isExtended: boolean;
  status: AuctionStatus;
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

export interface AuctionAwardItem {
  id: string;
  auctionId: string;
  bidId: string;
  orderId: string;
  depositAmount: number | string;
  status: string;
  expiresAt: string;
  completedAt?: string | null;
  order?: {
    id: string;
    subtotal: number | string;
    totalAmount: number | string;
    status: string;
    shippingFee: number | string;
  };
  auction?: {
    id: string;
    title: string;
  };
}
