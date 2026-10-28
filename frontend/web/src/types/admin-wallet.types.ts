export type AdminWalletTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAW'
  | 'ESCROW_LOCK'
  | 'ESCROW_PAYOUT'
  | 'ESCROW_REFUND'
  | 'ORDER_PAYMENT'
  | 'PLATFORM_FEE';

export type AdminWalletTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface AdminWalletSummary {
  walletId: string;
  userId: string;
  balance: number;
  lockedBalance: number;
  currency: string;
  totalPlatformFeeCollected: number;
  totalDeposited: number;
  totalTransactions: number;
  updatedAt: string;
}

export interface AdminWalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: AdminWalletTransactionType;
  status: AdminWalletTransactionStatus;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface AdminWalletTransactionQueryDto {
  page?: number;
  limit?: number;
  type?: AdminWalletTransactionType;
  search?: string;
}

export interface AdminWalletTransactionPage {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: AdminWalletTransaction[];
}

export interface DepositAdminWalletDto {
  amount: number;
  description?: string;
}

export interface DepositAdminWalletResult {
  success: boolean;
  message: string;
  wallet: { id: string; balance: number; currency: string };
  transaction: AdminWalletTransaction;
}
