import { io, type Socket } from 'socket.io-client';
import api, { API_BASE_URL, apiRequest } from './api';
import { getStoredToken } from './auth';
import type { AuctionStatus, BidStatus } from '@nexus/types';
import {
  WS_AUCTION_EVENTS,
  type WsBidPlacedPayload,
  type WsTimeExtendedPayload,
  type WsTimerSyncPayload,
} from '@nexus/types';

export interface AuctionProduct {
  id: string;
  title: string;
  threeModelKey?: string | null;
  basePrice: number;
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

export interface AuctionEntity {
  id: string;
  productId: string;
  sellerId: string;
  title: string;
  startingPrice: number;
  reservePrice?: number | null;
  currentHighestBid: number;
  currentHighestBidderId?: string | null;
  bidIncrement: number;
  status: AuctionStatus;
  startTime: string;
  endTime: string;
  originalEndTime: string;
  isExtended: boolean;
  totalBidsCount: number;
  product?: AuctionProduct;
  seller?: AuctionSeller;
  bids?: AuctionBidItem[];
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
