export type ShippingType = 'DOMESTIC' | 'INTERNATIONAL';

export interface ShippingBreakdown {
  baseFee: number;
  overweightFee: number;
  distanceFee: number;
  insuranceFee?: number;
  codFee?: number;
  r2sFee?: number;
  customsFee?: number;
  customsDuty?: number;
  customsProcessFee?: number;
}

export interface ShippingCalculationResult {
  shippingType: ShippingType;
  carrier?: string;
  chargeableWeightKg: number;
  breakdown: ShippingBreakdown;
  totalFeeVnd: number;
}
