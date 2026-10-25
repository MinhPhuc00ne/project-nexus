import type { SellerDisputeStatus } from '../../types/seller-dispute.types';
import type { SellerOrderStatus } from '../../types/order.types';

export const sellerOrderLabels: Record<SellerOrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Chờ xác nhận',
  PREPARING: 'Chờ bàn giao',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CONFIRMED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Hoàn tiền',
};
export const disputeLabels: Record<SellerDisputeStatus, string> = {
  OPEN: 'Mới mở',
  UNDER_REVIEW: 'Đang xem xét',
  RESOLVED_SELLER_FAVOR: 'Kết thúc: phía Seller',
  RESOLVED_BUYER_FAVOR: 'Kết thúc: phía Buyer',
  CANCELLED: 'Đã hủy',
};
export function canRespondDispute(status: SellerDisputeStatus): boolean {
  return status === 'OPEN' || status === 'UNDER_REVIEW';
}
