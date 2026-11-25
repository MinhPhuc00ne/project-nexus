export type SaleType = 'normal' | 'auction';
export type ProductStatus = 'pending' | 'active' | 'rejected' | 'hidden';
export type OrderStatus = 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';

export interface ManagedProduct {
  id: string;
  name: string;
  seller: string;
  category: string;
  type: SaleType;
  price: number;
  status: ProductStatus;
  description: string;
  note: string;
}

export interface ManagedOrder {
  id: string;
  product: string;
  buyer: string;
  seller: string;
  type: SaleType;
  total: number;
  status: OrderStatus;
  payment: 'unpaid' | 'paid' | 'refunded';
  shipment: string;
  createdAt: string;
  note: string;
}

export interface ManagedStore {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended';
  note: string;
}

export interface ManagedReport {
  id: string;
  type: 'product' | 'seller' | 'bidding' | 'order';
  target: string;
  reporter: string;
  description: string;
  evidence: string;
  orderId?: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  note: string;
}

export interface ManagedTransaction {
  id: string;
  orderId: string;
  seller: string;
  kind: 'payment' | 'refund' | 'payout';
  amount: number;
  fee: number;
  gateway: string;
  createdAt: string;
  status: 'pending' | 'reconciled';
  note: string;
}

export interface AdminCommerceData {
  products: ManagedProduct[];
  orders: ManagedOrder[];
  stores: ManagedStore[];
  reports: ManagedReport[];
  transactions: ManagedTransaction[];
}

export type CommerceChange =
  | { entity: 'products'; id: string; status: ProductStatus; reason: string }
  | { entity: 'orders'; id: string; status: 'cancelled'; reason: string }
  | { entity: 'stores'; id: string; status: ManagedStore['status']; reason: string }
  | { entity: 'reports'; id: string; status: ManagedReport['status']; reason: string }
  | { entity: 'transactions'; id: string; status: 'reconciled'; reason: string };

export const saleTypeLabels: Record<SaleType, string> = {
  normal: 'Bán thường',
  auction: 'Đấu giá',
};
export const productLabels: Record<ProductStatus, string> = {
  pending: 'Chờ duyệt',
  active: 'Đang hiển thị',
  rejected: 'Đã từ chối',
  hidden: 'Đã ẩn',
};
export const orderLabels: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};
export const reportLabels: Record<ManagedReport['status'], string> = {
  open: 'Mới tiếp nhận',
  investigating: 'Đang xác minh',
  resolved: 'Đã xử lý',
  dismissed: 'Đã bác bỏ',
};
export const reportTypeLabels: Record<ManagedReport['type'], string> = {
  product: 'Sản phẩm',
  seller: 'Seller',
  bidding: 'Gian lận trả giá',
  order: 'Tranh chấp đơn hàng',
};
export const transactionKindLabels: Record<ManagedTransaction['kind'], string> = {
  payment: 'Thu thanh toán',
  refund: 'Hoàn tiền',
  payout: 'Thanh toán Seller',
};
