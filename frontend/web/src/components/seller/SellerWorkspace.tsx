import { createContext, useContext } from 'react';
import type { SellerDraft } from './sellerData';
import type { ShopProfile } from '../../types/shop.types';
import type { ToastItem } from '../../types/toast.types';
export interface SellerWorkspaceState {
  preview: boolean;
  setPreview: (value: boolean) => void;
  storeName: string;
  storeLoading: boolean;
  storeError: string;
  shop: ShopProfile | null;
  refreshShop: () => void;
  search: string;
  setSearch: (value: string) => void;
  notify: (message: string, variant?: ToastItem['variant']) => void;
  drafts: SellerDraft[];
  saveDraft: (draft: SellerDraft) => boolean;
  deleteDraft: (id: string) => void;
}
export const SellerWorkspaceContext = createContext<SellerWorkspaceState | null>(null);
export function useSellerWorkspace() {
  const context = useContext(SellerWorkspaceContext);
  if (!context) throw new Error('SellerLayout is required');
  return context;
}
