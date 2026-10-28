import { apiRequest } from './api';
import { getStoredToken } from './auth';
import type { CartItem } from '../types/cart.types';
import {
  type BackendCartItem,
  type BackendCartResponse,
  applyRemoteCart,
  getAuthCartCache,
  getGuestCartItems,
  isCurrent,
  loadRemoteCart,
  mutationScope,
  pendingMerges,
  resetCartSync,
  resolveProductId,
  saveAuthCartCache,
  saveGuestCartItems,
  saveStoredSelectedIds,
  scopeFor,
  scopeKey,
  synchronizeCart,
} from './cartSync';

export type { CartItem, BackendCartItem, BackendCartResponse };
export { resetCartSync };

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
export async function fetchCart({ force = false }: { force?: boolean } = {}): Promise<CartItem[]> {
  const token = getStoredToken();
  if (!token) return getGuestCartItems();
  const scope = scopeFor(token);

  if (getGuestCartItems().length > 0) {
    await mergeGuestCartAfterLogin();
    return getAuthCartCache();
  }

  const merging = pendingMerges.get(scopeKey(scope));
  if (merging) {
    await merging;
    return isCurrent(scope) ? getAuthCartCache() : [];
  }
  return loadRemoteCart(scope, force);
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
    if (isCurrent(scope)) {
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
