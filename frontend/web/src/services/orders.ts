import api from './api';

export interface ShippingAddressInput {
  recipientName: string;
  phone: string;
  city: string;
  district?: string;
  ward?: string;
  street: string;
}

export type CheckoutPaymentMethodType = 'PAYOS' | 'COD' | 'WALLET' | 'STRIPE';

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
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    id: string;
    title: string;
    thumbnail?: string | null;
    images?: Array<{ id: string; url: string }>;
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

const COD_ORDERS_STORAGE_KEY = 'nexus_cod_orders';

export function markOrderAsCod(orderId: string): void {
  try {
    const raw = localStorage.getItem(COD_ORDERS_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(orderId)) {
      list.push(orderId);
      localStorage.setItem(COD_ORDERS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {
    // Ignore localStorage access failures
  }
}

export function isCodOrderId(orderId: string): boolean {
  try {
    const raw = localStorage.getItem(COD_ORDERS_STORAGE_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) && list.includes(orderId);
  } catch {
    return false;
  }
}

export function isCodOrder(order?: BuyerOrder | null): boolean {
  if (!order) return false;
  if (isCodOrderId(order.id) || isCodOrderId(order.orderNumber)) return true;
  const payments = order.payments ?? [];
  const hasOnlineProvider = payments.some(
    (p) => p.provider === 'PAYOS' || p.provider === 'WALLET' || p.provider === 'STRIPE',
  );
  return !hasOnlineProvider && order.status === 'PENDING_PAYMENT';
}

/**
 * 1. Đặt hàng từ giỏ hàng hiện tại (Checkout)
 */
export async function checkoutApi(data: CheckoutInput): Promise<CheckoutResponse> {
  const isCod = data.paymentMethod === 'COD';
  const apiPayload = {
    ...data,
    paymentMethod: isCod ? 'STRIPE' : data.paymentMethod,
  };

  const response = await api.post<{
    statusCode: number;
    message: string;
    data: CheckoutResponse;
  }>('/commerce/checkout', apiPayload);

  const payload = response?.data;
  const result = (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as CheckoutResponse;

  const orders = Array.isArray(result?.orders) ? result.orders : [];

  if (isCod) {
    orders.forEach((o) => markOrderAsCod(o.id));
  }

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
  provider: 'PAYOS' | 'WALLET' | 'STRIPE' = 'PAYOS',
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
