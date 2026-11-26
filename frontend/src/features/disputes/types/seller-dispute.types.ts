import type { OrderParty } from '@/features/orders/types/order.types';

export type SellerDisputeStatus =
  'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_SELLER_FAVOR' | 'RESOLVED_BUYER_FAVOR' | 'CANCELLED';
export interface SellerDispute {
  id: string;
  orderId: string;
  reason: string;
  evidenceUrls: unknown;
  status: SellerDisputeStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  openedBy: OrderParty;
  order: {
    id: string;
    totalAmount: number;
    status: string;
    items: {
      id: string;
      title: string;
      quantity: number;
      unitPrice: number;
      thumbnail: string | null;
    }[];
  };
}
export interface SellerDisputesPage {
  items: SellerDispute[];
  counters: {
    all: number;
    open: number;
    underReview: number;
    resolvedSellerFavor: number;
    resolvedBuyerFavor: number;
    cancelled: number;
  };
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
