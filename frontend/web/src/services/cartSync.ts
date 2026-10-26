import { apiRequest } from './api';
import { getStoredToken, getStoredUser } from './auth';
import type { CartItem } from '../types/cart.types';

export const GUEST_CART_STORAGE_KEY = 'nexus:guest-cart';
export const AUTH_CART_CACHE_KEY = 'nexus:auth-cart-cache';
export const AUTH_CART_OWNER_KEY = 'nexus:auth-cart-owner';
export const SELECTED_IDS_STORAGE_KEY = 'nexus:cart-selected-ids';

let sessionVersion = 0;
let cartVersion = 0;
export const pendingReads = new Map<string, Promise<CartItem[]>>();
export const pendingMerges = new Map<string, Promise<void>>();
export const CART_READ_FRESH_MS = 1000;
export let recentRead: { key: string; version: number; at: number; items: CartItem[] } | null =
  null;

export interface CartScope {
  token: string;
  owner: string | undefined;
  session: number;
  version: number;
}

export function scopeFor(token: string): CartScope {
  return { token, owner: getStoredUser()?.id, session: sessionVersion, version: cartVersion };
}

export function scopeKey(scope: CartScope): string {
  return JSON.stringify([scope.owner || scope.token, scope.session]);
}

export function isCurrent(scope: CartScope): boolean {
  return (
    scope.session === sessionVersion &&
    !!getStoredToken() &&
    (scope.owner ? getStoredUser()?.id === scope.owner : getStoredToken() === scope.token)
  );
}

export function resetCartSync(): void {
  sessionVersion++;
  cartVersion++;
  pendingReads.clear();
  pendingMerges.clear();
  recentRead = null;
  try {
    localStorage.removeItem(AUTH_CART_CACHE_KEY);
    localStorage.removeItem(AUTH_CART_OWNER_KEY);
    localStorage.removeItem(SELECTED_IDS_STORAGE_KEY);
  } catch {
    /* Storage may be disabled. */
  }
  emitCartChange();
}

export function mutationScope(token: string): CartScope {
  cartVersion++;
  return scopeFor(token);
}

export function emitCartChange(): void {
  window.dispatchEvent(new CustomEvent('nexus:cart-change'));
}

