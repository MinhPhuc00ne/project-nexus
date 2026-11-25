import i18n from '../../i18n/index';
import { getIntlLocale } from '../../i18n/config';
import { formatCurrency } from '../../i18n/formatters';
import type {
  TransactionStatus,
  TransactionType,
  WithdrawalStatus,
} from '../../types/seller-finance.types';

export function financeMoney(value: number): string {
  return formatCurrency(value);
}

export function financeDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(getIntlLocale(i18n.language));
}

export const transactionLabelKeys = {
  DEPOSIT: 'finance.transactionTypes.DEPOSIT',
  WITHDRAW: 'finance.transactionTypes.WITHDRAW',
  ESCROW_LOCK: 'finance.transactionTypes.ESCROW_LOCK',
  ESCROW_PAYOUT: 'finance.transactionTypes.ESCROW_PAYOUT',
  ESCROW_REFUND: 'finance.transactionTypes.ESCROW_REFUND',
} as const satisfies Record<TransactionType, string>;

export const transactionStatusLabelKeys = {
  PENDING: 'finance.transactionStatuses.PENDING',
  SUCCESS: 'finance.transactionStatuses.SUCCESS',
  FAILED: 'finance.transactionStatuses.FAILED',
} as const satisfies Record<TransactionStatus, string>;

export const withdrawalLabelKeys = {
  PENDING: 'finance.withdrawalStatuses.PENDING',
  APPROVED: 'finance.withdrawalStatuses.APPROVED',
  REJECTED: 'finance.withdrawalStatuses.REJECTED',
  COMPLETED: 'finance.withdrawalStatuses.COMPLETED',
} as const satisfies Record<WithdrawalStatus, string>;

export function getTransactionLabel(type: TransactionType): string {
  return i18n.t(transactionLabelKeys[type], { ns: 'seller', defaultValue: type });
}

export function getTransactionStatusLabel(status: TransactionStatus): string {
  return i18n.t(transactionStatusLabelKeys[status], { ns: 'seller', defaultValue: status });
}

export function getWithdrawalLabel(status: WithdrawalStatus): string {
  return i18n.t(withdrawalLabelKeys[status], { ns: 'seller', defaultValue: status });
}
