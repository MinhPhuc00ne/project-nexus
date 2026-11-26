import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getProductsPage,
  getTrendingProductsApi,
} from '@/features/catalog/services/products.service';
import * as apiModule from '@/services/api';

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

describe('products.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards trendingOnly, minPurchaseCount, and sortBy and maps isTrending & soldCount', async () => {
    const apiRequestMock = vi.mocked(apiModule.apiRequest);
    apiRequestMock.mockResolvedValueOnce({
      items: [
        {
          id: 'prod-1',
          title: 'Chronograph Watch',
          description: 'Luxury watch',
          basePrice: 1000000,
          availableQty: 5,
          images: ['https://example.com/watch.jpg'],
          threeModelKey: null,
          category: { id: 'cat-1', name: 'Watches' },
          seller: { id: 'seller-1', fullName: 'Timepiece Store' },
          purchaseCount: 15,
          isTrending: true,
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    });

    const result = await getProductsPage({
      trendingOnly: true,
      minPurchaseCount: 5,
      sortBy: 'trending',
    });

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/catalog/products?trendingOnly=true&minPurchaseCount=5&sortBy=trending',
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.isTrending).toBe(true);
    expect(result.items[0]?.soldCount).toBe(15);
  });

  it('returns shopName on trending products', async () => {
    const apiRequestMock = vi.mocked(apiModule.apiRequest);
    apiRequestMock.mockResolvedValueOnce({
      items: [
        {
          id: 'prod-2',
          title: 'Limited Sneaker',
          description: 'Sneaker',
          basePrice: 2500000,
          availableQty: 3,
          images: [],
          threeModelKey: null,
          category: null,
          seller: { id: 'seller-2', fullName: 'Sneaker Hub' },
          shopName: 'Sneaker Hub Official',
          purchaseCount: 22,
          lastPurchaseAt: null,
          isTrending: true,
        },
      ],
      total: 1,
    });

    const result = await getTrendingProductsApi(6);
    expect(apiRequestMock).toHaveBeenCalledWith('/catalog/products/trending?limit=6');
    expect(result.items[0]?.shopName).toBe('Sneaker Hub Official');
    expect(result.items[0]?.isTrending).toBe(true);
  });
});
