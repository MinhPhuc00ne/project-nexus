import { ApiRequestError, apiRequest } from './api';

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

export interface SellerShopReviewsResponse extends ShopReviewsResponse {
  stats: {
    averageRating: number;
    totalReviews: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  totalPages: number;
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

/** Shop reviews received by the currently authenticated seller. */
export function getSellerShopReviewsApi(page = 1, limit = 50): Promise<SellerShopReviewsResponse> {
  return apiRequest<SellerShopReviewsResponse>(`/seller/reviews${pageQuery(page, limit)}`, {
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

export function updateProductReviewApi(
  orderId: string,
  productId: string,
  data: { rating: number; comment: string },
): Promise<ProductReviewItem> {
  return apiRequest<ProductReviewItem>(
    `/commerce/orders/${encodeURIComponent(orderId)}/products/${encodeURIComponent(productId)}/review`,
    {
      method: 'PATCH',
      requireAuth: true,
      body: { rating: data.rating, comment: data.comment.trim() },
    },
  );
}

export function deleteProductReviewApi(orderId: string, productId: string): Promise<unknown> {
  return apiRequest<unknown>(
    `/commerce/orders/${encodeURIComponent(orderId)}/products/${encodeURIComponent(productId)}/review`,
    { method: 'DELETE', requireAuth: true },
  );
}

export async function updateBuyerProductReviewApi(
  orderIds: string[],
  productId: string,
  data: { rating: number; comment: string },
): Promise<ProductReviewItem> {
  let notFound: ApiRequestError | undefined;
  for (const orderId of orderIds) {
    try {
      return await updateProductReviewApi(orderId, productId, data);
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 404) throw error;
      notFound = error;
    }
  }
  throw notFound ?? new Error('No completed order found for this product review.');
}

export function saveBuyerProductReviewApi(
  existing: boolean,
  orderId: string,
  orderIds: string[],
  productId: string,
  data: { rating: number; comment: string },
): Promise<ProductReviewItem> {
  return existing
    ? updateBuyerProductReviewApi(orderIds, productId, data)
    : submitProductReviewApi(orderId, productId, data);
}

export async function deleteBuyerProductReviewApi(
  orderIds: string[],
  productId: string,
): Promise<unknown> {
  let notFound: ApiRequestError | undefined;
  for (const orderId of orderIds) {
    try {
      return await deleteProductReviewApi(orderId, productId);
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 404) throw error;
      notFound = error;
    }
  }
  throw notFound ?? new Error('No completed order found for this product review.');
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

export function updateShopReviewApi(
  orderId: string,
  data: { rating: number; comment: string },
): Promise<ShopReviewItem> {
  return apiRequest<ShopReviewItem>(`/commerce/orders/${encodeURIComponent(orderId)}/shop-review`, {
    method: 'PATCH',
    requireAuth: true,
    body: { rating: data.rating, comment: data.comment.trim() },
  });
}

export function deleteShopReviewApi(orderId: string): Promise<unknown> {
  return apiRequest<unknown>(`/commerce/orders/${encodeURIComponent(orderId)}/shop-review`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function updateBuyerShopReviewApi(
  orderIds: string[],
  data: { rating: number; comment: string },
): Promise<ShopReviewItem> {
  let notFound: ApiRequestError | undefined;
  for (const orderId of orderIds) {
    try {
      return await updateShopReviewApi(orderId, data);
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 404) throw error;
      notFound = error;
    }
  }
  throw notFound ?? new Error('No completed order found for this shop review.');
}

export function saveBuyerShopReviewApi(
  existing: boolean,
  orderId: string,
  orderIds: string[],
  data: { rating: number; comment: string },
): Promise<ShopReviewItem> {
  return existing ? updateBuyerShopReviewApi(orderIds, data) : submitShopReviewApi(orderId, data);
}

export async function deleteBuyerShopReviewApi(orderIds: string[]): Promise<unknown> {
  let notFound: ApiRequestError | undefined;
  for (const orderId of orderIds) {
    try {
      return await deleteShopReviewApi(orderId);
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 404) throw error;
      notFound = error;
    }
  }
  throw notFound ?? new Error('No completed order found for this shop review.');
}
