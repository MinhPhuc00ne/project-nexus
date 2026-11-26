export interface GhnProvince {
  provinceId: number;
  provinceName: string;
  code: string;
}
export interface GhnDistrict {
  districtId: number;
  districtName: string;
  code: string;
}
export interface GhnWard {
  wardCode: string;
  wardName: string;
}
export interface GhnService {
  serviceId: number;
  shortName: string;
  serviceTypeId: number;
}
export interface GhnLocation {
  provinceId: string;
  districtId: string;
  wardCode: string;
}
export interface ShippingItem {
  productId: string;
  quantity: number;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}
export interface ShippingQuoteRequest {
  sellerId: string;
  originLatitude?: number;
  originLongitude?: number;
  destLatitude: number;
  destLongitude: number;
  fromDistrictId?: number;
  fromWardCode?: string;
  toDistrictId?: number;
  toWardCode?: string;
  items: ShippingItem[];
}
export interface DirectDistanceRequest {
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  weightGrams: number;
}
export interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
  method: 'OSRM_ROUTING' | 'HAVERSINE_ESTIMATION';
  baseFee: number;
  distanceFee: number;
  weightFee: number;
  totalFee: number;
  actualWeightKg?: number;
  chargeableWeightKg?: number;
}
export interface ShippingQuote {
  origin: { name: string; latitude: number; longitude: number; addressText?: string };
  destination: {
    recipientName?: string;
    latitude: number;
    longitude: number;
    addressText?: string;
  };
  metrics: {
    distanceKm: number;
    durationMinutes: number;
    actualWeightKg: number;
    calculationMethod: DistanceResult['method'];
  };
  rates: {
    baseFee: number;
    distanceFee: number;
    weightFee: number;
    ghnCarrierFee: number | null;
    finalShippingFee: number;
  };
  escrowPreview: { platformFeeRate: number; platformFeeExampleOn100k: number; ruleSummary: string };
}
