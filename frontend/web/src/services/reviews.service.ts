import api from './api';

export interface ProductReviewItem {
  id: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  sellerResponse?: {
    comment: string;
    respondedAt: string;
    shopName: string;
  } | null;
}

export interface ProductReviewsResponse {
  items: ProductReviewItem[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Lấy danh sách đánh giá thực tế của sản phẩm từ Backend Database qua Axios
 */
export async function getProductReviewsApi(
  productId: string,
  page = 1,
  limit = 10,
): Promise<ProductReviewsResponse> {
  try {
    const response = await api.get<{
      statusCode: number;
      message: string;
      data: ProductReviewsResponse;
    }>(`/catalog/products/${encodeURIComponent(productId)}/reviews`, {
      params: { page, limit },
    });

    const payload = response?.data;
    const data = (
      payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
    ) as ProductReviewsResponse;
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: data?.total ?? 0,
      page: data?.page ?? page,
      limit: data?.limit ?? limit,
    };
  } catch {
    return {
      items: [],
      total: 0,
      page: 1,
      limit,
    };
  }
}

/**
 * Gửi đánh giá cho sản phẩm từ Buyer kèm OrderId đã hoàn tất
 */
export async function submitProductReviewApi(
  productId: string,
  data: { rating: number; comment: string; orderId?: string },
): Promise<unknown> {
  if (!data.orderId) {
    throw new Error('Chỉ tài khoản đã mua và nhận hàng thành công mới có thể gửi đánh giá.');
  }

  const response = await api.post(
    `/commerce/orders/${encodeURIComponent(data.orderId)}/products/${encodeURIComponent(productId)}/review`,
    {
      rating: data.rating,
      comment: data.comment.trim(),
    },
  );

  return response.data;
}
