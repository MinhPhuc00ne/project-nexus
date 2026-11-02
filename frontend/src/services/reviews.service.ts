import { apiRequest } from './api';

export interface ProductReviewItem {
  id: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: { id: string; fullName: string; avatarUrl: string | null };
}

export interface ShopReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: { id: string; fullName: string; avatarUrl: string | null };
}

export interface ProductReviewsResponse {
  items: ProductReviewItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ShopReviewsResponse {
  items: ShopReviewItem[];
  total: number;
  page: number;
  limit: number;
}

function pageQuery(page: number, limit: number): string {
  return `?page=${encodeURIComponent(String(page))}&limit=${encodeURIComponent(String(limit))}`;
}

export function getProductReviewsApi(
  productId: string,
  page = 1,
  limit = 10,
): Promise<ProductReviewsResponse> {
  return apiRequest<ProductReviewsResponse>(
    `/catalog/products/${encodeURIComponent(productId)}/reviews${pageQuery(page, limit)}`,
  );
}

export function getShopReviewsApi(
  shopId: string,
  page = 1,
  limit = 10,
): Promise<ShopReviewsResponse> {
  return apiRequest<ShopReviewsResponse>(
    `/catalog/shops/${encodeURIComponent(shopId)}/reviews${pageQuery(page, limit)}`,
  );
}

export function getSellerProductReviewsApi(page = 1, limit = 50): Promise<ProductReviewsResponse> {
  return apiRequest<ProductReviewsResponse>(`/seller/product-reviews${pageQuery(page, limit)}`, {
    requireAuth: true,
  });
}

export function submitProductReviewApi(
  orderId: string,
  productId: string,
  data: { rating: number; comment: string },
): Promise<ProductReviewItem> {
  return apiRequest<ProductReviewItem>(
    `/commerce/orders/${encodeURIComponent(orderId)}/products/${encodeURIComponent(productId)}/review`,
    {
      method: 'POST',
      requireAuth: true,
      body: { rating: data.rating, comment: data.comment.trim() },
    },
  );
}

export function submitShopReviewApi(
  orderId: string,
  data: { rating: number; comment: string },
): Promise<ShopReviewItem> {
  return apiRequest<ShopReviewItem>(`/commerce/orders/${encodeURIComponent(orderId)}/shop-review`, {
    method: 'POST',
    requireAuth: true,
    body: { rating: data.rating, comment: data.comment.trim() },
  });
}
