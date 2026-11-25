export type AdminDisputeStatus =
  'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_SELLER_FAVOR' | 'RESOLVED_BUYER_FAVOR' | 'CANCELLED';

interface DisputeUser {
  id: string;
  fullName: string;
  email: string;
}

export interface AdminDispute {
  id: string;
  orderId: string;
  reason: string;
  evidenceUrls: unknown;
  status: AdminDisputeStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  openedBy: DisputeUser;
  resolvedBy: DisputeUser | null;
  order: {
    totalAmount: number;
    buyer: DisputeUser;
    seller: DisputeUser;
    escrowRecord: { totalAmount: number; status: string } | null;
    items: { id: string; title: string; quantity: number; totalPrice: number }[];
  };
}

export interface QueryAdminDisputes {
  page?: number;
  limit?: number;
  status?: AdminDisputeStatus;
  search?: string;
}

export interface AdminDisputePage {
  items: AdminDispute[];
  counters: {
    all: number;
    pendingReview: number;
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
