import api from '@/services/api';

export interface ShippingAddressInput {
  recipientName: string;
  phone: string;
  city: string;
  district?: string;
  ward?: string;
  street: string;
}

export type CheckoutPaymentMethodType = 'PAYOS' | 'COD' | 'WALLET';

export interface CheckoutInput {
  shippingAddress: ShippingAddressInput;
  itemIds?: string[];
  shippingFee?: number;
  paymentMethod?: CheckoutPaymentMethodType;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayosPaymentInfo {
  orderId: string;
  orderCode: number;
  paymentId: string;
  checkoutUrl: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  amount: number;
  description?: string;
}

export interface OrderItemDetail {
  id: string;
  orderId: string;
  productId: string;
  selections?: Record<string, string> | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    id: string;
    title: string;
    category?: { id: string; name?: string } | null;
    thumbnail?: string | null;
    images?: Array<{ id: string; url?: string; imageUrl?: string }>;
  };
}

export interface BuyerOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  status:
    | 'PENDING_PAYMENT'
    | 'PAID'
    | 'PREPARING'
    | 'SHIPPING'
    | 'DELIVERED'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'DISPUTED'
    | 'REFUNDED';
  totalAmount: number;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  shippingAddress?: ShippingAddressInput;
  shippingAddressSnapshot?: ShippingAddressInput;
  createdAt: string;
  updatedAt: string;
  seller?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
  };
  items: OrderItemDetail[];
  payments?: Array<{
    id: string;
    provider: string;
    amount: number;
    status: string;
    transactionCode?: string;
  }>;
}

export interface CheckoutResponse {
  orders: BuyerOrder[];
  payosPayment: PayosPaymentInfo | null;
}

export function isCodOrder(order?: BuyerOrder | null): boolean {
  if (!order) return false;
  const payments = order.payments ?? [];
  return payments.some((p) => p.provider === 'COD' || p.provider === 'CASH');
}

export interface CheckoutQuoteResponse {
  quotes: Array<{
    sellerId: string;
    subtotal: number;
    shippingFee: number;
    totalAmount: number;
  }>;
  totalShippingFee: number;
  totalAmount: number;
}

/**
 * Lấy báo giá phí vận chuyển GHN chính thức trước khi đặt hàng
 */
export async function getCheckoutQuoteApi(data: {
  shippingAddress: ShippingAddressInput;
  itemIds?: string[];
}): Promise<CheckoutQuoteResponse> {
  const response = await api.post<{
    statusCode: number;
    message: string;
    data: CheckoutQuoteResponse;
  }>('/commerce/checkout/quote', data);

  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as CheckoutQuoteResponse;
}

/**
 * 1. Đặt hàng từ giỏ hàng hiện tại (Checkout)
 */
export async function checkoutApi(data: CheckoutInput): Promise<CheckoutResponse> {
  const isCod = data.paymentMethod === 'COD';

  const response = await api.post<{
    statusCode: number;
    message: string;
    data: CheckoutResponse;
  }>('/commerce/checkout', data);

  const payload = response?.data;
  const result = (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as CheckoutResponse;

  const orders = Array.isArray(result?.orders) ? result.orders : [];

  return {
    orders,
    payosPayment: isCod ? null : (result?.payosPayment ?? null),
  };
}

/**
 * 2. Khởi tạo liên kết thanh toán PayOS VietQR cho một đơn hàng cụ thể
 */
export async function payOrderApi(
  orderId: string,
  provider: 'PAYOS' | 'WALLET' | 'COD' = 'PAYOS',
): Promise<PayosPaymentInfo> {
  const response = await api.post<{
    statusCode: number;
    message: string;
    data: PayosPaymentInfo;
  }>(`/commerce/orders/${encodeURIComponent(orderId)}/pay`, {
    provider,
    returnUrl: `${window.location.origin}/buyer/orders?paid=true`,
    cancelUrl: `${window.location.origin}/buyer/orders?cancel=true`,
  });

  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as PayosPaymentInfo;
}

/**
 * 3. Xem danh sách đơn hàng đã đặt của Buyer
 */
export async function getBuyerOrdersApi(): Promise<BuyerOrder[]> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: BuyerOrder[];
  }>('/commerce/orders');

  const payload = response?.data;
  const items =
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
  return Array.isArray(items) ? (items as BuyerOrder[]) : [];
}

/**
 * 4. Xem chi tiết một đơn hàng cụ thể
 */
export async function getBuyerOrderDetailApi(orderId: string): Promise<BuyerOrder> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: BuyerOrder;
  }>(`/commerce/orders/${encodeURIComponent(orderId)}`);

  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as BuyerOrder;
}

/**
 * 5. Gửi khiếu nại đơn hàng (Dispute)
 */
export async function disputeOrderApi(orderId: string, reason: string): Promise<unknown> {
  const response = await api.post(`/commerce/orders/${encodeURIComponent(orderId)}/dispute`, {
    reason,
  });
  return response.data;
}

/**
 * 6. Người mua xác nhận đã nhận hàng (Confirm Delivery & Release Escrow)
 */
export async function confirmDeliveryOrderApi(orderId: string): Promise<unknown> {
  const response = await api.post(
    `/commerce/orders/${encodeURIComponent(orderId)}/confirm-delivery`,
  );
  return response.data;
}

export interface PaymentStatusResponse {
  paid: boolean;
  status: string;
  message?: string;
  payosStatus?: string;
}

/**
 * 7. Kiểm tra trạng thái thanh toán đơn hàng (hỗ trợ tự động đồng bộ PayOS)
 */
export async function checkPaymentStatusApi(orderId: string): Promise<PaymentStatusResponse> {
  const response = await api.get<
    | {
        statusCode?: number;
        message?: string;
        data?: PaymentStatusResponse;
      }
    | PaymentStatusResponse
  >(`/commerce/orders/${encodeURIComponent(orderId)}/payment-status`);

  const payload = response?.data;
  if (payload && typeof payload === 'object') {
    if ('paid' in payload) return payload as PaymentStatusResponse;
    if ('data' in payload) return (payload as { data: PaymentStatusResponse }).data;
  }
  return payload as PaymentStatusResponse;
}

export const DEFAULT_SHIPPING_ADDRESS: ShippingAddressInput = {
  recipientName: '',
  phone: '',
  city: 'TP. Hồ Chí Minh',
  district: '',
  ward: '',
  street: '',
};
