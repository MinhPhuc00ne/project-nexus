import api, { apiRequest } from './api';
import { getStoredToken } from './auth';
import {
  normalizeAuctionListResponse,
  type RawAuctionListResponse,
} from './auction-response.helpers';
export { formatAuctionImage } from './auction-response.helpers';
import type {
  AdminAuctionAward,
  AdminAuctionComplaint,
  AuctionComplaintState,
  AwardAction,
} from '../types/admin-auction-operations.types';
import type {
  BuyerEligibilityResponse,
  MyBidItem,
  AuctionEntity,
  AuctionQueryInput,
  AuctionListResponse,
  CreateAuctionInput,
  PlaceBidInput,
  AdminCreateAuctionInput,
  AdminAuctionEntity,
  RegisterAuctionItemInput,
  AdminAuctionItem,
  AdminAuctionItemsResponse,
  AdminAuctionLotsResponse,
  ReviewAuctionItemInput,
  AdminAuctionListResponse,
  PlaceBidResponse,
  SellerAuctionConsignment,
  AuctionIntroShowcaseResponse,
  StaffAuctionOverviewResponse,
  AuctionAwardItem,
} from '../types/auction-api.types';
export type * from '../types/auction-api.types';
export { normalizeAuctionListResponse } from './auction-response.helpers';
export { createAuctionSocket } from './auction-socket.service';

import { formatAuctionImage } from './auction-response.helpers';
export const resolveAuctionImageUrl = formatAuctionImage;

export function getAdminAuctionItemsApi(id: string): Promise<AdminAuctionItemsResponse> {
  return apiRequest<AdminAuctionItemsResponse>(`/auctions/admin/${id}/items`, {
    requireAuth: true,
  });
}

export async function getAdminAuctionLotsApi(id: string): Promise<AdminAuctionLotsResponse> {
  const [room, consignments, intro] = await Promise.all([
    apiRequest<AdminAuctionLotsResponse>(`/auctions/${id}`, { requireAuth: true }),
    getAdminAuctionItemsApi(id),
    getAuctionIntroShowcaseApi(id),
  ]);
  if (!Array.isArray(room.lots) || !Array.isArray(consignments.items))
    throw new Error('Dữ liệu lô đấu giá không hợp lệ.');
  return {
    ...room,
    serverTime: intro.serverTime,
    introDurationMs: intro.introDurationMs,
    elapsedMs: intro.elapsedMs,
    isIntroActive: intro.isIntroActive,
    lots: room.lots.map((lot) => {
      const item = consignments.items.find((entry) => entry.id === lot.id);
      if (!item) return lot;
      return {
        ...lot,
        reservePrice: item.reservePrice ?? item.proposedReservePrice,
        staffNote: item.staffNote,
        activeAward:
          item.awards?.find((award) =>
            ['AWAITING_ACCEPTANCE', 'AWAITING_DEPOSIT', 'AWAITING_CHECKOUT', 'PAID'].includes(
              award.status,
            ),
          ) ?? null,
      };
    }),
  };
}

export function listAdminAuctionAwardsApi(auctionId: string): Promise<AdminAuctionAward[]> {
  return apiRequest(`/auctions/admin/awards?${new URLSearchParams({ auctionId })}`, {
    requireAuth: true,
  });
}
export function confirmAdminAuctionAwardApi(id: string, action: AwardAction, note: string) {
  return apiRequest(`/auctions/admin/awards/${id}/${action}`, {
    method: 'POST',
    body: { confirmed: true, note: note.trim() || undefined },
    requireAuth: true,
  });
}
export function listAdminAuctionComplaintsApi(
  auctionId: string,
  status: AuctionComplaintState | '',
): Promise<AdminAuctionComplaint[]> {
  return apiRequest(
    `/auctions/complaints?${new URLSearchParams({ auctionId, ...(status ? { status } : {}) })}`,
    { requireAuth: true },
  );
}
export function resolveAdminAuctionComplaintApi(
  id: string,
  status: 'ACCEPTED' | 'REJECTED',
  adminNote: string,
) {
  return apiRequest(`/auctions/complaints/${id}/resolve`, {
    method: 'PATCH',
    body: { status, adminNote: adminNote.trim() || undefined },
    requireAuth: true,
  });
}
export function saveAdminAuctionLotNoteApi(id: string, staffNote: string) {
  return apiRequest(`/auctions/staff/items/${id}/note`, {
    method: 'PATCH',
    body: { staffNote: staffNote.trim() },
    requireAuth: true,
  });
}

export function adminEndAuctionLotApi(auctionId: string, itemId: string): Promise<unknown> {
  return apiRequest(`/auctions/admin/${auctionId}/items/${itemId}/end`, {
    method: 'POST',
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

export function reviewAuctionItemApi(itemId: string, data: ReviewAuctionItemInput) {
  return apiRequest<{ success: boolean; message: string }>(
    `/auctions/admin/items/${itemId}/review`,
    { method: 'POST', body: data, requireAuth: true },
  );
}

export function getAdminAuctionsApi(
  query: AuctionQueryInput = {},
): Promise<AdminAuctionListResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return apiRequest<RawAuctionListResponse>(`/auctions?${params}`, { requireAuth: true }).then(
    (response) => normalizeAuctionListResponse(response) as AdminAuctionListResponse,
  );
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

export function adminLockConsignmentApi(
  id: string,
): Promise<
  Pick<AdminAuctionEntity, 'id' | 'status' | 'isConsignmentLocked' | 'consignmentLockedAt'>
> {
  return apiRequest(`/auctions/admin/${id}/lock-consignment`, {
    method: 'POST',
    requireAuth: true,
  });
}

/**
 * Retrieves public auction listings with optional status filters and pagination.
 */
export async function getAuctionsApi(query?: AuctionQueryInput): Promise<AuctionListResponse> {
  const response = await api.get<{ data: AuctionListResponse }>('/auctions', { params: query });
  const payload = response?.data;
  const raw = (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as RawAuctionListResponse;
  return normalizeAuctionListResponse(raw);
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

/** Returns auction sessions that staff can monitor from the support workspace. */
export function getStaffAuctionOverviewApi(): Promise<StaffAuctionOverviewResponse> {
  return apiRequest<StaffAuctionOverviewResponse>('/auctions/staff/overview', {
    requireAuth: true,
  });
}

/** Opens a staff support conversation linked to this auction room. */
export function requestAuctionSupportChatApi(
  auctionId: string,
  message: string,
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/auctions/${encodeURIComponent(auctionId)}/support-chat`, {
    method: 'POST',
    body: { message },
    requireAuth: true,
  });
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
