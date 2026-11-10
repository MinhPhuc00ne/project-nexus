import { createHash } from 'node:crypto';
import { SellerGhnAccount } from '@prisma/client';
import { ShopShippingProfile } from '../../users/services/shop-shipping-profile.service';

/** Pickup response assembled from carrier metadata and the current shop profile. */
export type SellerPickupView = SellerGhnAccount &
  Omit<ShopShippingProfile, 'latitude' | 'longitude'> & {
    latitude: number | null;
    longitude: number | null;
  };

/** Normalizes Vietnamese contact numbers. @param value Contact number. @returns Comparison key. */
export function phoneKey(value: string): string {
  return value.replace(/[\s.-]/g, '').replace(/^\+?84/, '0');
}

/** Detects carrier profile changes. @param profile Current shop profile. @returns Stable fingerprint excluding map coordinates. */
export function pickupFingerprint(
  profile: Omit<ShopShippingProfile, 'latitude' | 'longitude'>,
): string {
  const values = [
    profile.name,
    phoneKey(profile.phone),
    profile.city,
    profile.district,
    profile.ward,
    profile.street,
  ];
  return createHash('sha256')
    .update(JSON.stringify(values.map((value) => value.trim())))
    .digest('hex');
}

/** Builds a compatible pickup response. @param account Carrier metadata. @param profile Current shop address. @returns Combined view. */
export function pickupView(
  account: SellerGhnAccount,
  profile: ShopShippingProfile,
): SellerPickupView {
  return {
    ...account,
    ...profile,
    phone: phoneKey(profile.phone),
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
  };
}
