import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import api from '@/services/api';
import { saveAuthSession } from '@/features/auth/services/auth';
import {
  addBuyerWishlistItem,
  getBuyerWishlist,
  getBuyerWishlistIds,
  removeBuyerWishlistItem,
  syncGuestWishlist,
} from '@/features/wishlist/services/wishlist.service';

/**
 * Where a saved product actually lives.
 *
 * The whole wishlist used to be local storage keyed by user id, so a buyer who
 * saved something on their phone did not have it on a laptop, clearing the
 * browser lost it, and the backend's own wishlist — which knows whether the
 * product is still for sale and what it costs today — was never read.
 */

const PRODUCT = {
  id: 'prod-1',
  name: 'Thing',
  price: 1000,
  img: '',
  shopName: 'Shop',
  inStock: true,
};

describe('buyer wishlist', () => {
  const originalAdapter = api.defaults.adapter;
  let calls: AxiosRequestConfig[] = [];

  beforeEach(() => {
    localStorage.clear();
    calls = [];
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  /** Answers every request with `payload`, recording what was asked. */
  function respondWith(payload: unknown) {
    api.defaults.adapter = (async (config) => {
      calls.push(config);
      return {
        data: { data: payload },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }) as AxiosAdapter;
  }

  function signIn() {
    saveAuthSession({ id: 'u-1', email: 'b@nexus.test', fullName: 'Buyer' }, 'tok', 'ref');
  }

  it('keeps a guest list in this browser, because a guest has no account', async () => {
    respondWith([]);

    await addBuyerWishlistItem(PRODUCT);
    const saved = await getBuyerWishlist();

    expect(saved.map((item) => item.id)).toEqual(['prod-1']);
    expect(await getBuyerWishlistIds()).toEqual(['prod-1']);
    // Nothing was sent: there is nobody to send it for.
    expect(calls).toHaveLength(0);
  });

  it('does not save the same product twice for a guest', async () => {
    await addBuyerWishlistItem(PRODUCT);
    const second = await addBuyerWishlistItem(PRODUCT);

    expect(second).toHaveLength(1);
  });

  it('reads a signed-in buyer list from the server', async () => {
    signIn();
    respondWith([{ ...PRODUCT, wishlistId: 'w-1', addedAt: '2026-01-01T00:00:00.000Z' }]);

    const list = await getBuyerWishlist();

    expect(list[0].wishlistId).toBe('w-1');
    expect(calls[0].url).toBe('/buyer/wishlist');
    expect(calls[0].method?.toUpperCase()).toBe('GET');
  });

  it('sends only the product id when saving, and re-reads the list', async () => {
    signIn();
    respondWith([]);

    await addBuyerWishlistItem(PRODUCT);

    // The price and stock come from the product, not from whatever the page
    // happened to be showing when the heart was clicked.
    expect(calls[0].method?.toUpperCase()).toBe('POST');
    expect(calls[0].url).toBe('/buyer/wishlist/prod-1');
    expect(calls[0].data).toBeUndefined();
    expect(calls[1].url).toBe('/buyer/wishlist');
  });

  it('removes through the account, not the browser', async () => {
    signIn();
    respondWith([]);

    await removeBuyerWishlistItem('prod-1');

    expect(calls[0].method?.toUpperCase()).toBe('DELETE');
    expect(calls[0].url).toBe('/buyer/wishlist/prod-1');
  });

  it('hands a guest list to the account on sign-in, once', async () => {
    await addBuyerWishlistItem(PRODUCT);
    signIn();
    respondWith([{ ...PRODUCT, addedAt: '2026-01-01T00:00:00.000Z' }]);

    const merged = await syncGuestWishlist();

    expect(merged).toHaveLength(1);
    expect(calls[0].url).toBe('/buyer/wishlist/sync');
    expect(JSON.parse(String(calls[0].data))).toEqual({ productIds: ['prod-1'] });

    // The local copy is cleared, so signing in again does not re-send it.
    calls = [];
    expect(await syncGuestWishlist()).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('has nothing to hand over when the guest saved nothing', async () => {
    signIn();
    respondWith([]);

    expect(await syncGuestWishlist()).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
