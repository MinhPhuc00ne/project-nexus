import { BadRequestException } from '@nestjs/common';

export interface GhnParcelItem {
  name: string;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  price: number;
}

export interface GhnParcel {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  insuranceValue: number;
  serviceTypeId: number;
  items: GhnParcelItem[];
}

/**
 * Obsolete and merged administrative ward codes mapped to current GHN ward codes:
 * - 20306: Ward 6, District 3 mapped to Ward Vo Thi Sau (90795)
 * - 20307: Ward 7, District 3 mapped to Ward Vo Thi Sau (90795)
 * - 20308: Ward 8, District 3 mapped to Ward Vo Thi Sau (90795)
 */
export const OBSOLETE_GHN_WARD_CODES: Record<string, string> = {
  '20306': '90795',
  '20307': '90795',
  '20308': '90795',
};

export function normalizeGhnWardCode(code: string): string;
export function normalizeGhnWardCode(code: string | number | undefined | null): string | undefined;
export function normalizeGhnWardCode(code: string | number | undefined | null): string | undefined {
  if (!code) return undefined;
  const str = String(code).trim();
  return OBSOLETE_GHN_WARD_CODES[str] ?? str;
}

/** Packaging estimate: stack units vertically; GHN determines billable weight and price. */
export function buildGhnParcel(items: GhnParcelItem[]): GhnParcel {
  if (!items.length) throw new BadRequestException('No items provided for GHN fee calculation.');
  for (const item of items) {
    if (
      [item.quantity, item.weight, item.length, item.width, item.height].some(
        (value) => !Number.isSafeInteger(value) || value <= 0,
      ) ||
      !Number.isFinite(item.price) ||
      item.price < 0
    ) {
      throw new BadRequestException('Invalid item weight, dimensions, or quantity.');
    }
  }
  const weightGrams = items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
  const heightCm = items.reduce((sum, item) => sum + item.height * item.quantity, 0);
  const insuranceValue = Math.round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  if (![weightGrams, heightCm, insuranceValue].every(Number.isSafeInteger)) {
    throw new BadRequestException('Parcel dimensions or value exceed allowed limits.');
  }
  return {
    weightGrams,
    lengthCm: Math.max(...items.map((item) => item.length)),
    widthCm: Math.max(...items.map((item) => item.width)),
    heightCm,
    insuranceValue,
    serviceTypeId: weightGrams >= 20000 ? 5 : 2,
    items: items.map((item) => ({ ...item, price: Math.round(item.price) })),
  };
}
