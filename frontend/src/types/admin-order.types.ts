import type { OrderAddress, SellerOrderStatus } from './order.types';

// Prisma Decimal values are serialized as strings by the admin endpoints.
export type AdminOrderAmount = string | number;

export interface AdminOrderAfterSales {
  id: string;
  kind: string;
  status: string;
  reason: string;
  decisionReason: string | null;
}

export interface AdminOrder {
  id: string;
  status: SellerOrderStatus;
  subtotal: AdminOrderAmount;
  shippingFee: AdminOrderAmount;
  totalAmount: AdminOrderAmount;
  createdAt: string;
  updatedAt: string;
  cancellationActor: string | null;
  buyer: { id: string; fullName: string; email: string };
  seller: { id: string; fullName: string; email: string };
  shipment: { status: string; waybillCode: string | null } | null;
  afterSales: AdminOrderAfterSales | null;
  dispute: { id: string; status: string } | null;
  _count: { items: number };
}

export interface AdminOrderDetail extends AdminOrder {
  shippingAddressSnapshot: OrderAddress | null;
  items: {
    id: string;
    quantity: number;
    unitPrice: AdminOrderAmount;
    totalPrice: AdminOrderAmount;
    product: { id: string; title: string } | null;
    titleSnapshot: string | null;
    auctionItemId: string | null;
  }[];
  payments: {
    id: string;
    provider: string;
    amount: AdminOrderAmount;
    status: string;
    createdAt: string;
  }[];
  escrowRecord: {
    status: string;
    totalAmount: AdminOrderAmount;
    platformFee: AdminOrderAmount;
    sellerPayout: AdminOrderAmount;
  } | null;
  refunds: {
    id: string;
    amount: AdminOrderAmount;
    destination: string;
    status: string;
    externalReference: string | null;
  }[];
}

export interface QueryAdminOrders {
  page: number;
  limit: number;
  search?: string;
  status?: SellerOrderStatus;
  buyerId?: string;
  sellerId?: string;
}

export interface AdminOrderPage {
  items: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
