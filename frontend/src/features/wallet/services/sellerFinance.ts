import i18n from '@/i18n';
import { apiRequest } from '@/services/api';
import { getSellerResource } from '@/services/sellerResources';
import type {
  CreateWithdrawal,
  FinancePage,
  FinanceTransaction,
  SellerRevenue,
  SellerWithdrawal,
  TransactionQuery,
  WithdrawalResult,
} from '@/features/wallet/types/seller-finance.types';

const base = '/seller/finance';

export function getSellerRevenue(): Promise<SellerRevenue> {
  return getSellerResource(`${base}/revenue`);
}

export function getSellerTransactions(
  query: TransactionQuery,
): Promise<FinancePage<FinanceTransaction>> {
  const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) });
  if (query.type) params.set('type', query.type);
  if (query.status) params.set('status', query.status);
  return getSellerResource(`${base}/transactions?${params}`);
}

export function getSellerWithdrawals(page = 1, limit = 10): Promise<FinancePage<SellerWithdrawal>> {
  return getSellerResource(
    `${base}/withdrawals?${new URLSearchParams({ page: String(page), limit: String(limit) })}`,
  );
}

export async function createSellerWithdrawal(body: CreateWithdrawal): Promise<WithdrawalResult> {
  const result = await apiRequest<WithdrawalResult>(`${base}/withdraw`, {
    method: 'POST',
    body,
    requireAuth: true,
  });
  if (!result.success)
    throw new Error(result.message || i18n.t('errors:services.withdrawSubmitFailed'));
  return result;
}
