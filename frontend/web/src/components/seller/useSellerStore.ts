import { useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getShopDetail } from '../../services/shops';
import useProductResource from '../productDetail/useProductResource';
import type { ShopProfile } from '../../types/shop.types';

type Store = {
  name: string;
  shop: ShopProfile | null;
  loading: boolean;
  error: string;
  refresh: () => void;
};

export function useSellerStore(userId: string): Store {
  const { token } = useAuth();
  const load = useCallback(async () => {
    if (!token) throw new Error('Vui lòng đăng nhập để xem gian hàng.');
    const result = await getShopDetail(userId);
    if (result.shop?.id !== userId) throw new Error('Thông tin gian hàng không hợp lệ.');
    return result.shop;
  }, [token, userId]);
  const { data, loading, error, retry } = useProductResource(load);
  return { name: data?.name || '', shop: data, loading, error, refresh: retry };
}
