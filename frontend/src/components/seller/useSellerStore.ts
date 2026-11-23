import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('seller');
  const { token } = useAuth();
  const load = useCallback(async () => {
    if (!token) throw new Error(t('session.loginToViewShop'));
    const result = await getShopDetail(userId);
    if (result.shop?.id !== userId) throw new Error(t('session.invalidShopInfo'));
    return result.shop;
  }, [t, token, userId]);
  const { data, loading, error, retry } = useProductResource(load);
  return { name: data?.name || '', shop: data, loading, error, refresh: retry };
}
