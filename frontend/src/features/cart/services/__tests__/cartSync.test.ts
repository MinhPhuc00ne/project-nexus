import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiModule from '@/services/api';
import { saveAuthSession } from '@/features/auth/services/auth';
import {
  applyRemoteCart,
  getAuthCartCache,
  getGuestCartItems,
  getStoredSelectedIds,
  GUEST_CART_STORAGE_KEY,
  loadRemoteCart,
  mapBackendItemToCartItem,
  resetCartSync,
  resolveProductId,
  saveGuestCartItems,
  saveStoredSelectedIds,
  scopeFor,
  synchronizeCart,
  type BackendCartItem,
  type BackendCartResponse,
} from '@/features/cart/services/cartSync';

function makeBackendItem(overrides: Partial<BackendCartItem> = {}): BackendCartItem {
  return {
    id: 'ci-1',
    productId: 'prod-1',
    name: 'Chronograph Watch',
    thumbnail: null,
    shop: { id: 'shop-1', name: 'Nexus Atelier', avatarUrl: null },
    quantity: 2,
    currentPrice: 1500000,
    priceAtAdded: 1500000,
    hasPriceChanged: false,
    priceDifference: 0,
    availableQty: 5,
    isOutOfStock: false,
    isStockInsufficient: false,
    itemSubtotal: 3000000,
    createdAt: '2026-01-01T00:00:00.000Z',
    selections: { strap: 'leather' },
    ...overrides,
  };
}

describe('cartSync service', () => {
  beforeEach(() => {
    localStorage.clear();
    resetCartSync();
    vi.restoreAllMocks();
  });

  it('stores and reads guest cart items and selected IDs', () => {
    expect(getGuestCartItems()).toEqual([]);
    expect(getStoredSelectedIds()).toBeNull();

    saveGuestCartItems([
      {
        id: '1',
        productId: '1',
        name: 'Watch',
        price: 1000,
        formattedPrice: '1.000 ₫',
        qty: 1,
        img: '/w.png',
        selected: true,
      },
    ]);
    saveStoredSelectedIds(['ci-1']);

    expect(getGuestCartItems()).toHaveLength(1);
    expect(getStoredSelectedIds()?.has('ci-1')).toBe(true);

    localStorage.setItem(GUEST_CART_STORAGE_KEY, '{corrupt');
    expect(getGuestCartItems()).toEqual([]);
  });

  it('maps backend cart items and resolves legacy product slugs', () => {
    const mapped = mapBackendItemToCartItem(makeBackendItem(), new Set(['other-id']));
    expect(mapped.selected).toBe(false);
    expect(mapped.img).toBe('/placeholder-product.png');
    expect(mapped.shopName).toBe('Nexus Atelier');

    expect(resolveProductId('ap-tourbillon')).toBe('00000000-0000-4000-a000-000000000001');
    expect(resolveProductId('custom-uuid')).toBe('custom-uuid');
  });

  it('deduplicates concurrent loadRemoteCart calls and caches fresh reads', async () => {
    saveAuthSession({ id: 'u-1', email: 'u@nexus.test', fullName: 'User' }, 'tok-1', 'ref-1');
    const response: BackendCartResponse = {
      cartId: 'c-1',
      userId: 'u-1',
      expiresAt: null,
      items: [makeBackendItem()],
      totalCount: 2,
      totalPrice: 3000000,
      hasPriceChanged: false,
    };

    const reqSpy = vi.spyOn(apiModule, 'apiRequest').mockResolvedValue(response);
    const scope = scopeFor('tok-1');

    const [first, second] = await Promise.all([loadRemoteCart(scope), loadRemoteCart(scope)]);
    expect(reqSpy).toHaveBeenCalledTimes(1);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(getAuthCartCache()).toHaveLength(1);

    // Within CART_READ_FRESH_MS, subsequent non-forced call uses recentRead
    const cached = await loadRemoteCart(scope);
    expect(reqSpy).toHaveBeenCalledTimes(1);
    expect(cached).toHaveLength(1);
  });

  it('ignores stale applyRemoteCart results after resetCartSync', () => {
    saveAuthSession({ id: 'u-1', email: 'u@nexus.test', fullName: 'User' }, 'tok-1', 'ref-1');
    const staleScope = scopeFor('tok-1');
    resetCartSync();

    const applied = applyRemoteCart(
      {
        cartId: 'c-1',
        userId: 'u-1',
        expiresAt: null,
        items: [makeBackendItem()],
        totalCount: 1,
        totalPrice: 1500000,
        hasPriceChanged: false,
      },
      staleScope,
    );
    expect(applied).toEqual([]);
  });

  it('merges guest cart into server cart on synchronizeCart and clears guest storage', async () => {
    saveAuthSession({ id: 'u-1', email: 'u@nexus.test', fullName: 'User' }, 'tok-1', 'ref-1');
    saveGuestCartItems([
      {
        id: '1',
        productId: 'ap-tourbillon',
        name: 'Tourbillon',
        price: 1000,
        formattedPrice: '1.000 ₫',
        qty: 2,
        img: '/w.png',
        selected: true,
        selections: { color: 'silver' },
      },
    ]);

    const reqSpy = vi.spyOn(apiModule, 'apiRequest').mockResolvedValue({
      cartId: 'c-1',
      userId: 'u-1',
      expiresAt: null,
      items: [makeBackendItem()],
      totalCount: 2,
      totalPrice: 3000000,
      hasPriceChanged: false,
    });

    await synchronizeCart(scopeFor('tok-1'));

    expect(reqSpy).toHaveBeenCalledWith('/commerce/cart/merge', {
      method: 'POST',
      body: {
        items: [
          {
            productId: '00000000-0000-4000-a000-000000000001',
            quantity: 2,
            selections: { color: 'silver' },
          },
        ],
      },
      requireAuth: true,
    });
    expect(localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
    expect(getAuthCartCache()).toHaveLength(1);
  });
});
