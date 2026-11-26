import i18n from '@/i18n';
import { apiRequest } from '@/services/api';
import type {
  DirectDistanceRequest,
  DistanceResult,
  GhnDistrict,
  GhnProvince,
  GhnService,
  GhnWard,
  ShippingQuote,
  ShippingQuoteRequest,
} from '@/features/shipping/types/shipping.types';

const base = '/fulfillment/shipping';
const pending = new Map<string, Promise<unknown>>();
function getResource<T>(path: string): Promise<T> {
  const existing = pending.get(path);
  if (existing) return existing as Promise<T>;
  const request = apiRequest<T>(path).finally(() => {
    if (pending.get(path) === request) pending.delete(path);
  });
  pending.set(path, request);
  return request;
}
export function getShippingProvinces(): Promise<GhnProvince[]> {
  return getResource(`${base}/provinces`);
}
export function getShippingDistricts(provinceId: number): Promise<GhnDistrict[]> {
  return getResource(`${base}/districts/${provinceId}`);
}
export function getShippingWards(districtId: number): Promise<GhnWard[]> {
  return getResource(`${base}/wards/${districtId}`);
}
export function getShippingServices(
  fromDistrictId: number,
  toDistrictId: number,
): Promise<GhnService[]> {
  return getResource(
    `${base}/available-services?${new URLSearchParams({ fromDistrictId: String(fromDistrictId), toDistrictId: String(toDistrictId) })}`,
  );
}
export function getShippingQuote(body: ShippingQuoteRequest): Promise<ShippingQuote> {
  return apiRequest(`${base}/quote`, { method: 'POST', body, requireAuth: true });
}
export function getShippingDistance(body: DirectDistanceRequest): Promise<DistanceResult> {
  return apiRequest(`${base}/distance`, { method: 'POST', body });
}
export function parseCoordinate(value: string, latitude: boolean): number {
  const number = Number(value);
  if (!value.trim() || !Number.isFinite(number) || Math.abs(number) > (latitude ? 90 : 180)) {
    throw new Error(
      latitude ? i18n.t('errors:services.latitudeRange') : i18n.t('errors:services.longitudeRange'),
    );
  }
  return number;
}
