import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  hideSellerProduct,
  sellerProductToForm,
  updateProductSale,
  type SellerProduct,
} from '../sellerProducts';

const mockApiRequest = vi.fn();
vi.mock('../api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

describe('sellerProducts service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sellerProductToForm', () => {
    it('converts SellerProduct object to SellerProductForm fields correctly', () => {
      const product: SellerProduct = {
        id: 'prod-1',
        title: 'Áo thun Vintage',
        description: 'Cotton 100%',
        basePrice: 150000,
        status: 'ACTIVE',
        availableQty: 10,
        totalQty: 20,
        weightGrams: 200,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 5,
        category: { id: 'cat-fashion', name: 'Thời trang' },
        images: [{ imageUrl: 'https://example.com/img1.jpg', sortOrder: 0 }],
      };

      const form = sellerProductToForm(product);
      expect(form).toEqual({
        title: 'Áo thun Vintage',
        description: 'Cotton 100%',
        categoryId: 'cat-fashion',
        price: '150000',
        quantity: '20',
        weight: '200',
        length: '30',
        width: '20',
        height: '5',
      });
    });
  });

  describe('updateProductSale', () => {
    it('calls PATCH /catalog/products/:id/sale with payload and requireAuth', async () => {
      mockApiRequest.mockResolvedValueOnce({ id: 'prod-1' });
      const sale = { salePrice: 120000, saleStartsAt: '2026-01-01', saleEndsAt: '2026-01-10' };

      await updateProductSale('prod-1', sale);
      expect(mockApiRequest).toHaveBeenCalledWith('/catalog/products/prod-1/sale', {
        method: 'PATCH',
        body: sale,
        requireAuth: true,
      });
    });
  });

  describe('hideSellerProduct', () => {
    it('rejects if id is empty or whitespace', async () => {
      await expect(hideSellerProduct('')).rejects.toThrow();
      await expect(hideSellerProduct('   ')).rejects.toThrow();
      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('calls DELETE /catalog/products/:id when valid id is passed', async () => {
      mockApiRequest.mockResolvedValueOnce({ success: true, message: 'Deleted' });
      await hideSellerProduct('prod-99');

      expect(mockApiRequest).toHaveBeenCalledWith('/catalog/products/prod-99', {
        method: 'DELETE',
        requireAuth: true,
      });
    });
  });
});
