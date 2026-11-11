import type { AdminWalletTransactionType } from '../../../types/admin-wallet.types';

export const typeLabels: Record<AdminWalletTransactionType, string> = {
  DEPOSIT: 'Nạp tiền',
  WITHDRAW: 'Rút tiền',
  ESCROW_LOCK: 'Giữ ký quỹ',
  ESCROW_PAYOUT: 'Giải ngân ký quỹ',
  ESCROW_REFUND: 'Hoàn ký quỹ',
  ORDER_PAYMENT: 'Thanh toán đơn hàng',
  PLATFORM_FEE: 'Phí sàn',
};
export const statusLabels = { PENDING: 'Đang xử lý', SUCCESS: 'Thành công', FAILED: 'Thất bại' };
export const date = (value: string) => new Date(value).toLocaleString('vi-VN');
