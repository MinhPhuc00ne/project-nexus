import type { AdminOrderDetail } from './admin-order.types';

export type ReturnStatus =
  'REQUESTED' | 'APPROVING' | 'APPROVED' | 'RECEIVED' | 'COMPLETED' | 'REJECTED';

export interface AdminReturnRequest {
  id: string;
  orderId: string;
  kind: string;
  status: string;
  requestedBy: string;
  reason: string;
  evidenceUrls: unknown;
  refundToWallet: boolean;
  decisionReason: string | null;
  reviewedBy: string | null;
  returnWaybillCode: string | null;
  receivedAt: string | null;
  restockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReturnOrder {
  id: string;
  isAuction: boolean;
  afterSales: AdminReturnRequest | null;
  shipment: { status: string; waybillCode: string | null } | null;
  escrowRecord: { status: string } | null;
  refunds: AdminOrderDetail['refunds'];
}

export type ReturnAction =
  | { type: 'review'; decision: 'APPROVE' | 'REJECT'; reason: string }
  | { type: 'waybill'; waybillCode: string }
  | { type: 'receive'; reason: string; restock: boolean };

export const returnStatusLabels: Record<ReturnStatus, string> = {
  REQUESTED: 'Chờ duyệt',
  APPROVING: 'Đang xử lý chuyển hoàn',
  APPROVED: 'Đã duyệt · Chờ nhận hàng',
  RECEIVED: 'Đã nhận hàng',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Đã từ chối',
};
