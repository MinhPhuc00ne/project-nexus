import api from './api';
import { isMockEnabled, mockDelay } from '../mocks/config';
import { MOCK_PRODUCTS_CATALOG } from '../mocks/products.mock';
import type { ProductDetail } from '../types/product.types';

/**
 * Lấy danh sách toàn bộ sản phẩm catalog.
 * - Môi trường Dev/Mock: trả về dữ liệu mẫu từ mocks/products.mock.ts
 * - Môi trường Backend: gọi API REST qua Axios và fallback nếu backend chưa kết nối.
 */
export async function getProductsCatalog(): Promise<ProductDetail[]> {
  if (isMockEnabled()) {
    await mockDelay(100);
    return MOCK_PRODUCTS_CATALOG;
  }

  try {
    const res = await api.get<ProductDetail[]>('/products');
    return res.data;
  } catch (error) {
    console.warn(
      '[ProductsService] Backend API không khả dụng, sử dụng dữ liệu mẫu dự phòng (fallback).',
      error,
    );
    return MOCK_PRODUCTS_CATALOG;
  }
}

/**
 * Lấy chi tiết 1 sản phẩm theo ID (bất đồng bộ).
 */
export async function getProductByIdAsync(id: string): Promise<ProductDetail> {
  if (isMockEnabled()) {
    await mockDelay(100);
    const found = MOCK_PRODUCTS_CATALOG.find((p) => p.id === id);
    return found || MOCK_PRODUCTS_CATALOG[0];
  }

  try {
    const res = await api.get<ProductDetail>(`/products/${id}`);
    return res.data;
  } catch (error) {
    console.warn(
      `[ProductsService] Không thể tải sản phẩm ${id} từ API, fallback sang mock data.`,
      error,
    );
    const found = MOCK_PRODUCTS_CATALOG.find((p) => p.id === id);
    return found || MOCK_PRODUCTS_CATALOG[0];
  }
}

/**
 * Hàm lấy sản phẩm đồng bộ để tương thích ngược 100% với các component hiện tại
 */
export function getProductById(id: string): ProductDetail {
  const found = MOCK_PRODUCTS_CATALOG.find((p) => p.id === id);
  return found || MOCK_PRODUCTS_CATALOG[0];
}

/**
 * Lấy danh sách sản phẩm gợi ý liên quan
 */
export function getRelatedProducts(currentId: string, limit = 4): ProductDetail[] {
  return MOCK_PRODUCTS_CATALOG.filter((p) => p.id !== currentId).slice(0, limit);
}
