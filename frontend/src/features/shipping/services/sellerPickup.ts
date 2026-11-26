import { apiRequest } from '@/services/api';

/**
 * Representation of a seller's physical pickup address synchronized with GHN logistics.
 */
export interface SellerPickupPoint {
  id?: string;
  name: string;
  phone: string;
  city: string;
  district: string;
  ward: string;
  street: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  ghnShopId?: number | null;
  updatedAt?: string;
}

const base = '/seller/shipping/pickup-point';

/**
 * Fetches the currently configured GHN pickup point for the authenticated seller.
 *
 * @returns Resolves with the pickup point entity or null if not yet configured.
 */
export function getSellerPickupPoint(): Promise<SellerPickupPoint | null> {
  return apiRequest<SellerPickupPoint | null>(base, { requireAuth: true });
}

/**
 * Creates or updates the seller's GHN pickup point address and synchronizes with carrier.
 *
 * @param body - Address details and contact information for parcel pickup.
 * @returns Resolves with the saved and synchronized pickup point entity.
 */
export function saveSellerPickupPoint(body: SellerPickupPoint): Promise<SellerPickupPoint> {
  return apiRequest<SellerPickupPoint>(base, { method: 'PUT', body, requireAuth: true });
}
