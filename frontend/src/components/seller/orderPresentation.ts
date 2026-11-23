import i18n from '../../i18n/index';
import type { SellerDisputeStatus } from '../../types/seller-dispute.types';
import type { SellerOrderStatus } from '../../types/order.types';

export const sellerOrderLabelKeys = {
  PENDING_PAYMENT: 'orders.statuses.PENDING_PAYMENT',
  PAID: 'orders.statuses.PAID',
  PREPARING: 'orders.statuses.PREPARING',
  SHIPPING: 'orders.statuses.SHIPPING',
  DELIVERED: 'orders.statuses.DELIVERED',
  CONFIRMED: 'orders.statuses.CONFIRMED',
  CANCELLED: 'orders.statuses.CANCELLED',
  REFUNDED: 'orders.statuses.REFUNDED',
} as const satisfies Record<SellerOrderStatus, string>;

export const disputeLabelKeys = {
  OPEN: 'disputes.statuses.OPEN',
  UNDER_REVIEW: 'disputes.statuses.UNDER_REVIEW',
  RESOLVED_SELLER_FAVOR: 'disputes.statuses.RESOLVED_SELLER_FAVOR',
  RESOLVED_BUYER_FAVOR: 'disputes.statuses.RESOLVED_BUYER_FAVOR',
  CANCELLED: 'disputes.statuses.CANCELLED',
} as const satisfies Record<SellerDisputeStatus, string>;

export function getSellerOrderLabel(status: SellerOrderStatus): string {
  return i18n.t(sellerOrderLabelKeys[status], { ns: 'seller', defaultValue: status });
}

export function getDisputeLabel(status: SellerDisputeStatus): string {
  return i18n.t(disputeLabelKeys[status], { ns: 'seller', defaultValue: status });
}

export function canRespondDispute(status: SellerDisputeStatus): boolean {
  return status === 'OPEN' || status === 'UNDER_REVIEW';
}
