export type TransactionType =
  'DEPOSIT' | 'WITHDRAW' | 'ESCROW_LOCK' | 'ESCROW_PAYOUT' | 'ESCROW_REFUND';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface FinancePage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FinanceWallet {
  balance: number;
  lockedBalance: number;
  currency: string;
}

export interface SellerRevenue {
  wallet: FinanceWallet & { availableToWithdraw: number };
  metrics: {
    totalOrders: number;
    completedOrdersCount: number;
    pendingOrdersCount: number;
    cancelledOrdersCount: number;
    totalGrossRevenue: number;
    completedRevenue: number;
    pendingEscrowRevenue: number;
    platformFeeRatePercentage: number;
    estimatedPlatformFee: number;
    netRevenue: number;
  };
  monthlyBreakdown: { month: string; gross: number; ordersCount: number }[];
}

export interface FinanceTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface SellerWithdrawal {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  status: WithdrawalStatus;
  rejectionReason: string | null;
  adminNote: string | null;
  reviewedBy: { id: string; fullName: string; email: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface CreateWithdrawal {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  note?: string;
}

export interface WithdrawalResult {
  success: boolean;
  message: string;
  withdrawalRequest: Pick<
    SellerWithdrawal,
    'id' | 'amount' | 'bankName' | 'accountNumber' | 'accountHolderName' | 'status' | 'createdAt'
  >;
  wallet: FinanceWallet;
}

export interface TransactionQuery {
  page: number;
  limit: number;
  type?: TransactionType;
  status?: TransactionStatus;
}
