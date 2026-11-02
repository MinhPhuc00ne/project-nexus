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

function getStorageKey(userId?: string): string {
  return `${WISHLIST_KEY_PREFIX}:${userId || 'guest'}`;
}

export function getBuyerWishlist(userId?: string): WishlistItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBuyerWishlist(userId: string | undefined, items: WishlistItem[]): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(items));
  } catch {
    // Ignore storage quota
  }
}

export function addBuyerWishlistItem(
  userId: string | undefined,
  item: Omit<WishlistItem, 'addedAt'>,
): WishlistItem[] {
  const current = getBuyerWishlist(userId);
  if (current.some((i) => i.id === item.id)) return current;
  const next = [{ ...item, addedAt: new Date().toISOString() }, ...current];
  saveBuyerWishlist(userId, next);
  return next;
}

export function removeBuyerWishlistItem(
  userId: string | undefined,
  itemId: string,
): WishlistItem[] {
  const current = getBuyerWishlist(userId);
  const next = current.filter((i) => i.id !== itemId);
  saveBuyerWishlist(userId, next);
  return next;
}
