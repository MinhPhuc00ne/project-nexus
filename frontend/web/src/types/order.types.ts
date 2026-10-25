export type SellerOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PREPARING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderAddress {
  recipientName?: string;
  phone?: string;
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
  formattedAddress?: string;
}
export interface OrderParty {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
}
export interface SellerOrderItem {
  id: string;
  productId: string;
  title: string;
  thumbnail: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  weightGrams?: number;
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
}
export interface SellerShipment {
  id: string;
  carrier: string;
  trackingNumber: string | null;
  waybillCode: string | null;
  status: string;
  createdAt: string;
  chargeableWeight?: number;
  shippingFee?: number;
  metadata?: unknown;
}
export interface SellerOrder {
  id: string;
  buyer: OrderParty;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: SellerOrderStatus;
  shippingAddress: OrderAddress | null;
  items: SellerOrderItem[];
  itemsCount?: number;
  shipment: SellerShipment | null;
  createdAt: string;
  updatedAt: string;
}
export interface SellerOrderDetail extends SellerOrder {
  escrow: { status: string; totalAmount: number; platformFee: number; sellerPayout: number } | null;
}
export interface SellerOrdersPage {
  items: SellerOrder[];
  counters: {
    all: number;
    pendingPayment: number;
    paid: number;
    preparing: number;
    shipping: number;
    delivered: number;
    confirmed: number;
    cancelled: number;
    refunded: number;
  };
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface SellerOrdersQuery {
  page: number;
  limit: number;
  status?: SellerOrderStatus;
  search?: string;
}
export interface DispatchGhnRequest {
  weightGrams: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  note?: string;
}
export interface GhnDiagnostic {
  tokenConfigured: boolean;
  shopIdConfigured: boolean;
  environment: string;
  ping: { status: string; message: string; ghnCode: number | null; latencyMs: number };
}
export interface SellerWaybill {
  waybillCode: string;
  carrier: string;
  orderId: string;
  orderDate: string;
  sender: { storeName: string; phone: string; address: string };
  recipient: {
    name: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    ward: string;
  };
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  totalAmount: number;
  shippingFee: number;
  codAmount: number;
  barcodeUrl: string;
  note: string;
}
