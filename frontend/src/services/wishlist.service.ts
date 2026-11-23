import api from './api';
import { getStoredToken } from './auth';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  img: string;
  shopName: string;
  category?: string;
  inStock: boolean;
  addedAt: string;
}

const WISHLIST_KEY_PREFIX = 'nexus:buyer-wishlist';
const GUEST_KEY = `${WISHLIST_KEY_PREFIX}:guest`;

function getStorageKey(userId?: string): string {
  return `${WISHLIST_KEY_PREFIX}:${userId || 'guest'}`;
}

export function getLocalWishlist(userId?: string): WishlistItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalWishlist(userId: string | undefined, items: WishlistItem[]): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(items));
  } catch {
    // Ignore storage quota
  }
}

export function getGuestWishlist(): WishlistItem[] {
  return getLocalWishlist('guest');
}

export function clearGuestWishlist(): void {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Lấy danh sách yêu thích từ API (nếu đã đăng nhập) hoặc từ LocalStorage (nếu là khách).
 */
export async function fetchBuyerWishlist(userId?: string): Promise<WishlistItem[]> {
  const token = getStoredToken();
  if (!token) {
    return getLocalWishlist('guest');
  }

  try {
    const response = await api.get<{ data: WishlistItem[] }>('/buyer/wishlist');
    const items = response?.data?.data ?? [];
    saveLocalWishlist(userId, items);
    return items;
  } catch (error) {
    console.error('Lỗi khi tải wishlist từ server:', error);
    return getLocalWishlist(userId);
  }
}

/**
 * Lấy danh sách ID các sản phẩm trong Wishlist.
 */
export async function fetchBuyerWishlistIds(): Promise<string[]> {
  const token = getStoredToken();
  if (!token) {
    return getLocalWishlist('guest').map((i) => i.id);
  }

  try {
    const response = await api.get<{ data: string[] }>('/buyer/wishlist/ids');
    return response?.data?.data ?? [];
  } catch {
    return getLocalWishlist().map((i) => i.id);
  }
}

/**
 * Thêm sản phẩm vào Wishlist (API nếu đăng nhập, LocalStorage nếu là khách).
 */
export async function addBuyerWishlist(
  userId: string | undefined,
  item: Omit<WishlistItem, 'addedAt'>,
): Promise<WishlistItem[]> {
  const token = getStoredToken();
  const current = getLocalWishlist(userId);

  if (token) {
    try {
      const response = await api.post<{ data: WishlistItem }>(`/buyer/wishlist/${item.id}`);
      const saved = response?.data?.data;
      const updated = saved
        ? [saved, ...current.filter((i) => i.id !== item.id)]
        : [
            { ...item, addedAt: new Date().toISOString() },
            ...current.filter((i) => i.id !== item.id),
          ];
      saveLocalWishlist(userId, updated);
      return updated;
    } catch (error) {
      console.error('Lỗi khi thêm wishlist lên server:', error);
    }
  }

  if (current.some((i) => i.id === item.id)) return current;
  const next = [{ ...item, addedAt: new Date().toISOString() }, ...current];
  saveLocalWishlist(userId, next);
  return next;
}

/**
 * Xóa sản phẩm khỏi Wishlist (API nếu đăng nhập, LocalStorage nếu là khách).
 */
export async function removeBuyerWishlist(
  userId: string | undefined,
  itemId: string,
): Promise<WishlistItem[]> {
  const token = getStoredToken();
  const current = getLocalWishlist(userId);
  const next = current.filter((i) => i.id !== itemId);
  saveLocalWishlist(userId, next);

  if (token) {
    try {
      await api.delete(`/buyer/wishlist/${itemId}`);
    } catch (error) {
      console.error('Lỗi khi xóa wishlist trên server:', error);
    }
  }

  return next;
}

/**
 * Đồng bộ giỏ yêu thích của khách sau khi đăng nhập.
 */
export async function syncGuestWishlistAfterLogin(userId?: string): Promise<void> {
  const token = getStoredToken();
  if (!token) return;

  const guestItems = getGuestWishlist();
  if (guestItems.length === 0) return;

  try {
    const productIds = guestItems.map((item) => item.id);
    const response = await api.post<{ data: WishlistItem[] }>('/buyer/wishlist/sync', {
      productIds,
    });
    const synced = response?.data?.data ?? [];
    saveLocalWishlist(userId, synced);
    clearGuestWishlist();
  } catch (error) {
    console.error('Lỗi khi đồng bộ guest wishlist:', error);
  }
}

// Giữ lại các alias cũ để tương thích ngược 100%
export const getBuyerWishlist = getLocalWishlist;
export const saveBuyerWishlist = saveLocalWishlist;
export const addBuyerWishlistItem = (
  userId: string | undefined,
  item: Omit<WishlistItem, 'addedAt'>,
): WishlistItem[] => {
  void addBuyerWishlist(userId, item);
  const current = getLocalWishlist(userId);
  if (current.some((i) => i.id === item.id)) return current;
  const next = [{ ...item, addedAt: new Date().toISOString() }, ...current];
  saveLocalWishlist(userId, next);
  return next;
};
export const removeBuyerWishlistItem = (
  userId: string | undefined,
  itemId: string,
): WishlistItem[] => {
  void removeBuyerWishlist(userId, itemId);
  const current = getLocalWishlist(userId);
  const next = current.filter((i) => i.id !== itemId);
  saveLocalWishlist(userId, next);
  return next;
};
