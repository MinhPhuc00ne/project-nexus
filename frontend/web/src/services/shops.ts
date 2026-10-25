import { apiRequest } from './api';
import type {
  ShopDetail,
  SellerShopProfile,
  UpdateSellerShop,
  UpdateSellerShopResult,
} from '../types/shop.types';
import { getSellerResource } from './sellerResources';

const pending = new Map<string, Promise<ShopDetail>>();

export function getShopDetail(sellerId: string, page = 1, limit = 1): Promise<ShopDetail> {
  if (!sellerId.trim()) return Promise.reject(new Error('Thiếu mã gian hàng.'));
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
  return getSellerResource('/seller/shop-profile');
}

export async function updateSellerShopProfile(
  body: UpdateSellerShop,
): Promise<UpdateSellerShopResult> {
  const result = await apiRequest<UpdateSellerShopResult>('/seller/shop-profile', {
    method: 'PATCH',
    body,
    requireAuth: true,
  });
  if (!result.success) throw new Error(result.message || 'Chưa cập nhật được gian hàng.');
  return result;
}
