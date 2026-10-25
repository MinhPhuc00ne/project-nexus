import { apiRequest } from './api';
import { getStoredToken, getStoredUser } from './auth';
import type { CartItem } from '../types/cart.types';

export type { CartItem };

const GUEST_CART_STORAGE_KEY = 'nexus:guest-cart';
const AUTH_CART_CACHE_KEY = 'nexus:auth-cart-cache';
const AUTH_CART_OWNER_KEY = 'nexus:auth-cart-owner';
const SELECTED_IDS_STORAGE_KEY = 'nexus:cart-selected-ids';
let sessionVersion = 0;
let cartVersion = 0;
const pendingReads = new Map<string, Promise<CartItem[]>>();
const pendingMerges = new Map<string, Promise<void>>();
const CART_READ_FRESH_MS = 1000;
let recentRead: { key: string; version: number; at: number; items: CartItem[] } | null = null;

interface CartScope {
  token: string;
  owner: string | undefined;
  session: number;
  version: number;
}
function scopeFor(token: string): CartScope {
  return { token, owner: getStoredUser()?.id, session: sessionVersion, version: cartVersion };
}
function scopeKey(scope: CartScope): string {
  return JSON.stringify([scope.owner || scope.token, scope.session]);
}
function isCurrent(scope: CartScope): boolean {
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
function mutationScope(token: string): CartScope {
  cartVersion++;
  return scopeFor(token);
}
function applyRemoteCart(response: BackendCartResponse, scope: CartScope): CartItem[] {
  if (!isCurrent(scope)) return [];
  if (scope.version !== cartVersion) return getAuthCartCache();
  const selected = getStoredSelectedIds();
  const items = (response?.items || []).map((item) => mapBackendItemToCartItem(item, selected));
  saveAuthCartCache(items);
  recentRead = { key: scopeKey(scope), version: scope.version, at: Date.now(), items };
  return items;
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

function emitCartChange(): void {
  window.dispatchEvent(new CustomEvent('nexus:cart-change'));
}

function getStoredSelectedIds(): Set<string> | null {
  try {
    const raw = localStorage.getItem(SELECTED_IDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : null;
  } catch {
    return null;
  }
}

function saveStoredSelectedIds(ids: string[]): void {
  try {
    localStorage.setItem(SELECTED_IDS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function mapBackendItemToCartItem(
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

function getGuestCartItems(): CartItem[] {
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

function saveGuestCartItems(items: CartItem[]): void {
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
    emitCartChange();
  } catch {
    // Storage quota or disabled
  }
}

function getAuthCartCache(): CartItem[] {
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

function saveAuthCartCache(items: CartItem[]): void {
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

/**
 * Lấy danh sách sản phẩm trong giỏ hàng đồng bộ (từ Cache hoặc LocalStorage).
 */
export function getCartItems(): CartItem[] {
  const token = getStoredToken();
  if (token) {
    return getAuthCartCache();
  }
  return getGuestCartItems();
}

/**
 * Gộp các GET đang chạy và tái sử dụng kết quả API trong 1 giây khi trang vừa tải.
 * force bỏ qua khoảng tái sử dụng; thay đổi giỏ hàng/tài khoản luôn làm kết quả cũ hết hiệu lực.
 */
export function fetchCart({ force = false }: { force?: boolean } = {}): Promise<CartItem[]> {
  const token = getStoredToken();
  if (!token) return Promise.resolve(getGuestCartItems());
  const scope = scopeFor(token);
  const merging = pendingMerges.get(scopeKey(scope));
  return merging
    ? merging.then(() => (isCurrent(scope) ? getAuthCartCache() : []))
    : loadRemoteCart(scope, force);
}

function loadRemoteCart(scope: CartScope, force = false): Promise<CartItem[]> {
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

function resolveProductId(id: string | number): string {
  const s = String(id).trim();
  return PRODUCT_UUID_MAP[s] || s;
}

/**
 * Thêm sản phẩm vào giỏ hàng.
 * Tự động gọi API `/commerce/cart/items` nếu đã đăng nhập, hoặc lưu localStorage nếu là khách.
 */
export async function addToCart(
  item: Omit<CartItem, 'qty'> & { qty?: number },
  quantity: number = 1,
): Promise<void> {
  const token = getStoredToken();

  if (token) {
    const scope = mutationScope(token);
    const productId = resolveProductId(item.productId || item.id);
    const res = await apiRequest<BackendCartResponse>('/commerce/cart/items', {
      method: 'POST',
      body: {
        productId,
        quantity: Math.max(1, quantity),
      },
      requireAuth: true,
    });

    applyRemoteCart(res, scope);
    return;
  }

  // Khách vãng lai (Guest) -> Lưu vào LocalStorage
  const current = getGuestCartItems();
  const existingIndex = current.findIndex(
    (i) =>
      String(i.id) === String(item.id) ||
      (item.productId && String(i.productId) === String(item.productId)),
  );

  if (existingIndex > -1) {
    current[existingIndex].qty += quantity;
    current[existingIndex].selected = true;
  } else {
    current.unshift({
      ...item,
      qty: Math.max(1, quantity),
      selected: true,
    });
  }

  saveGuestCartItems(current);
}

/**
 * Cập nhật số lượng của một món hàng trong giỏ.
 */
export async function updateCartQty(id: string | number, qty: number): Promise<void> {
  const token = getStoredToken();

  if (token) {
    const scope = mutationScope(token);
    const targetQty = Math.max(0, qty);
    const res = await apiRequest<BackendCartResponse>(`/commerce/cart/items/${id}`, {
      method: 'PATCH',
      body: { quantity: targetQty },
      requireAuth: true,
    });

    applyRemoteCart(res, scope);
    return;
  }

  const current = getGuestCartItems();
  const updated = current
    .map((item) => {
      if (String(item.id) === String(id)) {
        return { ...item, qty: Math.max(1, qty) };
      }
      return item;
    })
    .filter((item) => item.qty > 0);

  saveGuestCartItems(updated);
}

/**
 * Xóa một món hàng khỏi giỏ.
 */
export async function removeFromCart(id: string | number): Promise<void> {
  const token = getStoredToken();

  if (token) {
    const scope = mutationScope(token);
    const res = await apiRequest<BackendCartResponse>(`/commerce/cart/items/${id}`, {
      method: 'DELETE',
      requireAuth: true,
    });

    applyRemoteCart(res, scope);
    return;
  }

  const current = getGuestCartItems();
  const filtered = current.filter((item) => String(item.id) !== String(id));
  saveGuestCartItems(filtered);
}

/**
 * Chọn / bỏ chọn 1 sản phẩm để thanh toán.
 */
export function toggleSelectItem(id: string | number): void {
  const current = getCartItems();
  const updated = current.map((item) => {
    if (String(item.id) === String(id)) {
      return { ...item, selected: !item.selected };
    }
    return item;
  });

  const selectedIds = updated.filter((i) => i.selected).map((i) => String(i.id));
  saveStoredSelectedIds(selectedIds);

  const token = getStoredToken();
  if (token) {
    saveAuthCartCache(updated);
  } else {
    saveGuestCartItems(updated);
  }
}

/**
 * Chọn tất cả hoặc bỏ chọn tất cả.
 */
export function toggleSelectAll(selectAll: boolean): void {
  const current = getCartItems();
  const updated = current.map((item) => ({ ...item, selected: selectAll }));

  const selectedIds = updated.filter((i) => i.selected).map((i) => String(i.id));
  saveStoredSelectedIds(selectedIds);

  const token = getStoredToken();
  if (token) {
    saveAuthCartCache(updated);
  } else {
    saveGuestCartItems(updated);
  }
}

/**
 * Xóa sạch toàn bộ giỏ hàng.
 */
export async function clearCart(): Promise<void> {
  const token = getStoredToken();

  if (token) {
    const scope = mutationScope(token);
    try {
      await apiRequest<BackendCartResponse>('/commerce/cart', {
        method: 'DELETE',
        requireAuth: true,
      });
    } catch {
      // Ignore cleanup error
    }
    if (isCurrent(scope) && scope.version === cartVersion) {
      saveAuthCartCache([]);
      saveStoredSelectedIds([]);
    }
    return;
  }

  saveGuestCartItems([]);
  saveStoredSelectedIds([]);
}

/**
 * Tự động gộp giỏ hàng Guest (LocalStorage) vào Database của Buyer sau khi đăng nhập.
 */
export function mergeGuestCartAfterLogin(): Promise<void> {
  const token = getStoredToken();
  if (!token) return Promise.resolve();
  const scope = scopeFor(token);
  const key = scopeKey(scope);
  const existing = pendingMerges.get(key);
  if (existing) return existing;
  const request = synchronizeCart(scope).finally(() => {
    if (pendingMerges.get(key) === request) pendingMerges.delete(key);
  });
  pendingMerges.set(key, request);
  return request;
}

async function synchronizeCart(scope: CartScope): Promise<void> {
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

/**
 * Tính tổng số lượng và tổng tiền các món được chọn.
 */
export function getCartTotal(): { totalCount: number; selectedCount: number; totalPrice: number } {
  const items = getCartItems();
  const totalCount = items.reduce((acc, curr) => acc + curr.qty, 0);
  const selectedItems = items.filter((i) => i.selected);
  const selectedCount = selectedItems.reduce((acc, curr) => acc + curr.qty, 0);
  const totalPrice = selectedItems.reduce((acc, curr) => acc + curr.price * curr.qty, 0);

  return { totalCount, selectedCount, totalPrice };
}
