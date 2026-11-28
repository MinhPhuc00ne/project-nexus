import { apiRequest } from '@/services/api';
import { getStoredToken } from '@/features/auth/services/auth';
import type { CartItem } from '@/features/cart/types/cart.types';
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
} from '@/features/cart/services/cartSync';

export type { CartItem, BackendCartItem, BackendCartResponse };
export { resetCartSync };

/**
 * Fetch synchronized cart items (from Cache or LocalStorage).
 */
export function getCartItems(): CartItem[] {
  const token = getStoredToken();
  if (token) {
    return getAuthCartCache();
  }
  return getGuestCartItems();
}

/**
 * Deduplicate in-flight GET requests and reuse API responses for 1 second on initial load.
 * force bypasses reuse; cart or account changes always invalidate previous results.
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
 * Add a product to the cart.
 * Calls `/commerce/cart/items` when signed in, or persists to localStorage for guests.
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
        selections: item.selections,
      },
      requireAuth: true,
    });

    applyRemoteCart(res, scope);
    return;
  }

  // Guest visitor -> save to LocalStorage
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
 * Update item quantity in the cart.
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
 * Remove an item from the cart.
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
 * Toggle checkout selection for a single cart item.
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
 * Select or deselect all cart items.
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
 * Clear all items from the cart.
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
 * Automatically merge guest cart (LocalStorage) into buyer database cart after login.
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
 * Calculate total quantity and subtotal of selected cart items.
 */
export function getCartTotal(): { totalCount: number; selectedCount: number; totalPrice: number } {
  const items = getCartItems();
  const totalCount = items.reduce((acc, curr) => acc + curr.qty, 0);
  const selectedItems = items.filter((i) => i.selected);
  const selectedCount = selectedItems.reduce((acc, curr) => acc + curr.qty, 0);
  const totalPrice = selectedItems.reduce((acc, curr) => acc + curr.price * curr.qty, 0);

  return { totalCount, selectedCount, totalPrice };
}
