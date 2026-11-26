import type { AdminAuctionLot } from '@/features/auction/types/auction-api.types';

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

export const AUCTION_AWARD_STATES: readonly AuctionAwardState[] = [
  'AWAITING_ACCEPTANCE',
  'AWAITING_DEPOSIT',
  'AWAITING_CHECKOUT',
  'PAID',
  'PAYMENT_DEFAULT',
  'DECLINED',
  'BUYER_WITHDRAWN',
  'EXPIRED',
] as const;

export const AUCTION_COMPLAINT_STATES: readonly AuctionComplaintState[] = [
  'OPEN',
  'ACCEPTED',
  'REJECTED',
] as const;
export function canConfirmAwardAction(award: AdminAuctionAward, action: AwardAction) {
  return action === 'payment-default'
    ? award.canConfirmPaymentDefault === true
    : award.canMarkNotBuying === true;
}
export function canEndAuctionLot(lot: AdminAuctionLot) {
  return lot.lotStatus === 'ACTIVE' || lot.lotStatus === 'EXTENDED';
}
