import { apiRequest } from './api';
import { getStoredToken } from './auth';
import type { CartItem } from '../types/cart.types';

export type { CartItem };

const GUEST_CART_STORAGE_KEY = 'nexus:guest-cart';
const AUTH_CART_CACHE_KEY = 'nexus:auth-cart-cache';
const SELECTED_IDS_STORAGE_KEY = 'nexus:cart-selected-ids';

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
    const raw = localStorage.getItem(AUTH_CART_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAuthCartCache(items: CartItem[]): void {
  try {
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
 * Tải giỏ hàng mới nhất từ API backend nếu đã đăng nhập, hoặc từ guest storage nếu chưa đăng nhập.
 */
export async function fetchCart(): Promise<CartItem[]> {
  const token = getStoredToken();
  if (!token) {
    return getGuestCartItems();
  }

  try {
    const res = await apiRequest<BackendCartResponse>('/commerce/cart', {
      method: 'GET',
      requireAuth: true,
    });

    const selectedSet = getStoredSelectedIds();
    const mapped = (res?.items || []).map((item) => mapBackendItemToCartItem(item, selectedSet));

    saveAuthCartCache(mapped);
    return mapped;
  } catch (error) {
    console.warn('Lỗi khi tải giỏ hàng từ server:', error);
    return getAuthCartCache();
  }
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
    const productId = resolveProductId(item.productId || item.id);
    const res = await apiRequest<BackendCartResponse>('/commerce/cart/items', {
      method: 'POST',
      body: {
        productId,
        quantity: Math.max(1, quantity),
      },
      requireAuth: true,
    });

    const selectedSet = getStoredSelectedIds();
    const mapped = (res?.items || []).map((it) => mapBackendItemToCartItem(it, selectedSet));
    saveAuthCartCache(mapped);
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
    const targetQty = Math.max(0, qty);
    const res = await apiRequest<BackendCartResponse>(`/commerce/cart/items/${id}`, {
      method: 'PATCH',
      body: { quantity: targetQty },
      requireAuth: true,
    });

    const selectedSet = getStoredSelectedIds();
    const mapped = (res?.items || []).map((it) => mapBackendItemToCartItem(it, selectedSet));
    saveAuthCartCache(mapped);
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
    const res = await apiRequest<BackendCartResponse>(`/commerce/cart/items/${id}`, {
      method: 'DELETE',
      requireAuth: true,
    });

    const selectedSet = getStoredSelectedIds();
    const mapped = (res?.items || []).map((it) => mapBackendItemToCartItem(it, selectedSet));
    saveAuthCartCache(mapped);
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
    try {
      await apiRequest<BackendCartResponse>('/commerce/cart', {
        method: 'DELETE',
        requireAuth: true,
      });
    } catch {
      // Ignore cleanup error
    }
    saveAuthCartCache([]);
    saveStoredSelectedIds([]);
    return;
  }

  saveGuestCartItems([]);
  saveStoredSelectedIds([]);
}

/**
 * Tự động gộp giỏ hàng Guest (LocalStorage) vào Database của Buyer sau khi đăng nhập.
 */
export async function mergeGuestCartAfterLogin(): Promise<void> {
  const token = getStoredToken();
  if (!token) return;

  const guestItems = getGuestCartItems();
  if (guestItems.length === 0) {
    // Không có món nào từ guest -> chỉ cần tải giỏ từ backend
    await fetchCart();
    return;
  }

  try {
    const payloadItems = guestItems
      .filter((i) => i.qty > 0)
      .map((i) => ({
        productId: resolveProductId(i.productId || i.id),
        quantity: i.qty,
      }));

    if (payloadItems.length > 0) {
      const res = await apiRequest<BackendCartResponse>('/commerce/cart/merge', {
        method: 'POST',
        body: { items: payloadItems },
        requireAuth: true,
      });

      if (res && Array.isArray(res.items)) {
        const selectedSet = getStoredSelectedIds();
        const mapped = res.items.map((it) => mapBackendItemToCartItem(it, selectedSet));
        saveAuthCartCache(mapped);
      }
    }

    // Xóa giỏ tạm của guest sau khi gộp thành công
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    localStorage.removeItem('nexus:cart-items');

    // Đồng bộ lại lần nữa để đảm bảo thống nhất
    await fetchCart();
  } catch (error) {
    console.error('Lỗi khi gộp giỏ hàng khách vào tài khoản:', error);
    await fetchCart();
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
