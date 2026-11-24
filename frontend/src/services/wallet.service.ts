import api, { apiRequest } from './api';
import type { FinancePage, SellerWithdrawal } from '../types/seller-finance.types';

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

export type WalletDepositProvider = 'PAYOS' | 'DIRECT';

export interface DepositWalletInput {
  amount: number;
  provider?: WalletDepositProvider;
}

export interface DepositWalletResult {
  success?: boolean;
  message?: string;
  checkoutUrl?: string;
  qrCode?: string;
  amount?: number;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  description?: string;
  transactionId?: string;
  newBalance?: number;
  balance?: number;
  orderCode?: number;
  transaction?: WalletTransactionItem;
}

export interface WalletDepositStatus {
  orderCode: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  description?: string | null;
  createdAt: string;
  balance: number;
}

export interface BuyerWithdrawalInput {
  amount: number;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
  note?: string;
}

export interface BuyerWithdrawalResult {
  success: boolean;
  message: string;
  withdrawalRequest: Pick<
    SellerWithdrawal,
    'id' | 'amount' | 'bankName' | 'accountNumber' | 'accountHolderName' | 'status' | 'createdAt'
  >;
  wallet: {
    balance: number;
    lockedBalance: number;
    currency: string;
  };
}

export interface BuyerFinanceTransaction {
  id: string;
  amount: number;
  type: string;
  status: string;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
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

export function checkBuyerDepositStatusApi(orderCode: number): Promise<WalletDepositStatus> {
  return apiRequest<WalletDepositStatus>(
    `/commerce/wallet/deposit/${encodeURIComponent(String(orderCode))}/status`,
    { requireAuth: true },
  );
}

export function createBuyerWithdrawalApi(
  input: BuyerWithdrawalInput,
): Promise<BuyerWithdrawalResult> {
  return apiRequest<BuyerWithdrawalResult>('/buyer/finance/withdraw', {
    method: 'POST',
    body: input,
    requireAuth: true,
  });
}

export function getBuyerWithdrawalsApi(
  page = 1,
  limit = 10,
): Promise<FinancePage<SellerWithdrawal>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiRequest<FinancePage<SellerWithdrawal>>(`/buyer/finance/withdrawals?${params}`, {
    requireAuth: true,
  });
}

export function getBuyerTransactionsApi(
  page = 1,
  limit = 50,
): Promise<FinancePage<BuyerFinanceTransaction>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiRequest<FinancePage<BuyerFinanceTransaction>>(`/buyer/finance/transactions?${params}`, {
    requireAuth: true,
  });
}
