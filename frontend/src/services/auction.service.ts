import { io, type Socket } from 'socket.io-client';
import api, { API_BASE_URL, apiRequest } from './api';
import { getStoredToken } from './auth';
import type { AuctionStatus, BidStatus } from '@nexus/types';
import {
  WS_AUCTION_EVENTS,
  type WsAuctionStartedPayload,
  type WsBidPlacedPayload,
  type WsTimeExtendedPayload,
  type WsTimerSyncPayload,
} from '@nexus/types';

/**
 * Chuẩn hóa URL hình ảnh từ API database hoặc uploads server
 */
export function formatAuctionImage(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(
    /\/$/,
    '',
  );
  const backendOrigin = apiBase.replace(/\/api\/v1$/, '');
  return `${backendOrigin}${cleanPath}`;
}

export const resolveAuctionImageUrl = formatAuctionImage;

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
}

export interface AdminAuctionItemsResponse {
  auctionId: string;
  auctionTitle: string;
  auctionStatus: AuctionStatus;
  totalCount: number;
  items: AdminAuctionItem[];
}

export function getAdminAuctionItemsApi(id: string): Promise<AdminAuctionItemsResponse> {
  return apiRequest<AdminAuctionItemsResponse>(`/auctions/admin/${id}/items`, {
    requireAuth: true,
  });
}

/**
 * Registers an appraisal item into a specific auction room for administrative review.
 *
 * @param id - Target auction session identifier.
 * @param data - Consignment specifications and appraisal proof.
 * @returns Resolves with registration confirmation and review payload.
 */
export function registerAuctionItemApi(
  id: string,
  data: RegisterAuctionItemInput,
): Promise<{ success: boolean; message: string; item: AdminAuctionItem }> {
  return apiRequest<{ success: boolean; message: string; item: AdminAuctionItem }>(
    `/auctions/${id}/register-item`,
    { method: 'POST', body: data, requireAuth: true },
  );
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

export function reviewAuctionItemApi(itemId: string, data: ReviewAuctionItemInput) {
  return apiRequest<{ success: boolean; message: string }>(
    `/auctions/admin/items/${itemId}/review`,
    { method: 'POST', body: data, requireAuth: true },
  );
}

export interface AdminAuctionListResponse {
  items: AdminAuctionEntity[];
  pagination: AuctionListResponse['pagination'];
}

export function getAdminAuctionsApi(
  query: AuctionQueryInput = {},
): Promise<AdminAuctionListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return apiRequest<AdminAuctionListResponse>(`/auctions?${params}`, { requireAuth: true });
}

export function adminCreateAuctionApi(data: AdminCreateAuctionInput): Promise<AdminAuctionEntity> {
  return apiRequest<AdminAuctionEntity>('/auctions/admin', {
    method: 'POST',
    body: data,
    requireAuth: true,
  });
}

/**
 * Transitions a scheduled/draft auction session into ACTIVE state and broadcasts the 3D showcase start event.
 */
export function adminStartAuctionApi(id: string): Promise<AuctionEntity> {
  return apiRequest<AuctionEntity>(`/auctions/admin/${id}/start`, {
    method: 'POST',
    requireAuth: true,
  });
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

/**
 * Retrieves public auction listings with optional status filters and pagination.
 */
export async function getAuctionsApi(query?: AuctionQueryInput): Promise<AuctionListResponse> {
  const response = await api.get<{ data: AuctionListResponse }>('/auctions', { params: query });
  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as AuctionListResponse;
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

/**
 * Retrieves synchronized live intro showcase payload and server elapsed offset for an auction room.
 */
export async function getAuctionIntroShowcaseApi(
  id: string,
): Promise<AuctionIntroShowcaseResponse> {
  const response = await api.get<{ data: AuctionIntroShowcaseResponse }>(
    `/auctions/${id}/intro-showcase`,
  );
  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as AuctionIntroShowcaseResponse;
}

/**
 * Retrieves full details and live bidding transcripts for a specific auction room.
 */
export async function getAuctionDetailApi(id: string): Promise<AuctionEntity> {
  const response = await api.get<{ data: AuctionEntity }>(`/auctions/${id}`);
  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as AuctionEntity;
}

/**
 * Retrieves bidding history for the current authenticated buyer.
 */
export async function getMyBidsApi(): Promise<MyBidItem[]> {
  const response = await api.get<MyBidItem[] | { data: MyBidItem[] }>('/auctions/my-bids');
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: MyBidItem[] }).data)
  ) {
    return (payload as { data: MyBidItem[] }).data;
  }
  return [];
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

