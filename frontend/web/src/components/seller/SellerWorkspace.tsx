import { createContext, useContext } from 'react';
import type { SellerDraft } from './sellerData';
export interface SellerWorkspaceState {
  preview: boolean;
  setPreview: (value: boolean) => void;
  storeName: string;
  storeLoading: boolean;
  storeError: string;
  search: string;
  setSearch: (value: string) => void;
  notify: (message: string) => void;
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
