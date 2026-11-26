import i18n from '@/i18n';
import { apiRequest } from '@/services/api';
import type {
  ShopDetail,
  SellerShopProfile,
  UpdateSellerShop,
  UpdateSellerShopResult,
} from '@/types/shop.types';
import { getSellerResource } from '@/features/seller/services/sellerResources';

export async function uploadShopAvatarFile(file: File): Promise<string> {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error(i18n.t('errors:services.shopAvatarFormat'));
  }
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error(i18n.t('errors:services.shopAvatarSize'));
  }
  const formData = new FormData();
  formData.append('file', file);
  const uploaded = await apiRequest<{ url: string }>('/media/upload', {
    method: 'POST',
    body: formData,
    isFormData: true,
    requireAuth: true,
  });
  if (!uploaded?.url) throw new Error(i18n.t('errors:services.invalidImageUrl'));
  return uploaded.url;
}

const pending = new Map<string, Promise<ShopDetail>>();

export function getShopDetail(sellerId: string, page = 1, limit = 1): Promise<ShopDetail> {
  if (!sellerId.trim()) return Promise.reject(new Error(i18n.t('errors:services.missingShopId')));
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const path = `/catalog/shops/${encodeURIComponent(sellerId)}?${params}`;
  const existing = pending.get(path);
  if (existing) return existing;
  const request = apiRequest<ShopDetail>(path).finally(() => {
    if (pending.get(path) === request) pending.delete(path);
  });
  pending.set(path, request);
  return request;
}

export function getSellerShopProfile(): Promise<SellerShopProfile> {
  return getSellerResource<SellerShopProfile>('/seller/shop-profile');
}

export async function updateSellerShopProfile(
  body: UpdateSellerShop,
): Promise<UpdateSellerShopResult> {
  const result = await apiRequest<UpdateSellerShopResult>('/seller/shop-profile', {
    method: 'PATCH',
    body,
    requireAuth: true,
  });
  if (!result.success)
    throw new Error(result.message || i18n.t('errors:services.shopUpdateFailed'));
  return result;
}
