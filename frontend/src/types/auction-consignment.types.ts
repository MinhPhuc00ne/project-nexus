import type { AuctionStatus } from '@nexus/types';

/**
 * Approved or proposed consignment lot included in an auction session payload.
 */
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
  currentHighestBid?: number | string | null;
  currentHighestBidderId?: string | null;
  totalBidsCount?: number;
  lotStatus?: AuctionStatus;
  startTime?: string | null;
  endTime?: string | null;
  originalEndTime?: string;
  isExtended?: boolean;
  staffNote?: string | null;
  activeAward?: {
    id: string;
    tier?: string;
    status: string;
    offerAmount: number | string;
    depositAmount?: number | string;
    remainingProductAmount?: number | string;
    orderId?: string | null;
    expiresAt?: string;
    buyer?: { id: string; fullName: string; email?: string; reputationScore?: number } | null;
  } | null;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  seller?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    shopAvatarUrl?: string | null;
  };
}

/**
 * Review state for an auction item submitted by a seller.
 */
export type AuctionConsignmentStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

/**
 * Seller consignment record with appraisal data and its parent auction details.
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
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
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
    consignmentDeadline?: string | null;
    isConsignmentLocked?: boolean;
  };
}
