import type {
  TransactionStatus,
  TransactionType,
  WithdrawalStatus,
} from '../../types/seller-finance.types';

export function financeMoney(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function financeDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

export const transactionLabels: Record<TransactionType, string> = {
  DEPOSIT: 'Nạp tiền',
  WITHDRAW: 'Rút tiền',
  ESCROW_LOCK: 'Khóa ký quỹ',
  ESCROW_PAYOUT: 'Giải ngân',
  ESCROW_REFUND: 'Hoàn ký quỹ',
};
export const transactionStatusLabels: Record<TransactionStatus, string> = {
  PENDING: 'Đang xử lý',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
};
export const withdrawalLabels: Record<WithdrawalStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  COMPLETED: 'Hoàn tất',
};
