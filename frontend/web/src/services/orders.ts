import api from './api';

export interface ShippingAddressInput {
  recipientName: string;
  phone: string;
  city: string;
  district?: string;
  ward?: string;
  street: string;
}

export interface CheckoutInput {
  shippingAddress: ShippingAddressInput;
  itemIds?: string[];
  shippingFee?: number;
  paymentMethod?: 'PAYOS' | 'WALLET' | 'STRIPE';
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

/**
 * 1. Đặt hàng từ giỏ hàng hiện tại (Checkout)
 */
export async function checkoutApi(data: CheckoutInput): Promise<CheckoutResponse> {
  const response = await api.post<{
    statusCode: number;
    message: string;
    data: CheckoutResponse;
  }>('/commerce/checkout', data);

  const payload = response.data;
  return (payload && 'data' in payload ? payload.data : payload) as CheckoutResponse;
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

  const payload = response.data;
  return (payload && 'data' in payload ? payload.data : payload) as PayosPaymentInfo;
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

  const payload = response.data;
  return (payload && 'data' in payload ? payload.data : payload) as BuyerOrder[];
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

  const payload = response.data;
  return (payload && 'data' in payload ? payload.data : payload) as BuyerOrder;
}
