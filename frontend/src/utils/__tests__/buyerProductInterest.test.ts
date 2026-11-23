import { beforeEach, describe, expect, it } from 'vitest';
import {
  getBuyerInterestCategoryIds,
  recordBuyerProductPurchase,
  recordBuyerProductView,
} from '../buyerProductInterest';

describe('buyer product interests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('orders categories by recent view count and isolates buyers', () => {
    recordBuyerProductView('buyer-1', { id: 'product-1', categoryId: 'watches' }, 100);
    recordBuyerProductView('buyer-1', { id: 'product-2', categoryId: 'books' }, 200);
    recordBuyerProductView('buyer-1', { id: 'product-3', categoryId: 'watches' }, 300);
    recordBuyerProductView('buyer-2', { id: 'product-4', categoryId: 'books' }, 400);

    expect(getBuyerInterestCategoryIds('buyer-1', 500)).toEqual(['watches', 'books']);
    expect(getBuyerInterestCategoryIds('buyer-2', 500)).toEqual(['books']);
  });

  it('ignores expired views and stores the latest view once per product', () => {
    const now = 40 * 24 * 60 * 60 * 1000;
    recordBuyerProductView('buyer-1', { id: 'product-1', categoryId: 'old-category' }, 1);
    recordBuyerProductView('buyer-1', { id: 'product-1', categoryId: 'new-category' }, now);

    expect(getBuyerInterestCategoryIds('buyer-1', now)).toEqual(['new-category']);
  });

  it('prioritizes purchased categories over viewed categories and isolates buyers', () => {
    recordBuyerProductView('buyer-1', { id: 'view-1', categoryId: 'viewed' }, 100);
    recordBuyerProductPurchase('buyer-1', { id: 'bought-1', categoryId: 'purchased' }, 200);
    recordBuyerProductPurchase('buyer-2', { id: 'bought-2', categoryId: 'other' }, 300);

    expect(getBuyerInterestCategoryIds('buyer-1', 400)).toEqual(['purchased', 'viewed']);
    expect(getBuyerInterestCategoryIds('buyer-2', 400)).toEqual(['other']);
  });
});