export function getStoredSelectedIds(): Set<string> | null {
  try {
    const raw = localStorage.getItem(SELECTED_IDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : null;
  } catch {
    return null;
  }
}

export function saveStoredSelectedIds(ids: string[]): void {
  try {
    localStorage.setItem(SELECTED_IDS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export interface BackendCartItem {
  id: string; // cartItemId
  productId: string;
  name: string;
  thumbnail: string | null;
  shop: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  quantity: number;
  currentPrice: number;
  priceAtAdded: number;
  hasPriceChanged: boolean;
  priceDifference: number;
  availableQty: number;
  isOutOfStock: boolean;
  isStockInsufficient: boolean;
  itemSubtotal: number;
  createdAt: string;
}

export interface BackendCartResponse {
  cartId: string;
  userId: string;
  expiresAt: string | null;
  items: BackendCartItem[];
  totalCount: number;
  totalPrice: number;
  hasPriceChanged: boolean;
}

export function mapBackendItemToCartItem(
  backendItem: BackendCartItem,
  selectedSet: Set<string> | null,
): CartItem {
  const isSelected = selectedSet ? selectedSet.has(String(backendItem.id)) : true;

  return {
    id: backendItem.id, // CartItem ID in database
    productId: backendItem.productId,
    name: backendItem.name,
    price: backendItem.currentPrice,
    formattedPrice: `${Number(backendItem.currentPrice).toLocaleString('vi-VN')} ₫`,
    qty: backendItem.quantity,
    img: backendItem.thumbnail || '/placeholder-product.png',
    shopName: backendItem.shop?.name || 'NEXUS Official',
    shopId: backendItem.shop?.id,
    selected: isSelected,
    hasPriceChanged: backendItem.hasPriceChanged,
    priceAtAdded: backendItem.priceAtAdded,
    priceDifference: backendItem.priceDifference,
    availableQty: backendItem.availableQty,
    isOutOfStock: backendItem.isOutOfStock,
    isStockInsufficient: backendItem.isStockInsufficient,
  };
}

export function getGuestCartItems(): CartItem[] {
  try {
    const raw =
      localStorage.getItem(GUEST_CART_STORAGE_KEY) || localStorage.getItem('nexus:cart-items');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestCartItems(items: CartItem[]): void {
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
    emitCartChange();
  } catch {
    // Storage quota or disabled
  }
}

export function getAuthCartCache(): CartItem[] {
  try {
    if (localStorage.getItem(AUTH_CART_OWNER_KEY) !== getStoredUser()?.id) return [];
    const raw = localStorage.getItem(AUTH_CART_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAuthCartCache(items: CartItem[]): void {
  const token = getStoredToken();
  if (token && recentRead?.key === scopeKey(scopeFor(token)) && recentRead.version === cartVersion)
    recentRead.items = items;
  try {
    localStorage.setItem(AUTH_CART_OWNER_KEY, getStoredUser()?.id || '');
    localStorage.setItem(AUTH_CART_CACHE_KEY, JSON.stringify(items));
    emitCartChange();
  } catch {
    // Storage quota or disabled
  }
}

export function applyRemoteCart(response: BackendCartResponse, scope: CartScope): CartItem[] {
  if (!isCurrent(scope)) return [];
  if (scope.version !== cartVersion) return getAuthCartCache();
  const selected = getStoredSelectedIds();
  const items = (response?.items || []).map((item) => mapBackendItemToCartItem(item, selected));
  saveAuthCartCache(items);
  recentRead = { key: scopeKey(scope), version: scope.version, at: Date.now(), items };
  return items;
}

export function loadRemoteCart(scope: CartScope, force = false): Promise<CartItem[]> {
  const key = JSON.stringify([scopeKey(scope), scope.version]);
  const existing = pendingReads.get(key);
  if (existing) return existing;
  if (
    !force &&
    recentRead?.key === scopeKey(scope) &&
    recentRead.version === scope.version &&
    Date.now() - recentRead.at < CART_READ_FRESH_MS
  )
    return Promise.resolve(recentRead.items);
  const request = apiRequest<BackendCartResponse>('/commerce/cart', { requireAuth: true })
    .then((response) => applyRemoteCart(response, scope))
    .catch(() => (isCurrent(scope) ? getAuthCartCache() : []))
    .finally(() => {
      if (pendingReads.get(key) === request) pendingReads.delete(key);
    });
  pendingReads.set(key, request);
  return request;
}

const PRODUCT_UUID_MAP: Record<string, string> = {
  'ap-tourbillon': '00000000-0000-4000-a000-000000000001',
  'patek-celestial': '00000000-0000-4000-a000-000000000002',
  'hublot-unico': '00000000-0000-4000-a000-000000000003',
  'rolex-daytona': '00000000-0000-4000-a000-000000000004',
  'rolex-submariner': '00000000-0000-4000-a000-000000000004',
  'rm-055': '00000000-0000-4000-a000-000000000005',
  'omega-speedmaster': '00000000-0000-4000-a000-000000000006',
  'tissot-tourelles': '00000000-0000-4000-a000-000000000007',
  'cartier-santos': '00000000-0000-4000-a000-000000000008',
  '1': '00000000-0000-4000-a000-000000000001',
  '2': '00000000-0000-4000-a000-000000000002',
  '3': '00000000-0000-4000-a000-000000000003',
  '4': '00000000-0000-4000-a000-000000000004',
  '5': '00000000-0000-4000-a000-000000000005',
  '6': '00000000-0000-4000-a000-000000000006',
  '7': '00000000-0000-4000-a000-000000000007',
  '8': '00000000-0000-4000-a000-000000000008',
};

export function resolveProductId(id: string | number): string {
  const s = String(id).trim();
  return PRODUCT_UUID_MAP[s] || s;
}

export async function synchronizeCart(scope: CartScope): Promise<void> {
  const guestItems = getGuestCartItems();
  const items = guestItems
    .filter((item) => item.qty > 0)
    .map((item) => ({
      productId: resolveProductId(item.productId || item.id),
      quantity: item.qty,
    }));
  if (!items.length) {
    await loadRemoteCart(scope);
    return;
  }
  const mergingScope = mutationScope(scope.token);
  try {
    const response = await apiRequest<BackendCartResponse>('/commerce/cart/merge', {
      method: 'POST',
      body: { items },
      requireAuth: true,
    });
    if (!response || !Array.isArray(response.items))
      throw new Error('Máy chủ chưa xác nhận kết quả gộp giỏ hàng.');
    if (!isCurrent(mergingScope)) return;
    applyRemoteCart(response, mergingScope);
    // Preserve guest items added in another tab while this request was pending.
    if (JSON.stringify(getGuestCartItems()) === JSON.stringify(guestItems)) {
      localStorage.removeItem(GUEST_CART_STORAGE_KEY);
      localStorage.removeItem('nexus:cart-items');
    }
  } catch {
    // Keep the guest cart for a later retry; fetch only the actual server cart.
    if (isCurrent(mergingScope)) await loadRemoteCart(scopeFor(scope.token));
  }
}
