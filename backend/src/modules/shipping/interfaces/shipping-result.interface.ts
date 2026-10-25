export type ShippingType = 'DOMESTIC' | 'INTERNATIONAL';

export interface ShippingBreakdown {
  baseFee: number;
  overweightFee: number;
  distanceFee: number;
  customsFee?: number;
  customsDuty?: number;
  customsProcessFee?: number;
}

export interface ShippingCalculationResult {
  shippingType: ShippingType;
  chargeableWeightKg: number;
  breakdown: ShippingBreakdown;
  totalFeeVnd: number;
}
