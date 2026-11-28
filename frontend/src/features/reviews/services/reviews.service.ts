import { ApiRequestError, apiRequest } from '@/services/api';

export interface ReviewMediaItem {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO';
  url: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface ReviewReplyItem {
  id: string;
  authorId: string;
  authorRole: 'SELLER' | 'BUYER' | string;
  content: string;
  isHidden?: boolean;
  hiddenReason?: string | null;
  createdAt: string;
  author: { id: string; fullName: string; avatarUrl: string | null };
  media?: ReviewMediaItem[];
}

export interface ReviewRepliesResponse {
  items: ReviewReplyItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductReviewItem {
  id: string;
  productId: string;
  rating: number;
  comment: string | null;
  mediaUrls?: string[];
  media?: ReviewMediaItem[];
  sellerReply?: string | null;
  sellerRepliedAt?: string | null;
  helpfulCount?: number;
  createdAt: string;
  reviewer: { id: string; fullName: string; avatarUrl: string | null };
}

export interface ShopReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  mediaUrls?: string[];
  media?: ReviewMediaItem[];
  createdAt: string;
  reviewer: { id: string; fullName: string; avatarUrl: string | null };
}

export interface ProductReviewsResponse {
  items: ProductReviewItem[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface ShopReviewsResponse {
  items: ShopReviewItem[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface SellerShopReviewsResponse extends ShopReviewsResponse {
  stats: {
    averageRating: number;
    totalReviews: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  totalPages: number;
}

export type ReviewSortBy = 'newest' | 'oldest';

export interface ReviewQueryOptions {
  rating?: number;
  sortBy?: ReviewSortBy;
}

export const REVIEW_MEDIA_MAX_FILES = 6;
export const REVIEW_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const REVIEW_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const REVIEW_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const REVIEW_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime']);

function hasAllowedExtension(fileName: string, allowedExtensions: string[]): boolean {
  const lower = fileName.toLowerCase();
  return allowedExtensions.some((ext) => lower.endsWith(ext));
}

export type ReviewMediaValidationError =
  'maxFiles' | 'unsupportedType' | 'imageTooLarge' | 'videoTooLarge' | 'emptyFile';

/**
 * Validates review or reply attachments against the backend strict review media policy.
 *
 * @param files - Files selected by the user.
 * @returns An error code when invalid, or `null` when valid.
 */
export function validateReviewMediaFiles(files: File[]): ReviewMediaValidationError | null {
  if (files.length > REVIEW_MEDIA_MAX_FILES) {
    return 'maxFiles';
  }
  for (const file of files) {
    if (file.size <= 0) return 'emptyFile';
    const isImage =
      REVIEW_IMAGE_TYPES.has(file.type) ||
      hasAllowedExtension(file.name, ['.png', '.jpg', '.jpeg', '.webp']);
    const isVideo =
      REVIEW_VIDEO_TYPES.has(file.type) || hasAllowedExtension(file.name, ['.mp4', '.mov']);
    if (!isImage && !isVideo) return 'unsupportedType';
    if (isImage && file.size > REVIEW_IMAGE_MAX_BYTES) return 'imageTooLarge';
    if (isVideo && file.size > REVIEW_VIDEO_MAX_BYTES) return 'videoTooLarge';
  }
  return null;
}

async function uploadReviewMediaFiles(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const body = new FormData();
    body.append('file', file);
    const res = await apiRequest<{ url: string }>('/media/upload', {
      method: 'POST',
      body,
      isFormData: true,
      requireAuth: true,
    });
    if (res?.url) urls.push(res.url);
  }
  return urls;
}

function pageQuery(page: number, limit: number, options?: ReviewQueryOptions): string {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (options?.rating !== undefined) {
    params.set('rating', String(options.rating));
  }
  if (options?.sortBy) {
    params.set('sortBy', options.sortBy);
  }
  return `?${params.toString()}`;
}

export function getProductReviewsApi(
  productId: string,
  page = 1,
  limit = 10,
  options?: ReviewQueryOptions,
): Promise<ProductReviewsResponse> {
  return apiRequest<ProductReviewsResponse>(
    `/catalog/products/${encodeURIComponent(productId)}/reviews${pageQuery(page, limit, options)}`,
  );
}

export function getShopReviewsApi(
  shopId: string,
  page = 1,
  limit = 10,
  options?: ReviewQueryOptions,
): Promise<ShopReviewsResponse> {
  return apiRequest<ShopReviewsResponse>(
    `/catalog/shops/${encodeURIComponent(shopId)}/reviews${pageQuery(page, limit, options)}`,
  );
}

/** Fetches paginated 2-way replies for a product or shop review. */
export function getReviewRepliesApi(
  kind: 'product' | 'shop',
  reviewId: string,
  page = 1,
  limit = 20,
): Promise<ReviewRepliesResponse> {
  const segment = kind === 'product' ? 'product-reviews' : 'shop-reviews';
  return apiRequest<ReviewRepliesResponse>(
    `/catalog/${segment}/${encodeURIComponent(reviewId)}/replies${pageQuery(page, limit)}`,
  );
}

/** Sends a 2-way reply (optionally with image/video attachments) on a product or shop review. */
export function createReviewReplyApi(
  kind: 'product' | 'shop',
  reviewId: string,
  payload: { content: string; files?: File[] },
): Promise<ReviewReplyItem> {
  const segment = kind === 'product' ? 'product-reviews' : 'shop-reviews';
  const trimmedContent = payload.content.trim();
  const files = payload.files ?? [];

  if (files.length > 0) {
    const formData = new FormData();
    formData.append('content', trimmedContent);
    for (const file of files) {
      formData.append('files', file);
    }
    return apiRequest<ReviewReplyItem>(
      `/commerce/${segment}/${encodeURIComponent(reviewId)}/replies`,
      {
        method: 'POST',
        requireAuth: true,
        isFormData: true,
        body: formData,
      },
    );
  }

  return apiRequest<ReviewReplyItem>(
    `/commerce/${segment}/${encodeURIComponent(reviewId)}/replies`,
    {
      method: 'POST',
      requireAuth: true,
      body: { content: trimmedContent },
    },
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
  data: { rating: number; comment: string; files?: File[] },
): Promise<ProductReviewItem> {
  const path = `/commerce/orders/${encodeURIComponent(orderId)}/products/${encodeURIComponent(productId)}/review`;
  const files = data.files ?? [];
  if (files.length > 0) {
    const formData = new FormData();
    formData.append('rating', String(data.rating));
    formData.append('comment', data.comment.trim());
    for (const file of files) {
      formData.append('files', file);
    }
    return apiRequest<ProductReviewItem>(path, {
      method: 'POST',
      requireAuth: true,
      isFormData: true,
      body: formData,
    });
  }
  return apiRequest<ProductReviewItem>(path, {
    method: 'POST',
    requireAuth: true,
    body: { rating: data.rating, comment: data.comment.trim() },
  });
}

export async function updateProductReviewApi(
  orderId: string,
  productId: string,
  data: { rating: number; comment: string; files?: File[]; mediaUrls?: string[] },
): Promise<ProductReviewItem> {
  const uploadedUrls = data.files?.length ? await uploadReviewMediaFiles(data.files) : [];
  const combinedUrls = [...(data.mediaUrls ?? []), ...uploadedUrls];
  return apiRequest<ProductReviewItem>(
    `/commerce/orders/${encodeURIComponent(orderId)}/products/${encodeURIComponent(productId)}/review`,
    {
      method: 'PATCH',
      requireAuth: true,
      body: {
        rating: data.rating,
        comment: data.comment.trim(),
        ...(combinedUrls.length > 0 ? { mediaUrls: combinedUrls } : {}),
      },
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
  data: { rating: number; comment: string; files?: File[]; mediaUrls?: string[] },
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
  data: { rating: number; comment: string; files?: File[]; mediaUrls?: string[] },
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
  data: { rating: number; comment: string; files?: File[] },
): Promise<ShopReviewItem> {
  const path = `/commerce/orders/${encodeURIComponent(orderId)}/shop-review`;
  const files = data.files ?? [];
  if (files.length > 0) {
    const formData = new FormData();
    formData.append('rating', String(data.rating));
    formData.append('comment', data.comment.trim());
    for (const file of files) {
      formData.append('files', file);
    }
    return apiRequest<ShopReviewItem>(path, {
      method: 'POST',
      requireAuth: true,
      isFormData: true,
      body: formData,
    });
  }
  return apiRequest<ShopReviewItem>(path, {
    method: 'POST',
    requireAuth: true,
    body: { rating: data.rating, comment: data.comment.trim() },
  });
}

export async function updateShopReviewApi(
  orderId: string,
  data: { rating: number; comment: string; files?: File[]; mediaUrls?: string[] },
): Promise<ShopReviewItem> {
  const uploadedUrls = data.files?.length ? await uploadReviewMediaFiles(data.files) : [];
  const combinedUrls = [...(data.mediaUrls ?? []), ...uploadedUrls];
  return apiRequest<ShopReviewItem>(`/commerce/orders/${encodeURIComponent(orderId)}/shop-review`, {
    method: 'PATCH',
    requireAuth: true,
    body: {
      rating: data.rating,
      comment: data.comment.trim(),
      ...(combinedUrls.length > 0 ? { mediaUrls: combinedUrls } : {}),
    },
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
  data: { rating: number; comment: string; files?: File[]; mediaUrls?: string[] },
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
  data: { rating: number; comment: string; files?: File[]; mediaUrls?: string[] },
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