export async function getMyAuctionAwardsApi(): Promise<AuctionAwardItem[]> {
  const token = getStoredToken();
  if (!token) return [];
  try {
    const res = await api.get('/commerce/auction-awards');
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Failed to fetch auction awards:', err);
    return [];
  }
}

export async function checkoutAuctionAwardApi(
  awardId: string,
  shippingAddress: {
    recipientName: string;
    phoneNumber: string;
    province: string;
    district: string;
    ward: string;
    detailAddress: string;
  },
) {
  const res = await api.post(`/commerce/auction-awards/${awardId}/checkout`, shippingAddress);
  return res.data;
}

export async function declineAuctionAwardApi(awardId: string) {
  const res = await api.post(`/commerce/auction-awards/${awardId}/decline`);
  return res.data;
}

/**
 * Checks whether the current buyer is eligible to place bids in a given auction.
 */
export async function checkBuyerEligibilityApi(
  auctionId: string,
): Promise<BuyerEligibilityResponse> {
  const response = await api.get<{ data: BuyerEligibilityResponse }>(
    `/auctions/${auctionId}/eligibility`,
  );
  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as BuyerEligibilityResponse;
}

/**
 * Submits a new auction listing for an owned seller catalog item.
 */
export async function createAuctionApi(data: CreateAuctionInput): Promise<AuctionEntity> {
  const response = await api.post<{ data: AuctionEntity }>('/auctions', data);
  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as AuctionEntity;
}

/**
 * Retrieves the authenticated seller's submitted auction items and their review status.
 *
 * @returns Resolves with list of consigned auction items for current seller.
 */
export async function getSellerAuctionConsignmentsApi(): Promise<SellerAuctionConsignment[]> {
  const response = await api.get<{ data: SellerAuctionConsignment[] }>('/auctions/seller/my-items');
  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as SellerAuctionConsignment[];
}

/**
 * Places a competitive bid with wallet balance reservation in an active auction.
 */
export async function placeBidApi(
  auctionId: string,
  data: PlaceBidInput,
): Promise<PlaceBidResponse> {
  const response = await api.post<{ data: PlaceBidResponse }>(`/auctions/${auctionId}/bids`, data);
  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as PlaceBidResponse;
}

/**
 * Finalizes an auction when scheduled bidding duration concludes.
 */
export async function endAuctionApi(auctionId: string): Promise<AuctionEntity> {
  const response = await api.post<{ data: AuctionEntity }>(`/auctions/${auctionId}/end`);
  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as AuctionEntity;
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

/**
 * Establishes a WebSocket connection to the auction namespace for real-time bid events.
 */
export function createAuctionSocket(auctionId?: string): AuctionSocketClient {
  const backendUrl = new URL(API_BASE_URL, window.location.origin);
  const token = getStoredToken();

  const socket: Socket = io(`${backendUrl.origin}/ws/auctions`, {
    autoConnect: true,
    auth: { token },
  });

  if (auctionId) {
    socket.emit(WS_AUCTION_EVENTS.CLIENT.JOIN_ROOM, { auctionId });
  }

  return {
    socket,
    joinRoom: (id: string) => {
      socket.emit(WS_AUCTION_EVENTS.CLIENT.JOIN_ROOM, { auctionId: id });
    },
    leaveRoom: (id: string) => {
      socket.emit(WS_AUCTION_EVENTS.CLIENT.LEAVE_ROOM, { auctionId: id });
    },
    syncViewport: (id: string, rotation: { x: number; y: number; z: number }, zoom: number) => {
      socket.emit(WS_AUCTION_EVENTS.CLIENT.SYNC_VIEWPORT, { auctionId: id, rotation, zoom });
    },
    onAuctionStarted: (handler) => {
      socket.on(WS_AUCTION_EVENTS.SERVER.AUCTION_STARTED, handler);
    },
    onBidPlaced: (handler) => {
      socket.on(WS_AUCTION_EVENTS.SERVER.BID_PLACED, handler);
    },
    onTimeExtended: (handler) => {
      socket.on(WS_AUCTION_EVENTS.SERVER.TIME_EXTENDED, handler);
    },
    onTimerSync: (handler) => {
      socket.on(WS_AUCTION_EVENTS.SERVER.TIMER_SYNC, handler);
    },
    disconnect: () => {
      if (auctionId) {
        socket.emit(WS_AUCTION_EVENTS.CLIENT.LEAVE_ROOM, { auctionId });
      }
      socket.disconnect();
    },
  };
}
