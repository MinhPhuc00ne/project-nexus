import { io, type Socket } from 'socket.io-client';
import api, { API_BASE_URL } from './api';
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
