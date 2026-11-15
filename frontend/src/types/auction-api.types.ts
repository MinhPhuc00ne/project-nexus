import { type Socket } from 'socket.io-client';
import type { AuctionStatus, BidStatus } from '@nexus/types';
import {
  type WsAuctionStartedPayload,
  type WsBidPlacedPayload,
  type WsTimeExtendedPayload,
  type WsTimerSyncPayload,
} from '@nexus/types';

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

export interface AuctionConsignmentItem {
  id: string;
  title: string;
  description?: string;
  images?: string[];
  videoUrl?: string | null;
  threeModelKey?: string | null;
  appraisalCertificateNumber?: string | null;
  appraisalAgency?: string | null;
  certificateImages?: string[];
  certificateIssueDate?: string | null;
  status?: string;
  lotNumber?: number | null;
  startingPrice?: number | string | null;
  proposedStartingPrice?: number | string | null;
  reservePrice?: number | string | null;
  proposedReservePrice?: number | string | null;
  bidIncrement?: number | string | null;
  proposedBidIncrement?: number | string | null;
  seller?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    shopAvatarUrl?: string | null;
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
  productId: string;
  sellerId: string;
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
  _count?: { items: number; bids: number };
}

export interface RegisterAuctionItemInput {
  title: string;
  description: string;
  images: string[];
  proposedStartingPrice: number;
  proposedReservePrice?: number;
  proposedBidIncrement?: number;
  threeModelKey?: string;
  appraisalCertificateNumber?: string;
  appraisalAgency?: string;
  certificateImages: string[];
  certificateIssueDate?: string;
}

export interface AdminAuctionItem extends Omit<
  RegisterAuctionItemInput,
  'proposedStartingPrice' | 'proposedReservePrice' | 'proposedBidIncrement'
> {
  id: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  proposedStartingPrice: number | string;
  proposedReservePrice: number | string | null;
  proposedBidIncrement: number | string;
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
  success: boolean;
  bidId: string;
  bidAmount: number;
  currentHighestBid: number;
  endTime: string;
  isExtended: boolean;
  status: AuctionStatus;
}

/**
 * Lifecycle review state of a seller auction consignment item.
 */
export type AuctionConsignmentStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

/**
 * Consigned auction item entity with review status and parent auction details.
 */
export interface SellerAuctionConsignment {
  id: string;
  auctionId: string;
  title: string;
  description: string;
  images: string[];
  proposedStartingPrice: number;
  proposedReservePrice?: number | null;
  proposedBidIncrement: number;
  appraisalCertificateNumber?: string | null;
  appraisalAgency?: string | null;
  certificateImages: string[];
  certificateIssueDate?: string | null;
  status: AuctionConsignmentStatus;
  rejectionReason?: string | null;
  lotNumber?: number | null;
  createdAt: string;
  auction: {
    id: string;
    title: string;
    status: AuctionStatus;
    startTime: string;
    endTime: string;
    minSellerReputation: number;
  };
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

export interface AuctionSocketClient {
  socket: Socket;
  joinRoom: (auctionId: string) => void;
  leaveRoom: (auctionId: string) => void;
  syncViewport: (
    auctionId: string,
    rotation: { x: number; y: number; z: number },
    zoom: number,
  ) => void;
  onAuctionStarted: (handler: (payload: WsAuctionStartedPayload) => void) => void;
  onBidPlaced: (handler: (payload: WsBidPlacedPayload) => void) => void;
  onTimeExtended: (handler: (payload: WsTimeExtendedPayload) => void) => void;
  onTimerSync: (handler: (payload: WsTimerSyncPayload) => void) => void;
  disconnect: () => void;
}
