import type { AuctionEntity, AuctionListResponse } from '../types/auction-api.types';

/**
 * Auction list response payload in either supported pagination shape.
 */
export type RawAuctionListResponse =
  | AuctionListResponse
  | {
      items: AuctionEntity[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };

/**
 * Normalizes paginated auction data returned in either supported API response shape.
 *
 * @param payload - Auction list payload with nested or top-level pagination fields.
 * @returns Auction list with a consistent nested pagination object.
 */
export function normalizeAuctionListResponse(payload: RawAuctionListResponse): AuctionListResponse {
  if (payload && 'pagination' in payload) return payload;
  return {
    items: payload?.items ?? [],
    pagination: {
      total: payload?.total ?? 0,
      page: payload?.page ?? 1,
      limit: payload?.limit ?? payload?.items?.length ?? 0,
      totalPages: payload?.totalPages ?? 0,
    },
  };
}

/**
 * Converts an auction image URL or path into the absolute public asset URL.
 *
 * @param url - Absolute URL or backend-relative image path.
 * @returns Absolute asset URL or an empty string when no image was provided.
 */
export function formatAuctionImage(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) return '';
  const trimmed = url.trim();
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(
    /\/$/,
    '',
  );
  return `${apiBase.replace(/\/api\/v1$/, '')}${cleanPath}`;
}
