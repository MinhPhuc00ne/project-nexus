import { apiRequest } from '@/services/api';
import { getStoredToken } from '@/features/auth/services/auth';

/** A product somebody saved for later. */
export interface WishlistItem {
  /** The product's id. */
  id: string;
  /** The saved row's id, when the list came from the server. */
  wishlistId?: string;
  name: string;
  price: number;
  originalPrice?: number;
  img: string;
  shopName: string;
  category?: string;
  inStock: boolean;
  addedAt: string;
}

/**
 * Where a guest's saved products live until they sign in.
 *
 * The whole wishlist used to live here, for signed-in buyers too: it was keyed
 * by user id in local storage, so saving a product on a phone left it invisible
 * on a laptop, clearing the browser lost it, and the backend's own wishlist —
 * which knows whether the product is still for sale and what it costs today —
 * was never read. A guest still has nowhere else to keep one, so this remains
 * for them alone, and is handed over on sign-in.
 */
const GUEST_WISHLIST_KEY = 'nexus:buyer-wishlist:guest';

/** Whether this browser has a session, and so a wishlist on the server. */
function signedIn(): boolean {
  return Boolean(getStoredToken());
}

function readGuestWishlist(): WishlistItem[] {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as WishlistItem[]) : [];
  } catch {
    return [];
  }
}

function writeGuestWishlist(items: WishlistItem[]): void {
  try {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
  } catch {
    // Storage disabled or full; a guest wishlist is not worth failing over.
  }
}

/**
 * The saved products, from the server when signed in.
 *
 * @returns The list, most recently added first.
 */
export async function getBuyerWishlist(): Promise<WishlistItem[]> {
  if (!signedIn()) return readGuestWishlist();
  return apiRequest<WishlistItem[]>('/buyer/wishlist');
}

/**
 * The ids of the saved products, for deciding whether a heart is filled in.
 *
 * Separate from the list because a product page needs one answer, not every
 * product's price and stock.
 *
 * @returns The product ids.
 */
export async function getBuyerWishlistIds(): Promise<string[]> {
  if (!signedIn()) return readGuestWishlist().map((item) => item.id);
  return apiRequest<string[]>('/buyer/wishlist/ids');
}

/**
 * Saves a product.
 *
 * @param item - The product, as the page already knows it. Only the id is sent
 *   when signed in; the server reads the rest from the product itself, which is
 *   why a price saved months ago no longer shows up stale.
 * @returns The list after saving.
 */
export async function addBuyerWishlistItem(
  item: Omit<WishlistItem, 'addedAt' | 'wishlistId'>,
): Promise<WishlistItem[]> {
  if (!signedIn()) {
    const current = readGuestWishlist();
    if (current.some((existing) => existing.id === item.id)) return current;
    const next = [{ ...item, addedAt: new Date().toISOString() }, ...current];
    writeGuestWishlist(next);
    return next;
  }
  await apiRequest<unknown>(`/buyer/wishlist/${encodeURIComponent(item.id)}`, { method: 'POST' });
  return getBuyerWishlist();
}

/**
 * Removes a saved product.
 *
 * @param productId - Which product.
 * @returns The list after removing it.
 */
export async function removeBuyerWishlistItem(productId: string): Promise<WishlistItem[]> {
  if (!signedIn()) {
    const next = readGuestWishlist().filter((item) => item.id !== productId);
    writeGuestWishlist(next);
    return next;
  }
  await apiRequest<unknown>(`/buyer/wishlist/${encodeURIComponent(productId)}`, {
    method: 'DELETE',
  });
  return getBuyerWishlist();
}

/**
 * Hands a guest's saved products to the account they just signed in to.
 *
 * Called once after sign-in. The local copy is cleared on success, because from
 * then on the account's list is the only one.
 *
 * @returns The merged list, or null when there was nothing to hand over.
 */
export async function syncGuestWishlist(): Promise<WishlistItem[] | null> {
  const guestItems = readGuestWishlist();
  if (guestItems.length === 0 || !signedIn()) return null;
  const merged = await apiRequest<WishlistItem[]>('/buyer/wishlist/sync', {
    method: 'POST',
    body: { productIds: guestItems.map((item) => item.id) },
  });
  writeGuestWishlist([]);
  return merged;
}
