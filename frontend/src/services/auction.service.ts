import api, { apiRequest } from './api';
import { getStoredToken } from './auth';
import {
  normalizeAuctionListResponse,
  unwrapAuctionResponse,
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
  AuctionAwardItem,
  AuctionAwardQuote,
  CheckoutAuctionAwardInput,
  CreateAuctionComplaintInput,
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

/**
 * Retrieves active and historical auction awards granted to the authenticated buyer.
 *
 * @returns Resolves with the buyer's auction award list.
 */
export async function getMyAuctionAwardsApi(): Promise<AuctionAwardItem[]> {
  const token = getStoredToken();
  if (!token) return [];
  const res = await api.get<AuctionAwardItem[] | { data: AuctionAwardItem[] }>(
    '/commerce/auction-awards',
  );
  const awards = unwrapAuctionResponse(res.data);
  return Array.isArray(awards) ? awards : [];
}

/**
 * Calculates GHN shipping fees and remaining balance due for an awarded auction lot.
 *
 * @param awardId - Identifier of the auction award.
 * @param data - Delivery address and shipping option payload.
 * @returns Resolves with the shipping quote and payment breakdown.
 */
export async function quoteAuctionAwardApi(
  awardId: string,
  data: CheckoutAuctionAwardInput,
): Promise<AuctionAwardQuote> {
  const res = await api.post<AuctionAwardQuote>(`/commerce/auction-awards/${awardId}/quote`, data);
  return unwrapAuctionResponse(res.data);
}

/**
 * Settles an awarded auction lot using the buyer's wallet balance and locked deposit.
 *
 * @param awardId - Identifier of the auction award to settle.
 * @param data - Checkout payload specifying the delivery address.
 * @returns Resolves with the created or updated order payload.
 */
export async function checkoutAuctionAwardApi(
  awardId: string,
  data: CheckoutAuctionAwardInput,
): Promise<{ id?: string; order?: { id: string } }> {
  const res = await api.post<{ id?: string; order?: { id: string } }>(
    `/commerce/auction-awards/${awardId}/checkout`,
    data,
  );
  return unwrapAuctionResponse(res.data);
}

/**
 * Submits the runner-up buyer's response (accept or decline) to a second-chance auction award.
 *
 * @param awardId - Identifier of the second-chance auction award.
 * @param accept - True to accept and lock deposit, false to decline.
 * @returns Resolves with the updated auction award state.
 */
export async function respondSecondChanceAwardApi(
  awardId: string,
  accept: boolean,
): Promise<AuctionAwardItem> {
  const res = await api.post<AuctionAwardItem>(`/commerce/auction-awards/${awardId}/respond`, {
    accept,
  });
  return unwrapAuctionResponse(res.data);
}

/**
 * Declines an active auction award and forfeits the associated reservation according to platform policy.
 *
 * @param awardId - Identifier of the auction award to decline.
 * @returns Resolves with the updated auction award record.
 */
export async function declineAuctionAwardApi(awardId: string): Promise<AuctionAwardItem> {
  const res = await api.post<AuctionAwardItem>(`/commerce/auction-awards/${awardId}/decline`);
  return res.data;
}

/**
 * Files a formal buyer complaint regarding an auction session or lot irregularity.
 *
 * @param auctionId - Identifier of the target auction session.
 * @param data - Complaint reason, description, and evidence attachments.
 * @returns Resolves with the created complaint record.
 */
export async function createAuctionComplaintApi(
  auctionId: string,
  data: CreateAuctionComplaintInput,
): Promise<{ id: string; status: string }> {
  const res = await api.post<{ id: string; status: string }>(
    `/auctions/${auctionId}/complaints`,
    data,
  );
  return res.data;
}

/**
 * Initiates or retrieves a support chat conversation for a specific auction session.
 *
 * @param auctionId - Identifier of the auction session.
 * @param message - Optional initial inquiry message.
 * @returns Resolves with the support chat session metadata.
 */
export async function requestAuctionSupportChatApi(
  auctionId: string,
  message?: string,
): Promise<{ conversationId?: string }> {
  const res = await api.post<{ conversationId?: string }>(`/auctions/${auctionId}/support-chat`, {
    message: message || 'Yêu cầu hỗ trợ về phiên đấu giá',
  });
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
