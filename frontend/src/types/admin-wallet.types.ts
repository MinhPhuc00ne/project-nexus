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
  orderDetails?: {
    orderId: string;
    buyerName?: string;
    buyerEmail?: string;
    shopName?: string;
    sellerEmail?: string;
    subtotal: number;
    shippingFee: number;
    totalAmount: number;
    platformFee: number;
    sellerPayout: number;
    waybillCode?: string;
    carrier?: string;
  } | null;
}

export interface AdminWalletTransactionQueryDto {
  page?: number;
  limit?: number;
  type?: AdminWalletTransactionType;
  search?: string;
  startDate?: string;
  endDate?: string;
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
  paymentProvider: 'PAYOS';
  orderCode: number;
  checkoutUrl: string;
  qrCode: string;
  amount: number;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  transactionId: string;
}
