import api from './api';

export interface WalletTransactionItem {
  id: string;
  walletId: string;
  type: 'TOP_UP' | 'PAYMENT' | 'REFUND' | 'ESCROW_LOCK' | 'ESCROW_RELEASE' | 'WITHDRAW' | string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | string;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface BuyerWalletResponse {
  id: string;
  userId: string;
  balance: number;
  lockedBalance: number;
  currency: string;
  transactions: WalletTransactionItem[];
}

export interface DepositWalletInput {
  amount: number;
  paymentMethod?: string;
}

export interface DepositWalletResult {
  message?: string;
  checkoutUrl?: string;
  newBalance?: number;
}

/**
 * Lấy thông tin ví và lịch sử giao dịch từ API thực tế /commerce/wallet
 */
export async function getBuyerWalletApi(): Promise<BuyerWalletResponse> {
  const response = await api.get<{
    statusCode: number;
    message: string;
    data: BuyerWalletResponse;
  }>('/commerce/wallet');

  const payload = response?.data;
  const data = (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as BuyerWalletResponse;

  return {
    id: data?.id ?? '',
    userId: data?.userId ?? '',
    balance: Number(data?.balance ?? 0),
    lockedBalance: Number(data?.lockedBalance ?? 0),
    currency: data?.currency ?? 'VND',
    transactions: Array.isArray(data?.transactions) ? data.transactions : [],
  };
}

/**
 * Nạp tiền vào ví cá nhân từ API thực tế /commerce/wallet/deposit
 */
export async function depositBuyerWalletApi(dto: DepositWalletInput): Promise<DepositWalletResult> {
  const response = await api.post<{
    statusCode: number;
    message: string;
    data: DepositWalletResult;
  }>('/commerce/wallet/deposit', dto);

  const payload = response?.data;
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as DepositWalletResult;
}
