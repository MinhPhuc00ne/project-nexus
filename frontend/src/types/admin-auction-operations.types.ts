import type { AdminAuctionLot } from './auction-api.types';

export type AuctionAwardState =
  | 'AWAITING_ACCEPTANCE'
  | 'AWAITING_DEPOSIT'
  | 'AWAITING_CHECKOUT'
  | 'PAID'
  | 'PAYMENT_DEFAULT'
  | 'DECLINED'
  | 'BUYER_WITHDRAWN'
  | 'EXPIRED';
export type AuctionComplaintState = 'OPEN' | 'ACCEPTED' | 'REJECTED';
export type AwardAction = 'payment-default' | 'not-buying';

export interface AdminAuctionAward {
  id: string;
  auctionItemId: string | null;
  tier: 'PRIMARY_WINNER' | 'SECOND_CHANCE';
  status: AuctionAwardState;
  offerAmount: number;
  depositAmount: number;
  remainingProductAmount: number;
  expiresAt: string;
  resolutionNote: string | null;
  canConfirmPaymentDefault: boolean;
  canMarkNotBuying: boolean;
  buyer: { id: string; fullName: string; email: string } | null;
  auctionItem: { id: string; title: string; lotNumber: number | null } | null;
  order: { id: string; status: string; totalAmount: number | string } | null;
}

export interface AdminAuctionComplaint {
  id: string;
  status: AuctionComplaintState;
  reason: string;
  evidenceUrls: string[];
  adminNote: string | null;
  createdAt: string;
  handledAt: string | null;
  reporter: { id: string; fullName: string; email: string; role: string };
  handledBy: { id: string; fullName: string } | null;
  auctionItem: { id: string; title: string; lotNumber: number | null } | null;
}

export const awardLabels: Record<AuctionAwardState, string> = {
  AWAITING_ACCEPTANCE: 'Chờ xác nhận mua',
  AWAITING_DEPOSIT: 'Chờ nạp đủ tiền cọc',
  AWAITING_CHECKOUT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PAYMENT_DEFAULT: 'Quá hạn thanh toán',
  DECLINED: 'Đã từ chối mua',
  BUYER_WITHDRAWN: 'Khách không mua nữa',
  EXPIRED: 'Đã hết hạn',
};
export const complaintLabels: Record<AuctionComplaintState, string> = {
  OPEN: 'Chờ xử lý',
  ACCEPTED: 'Đã chấp thuận',
  REJECTED: 'Đã từ chối',
};
export function canConfirmAwardAction(award: AdminAuctionAward, action: AwardAction, now: number) {
  if (action === 'payment-default')
    return (
      award.canConfirmPaymentDefault &&
      award.status === 'AWAITING_CHECKOUT' &&
      new Date(award.expiresAt).getTime() <= now
    );
  return (
    award.canMarkNotBuying &&
    award.tier === 'SECOND_CHANCE' &&
    ['AWAITING_ACCEPTANCE', 'AWAITING_DEPOSIT', 'AWAITING_CHECKOUT'].includes(award.status)
  );
}
export function canEndAuctionLot(lot: AdminAuctionLot) {
  return lot.lotStatus === 'ACTIVE' || lot.lotStatus === 'EXTENDED';
}
