import i18n from '../../i18n/index';
import type { SellerShopProfile, UpdateSellerShop } from '@/features/catalog/types/shop.types';

export interface ShopForm {
  storeName: string;
  storeDescription: string;
  phone: string;
  businessEmail: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  latitude: string;
  longitude: string;
}

export function shopFormFromProfile(profile: SellerShopProfile): ShopForm {
  return {
    storeName: profile.storeName,
    storeDescription: profile.storeDescription || '',
    phone: profile.phone || '',
    businessEmail: profile.businessEmail || '',
    street: profile.address?.street || '',
    ward: profile.address?.ward || '',
    district: profile.address?.district || '',
    city: profile.address?.city || '',
    latitude: profile.address?.latitude?.toString() ?? '',
    longitude: profile.address?.longitude?.toString() ?? '',
  };
}

export function shopFormPayload(
  form: ShopForm,
  initial: ShopForm,
  section: 'store' | 'shipping',
): UpdateSellerShop {
  const body: UpdateSellerShop = {};
  const keys =
    section === 'store'
      ? (['storeName', 'storeDescription', 'phone', 'businessEmail'] as const)
      : (['street', 'ward', 'district', 'city'] as const);
  for (const key of keys) {
    const value = form[key].trim();
    if (value !== initial[key].trim()) body[key] = value;
  }
  if (section === 'store') {
    if (!form.storeName.trim())
      throw new Error(i18n.t('settings.formValidation.storeNameRequired', { ns: 'seller' }));
    if (!form.phone.trim())
      throw new Error(i18n.t('settings.formValidation.phoneRequired', { ns: 'seller' }));
    if (body.businessEmail === '')
      throw new Error(i18n.t('settings.formValidation.businessEmailEmpty', { ns: 'seller' }));
    if (form.businessEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.businessEmail.trim()))
      throw new Error(i18n.t('settings.formValidation.businessEmailInvalid', { ns: 'seller' }));
  } else {
    if (!form.street.trim() || !form.city.trim())
      throw new Error(i18n.t('settings.formValidation.addressRequired', { ns: 'seller' }));
    // Send both fields so BE can synchronize the default pickup address.
    if (Object.keys(body).length) {
      body.street = form.street.trim();
      body.city = form.city.trim();
      body.formattedAddress = [form.street, form.ward, form.district, form.city]
        .map((value) => value.trim())
        .filter(Boolean)
        .join(', ');
      body.placeId = '';
    }
    if (Boolean(form.latitude.trim()) !== Boolean(form.longitude.trim()))
      throw new Error(i18n.t('settings.formValidation.coordsPairRequired', { ns: 'seller' }));
    if (
      (!form.latitude.trim() && initial.latitude) ||
      (!form.longitude.trim() && initial.longitude)
    )
      throw new Error(i18n.t('settings.formValidation.coordsDeleteBlocked', { ns: 'seller' }));
    if (form.latitude.trim() && form.longitude.trim()) {
      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);
      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      )
        throw new Error(i18n.t('settings.formValidation.coordsInvalid', { ns: 'seller' }));
      if (
        Object.keys(body).length ||
        form.latitude !== initial.latitude ||
        form.longitude !== initial.longitude
      ) {
        body.latitude = latitude;
        body.longitude = longitude;
        // Coordinate-only changes also need street/city for BE address synchronization.
        body.street = form.street.trim();
        body.city = form.city.trim();
      }
    }
  }
  if (!Object.keys(body).length)
    throw new Error(i18n.t('settings.formValidation.noChanges', { ns: 'seller' }));
  return body;
}
