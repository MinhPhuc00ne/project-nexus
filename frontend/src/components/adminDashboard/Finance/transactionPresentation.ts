import i18n from '../../../i18n';
import { getIntlLocale } from '../../../i18n/config';
import type { AdminWalletTransactionType } from '@/features/admin/types/admin-wallet.types';

export const TRANSACTION_TYPES: AdminWalletTransactionType[] = [
  'DEPOSIT',
  'WITHDRAW',
  'ESCROW_LOCK',
  'ESCROW_PAYOUT',
  'ESCROW_REFUND',
  'ORDER_PAYMENT',
  'PLATFORM_FEE',
];

export const typeLabels: Record<AdminWalletTransactionType, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAW: 'Withdrawal',
  ESCROW_LOCK: 'Escrow Lock',
  ESCROW_PAYOUT: 'Escrow Payout',
  ESCROW_REFUND: 'Escrow Refund',
  ORDER_PAYMENT: 'Order Payment',
  PLATFORM_FEE: 'Platform Fee',
};
export const statusLabels = { PENDING: 'Pending', SUCCESS: 'Success', FAILED: 'Failed' };
export const date = (value: string) => new Date(value).toLocaleString(getIntlLocale(i18n.language));
