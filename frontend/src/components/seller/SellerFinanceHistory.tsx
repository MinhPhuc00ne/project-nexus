import { useCallback, useState, type ReactElement } from 'react';
import { ChevronLeft as LeftOutlined } from 'lucide-react';
import { ChevronRight as RightOutlined, Eye as EyeOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useProductResource from '../productDetail/useProductResource';
import {
  getSellerTransactions,
  getSellerWithdrawals,
} from '@/features/wallet/services/sellerFinance';
import type {
  FinancePage,
  FinanceTransaction,
  SellerWithdrawal,
  TransactionStatus,
  TransactionType,
} from '@/features/wallet/types/seller-finance.types';
import { Badge, EmptyState, Panel, SellerButton } from './SellerUI';
import SellerResourceState from './SellerResourceState';
import SellerWithdrawalDetail from './SellerWithdrawalDetail';
import {
  financeDate,
  financeMoney,
  getTransactionLabel,
  getTransactionStatusLabel,
  getWithdrawalLabel,
  transactionLabelKeys,
  transactionStatusLabelKeys,
} from './financeFormat';

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500';

type HistoryData =
  | { kind: 'transactions'; data: FinancePage<FinanceTransaction> }
  | { kind: 'withdrawals'; data: FinancePage<SellerWithdrawal> };

export default function SellerFinanceHistory({ revision }: { revision: number }): ReactElement {
  const { t } = useTranslation('seller');
  const [tab, setTab] = useState<'transactions' | 'withdrawals'>('transactions');
  const [page, setPage] = useState(1);
  const [type, setType] = useState<TransactionType | ''>('');
  const [status, setStatus] = useState<TransactionStatus | ''>('');
  const [detail, setDetail] = useState<SellerWithdrawal | null>(null);
  const load = useCallback((): Promise<HistoryData> => {
    void revision;
    return tab === 'transactions'
      ? getSellerTransactions({
          page,
          limit: 10,
          ...(type ? { type } : {}),
          ...(status ? { status } : {}),
        }).then((data) => ({ kind: 'transactions' as const, data }))
      : getSellerWithdrawals(page, 10).then((data) => ({ kind: 'withdrawals' as const, data }));
  }, [tab, page, type, status, revision]);
  const resource = useProductResource(load);
  const result = resource.data;
  return (
    <Panel title={t('finance.history.title')} subtitle={t('finance.history.subtitle')}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label={t('finance.history.title')}
          className="flex gap-1 rounded-lg bg-blue-50 p-1"
        >
          {(
            [
              ['transactions', t('finance.history.tabTransactions')],
              ['withdrawals', t('finance.history.tabWithdrawals')],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key);
                setPage(1);
              }}
              className={`rounded-md px-4 py-2 text-xs font-medium ${tab === key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-blue-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'transactions' && (
          <div className="flex flex-wrap gap-2">
            <select
              aria-label={t('finance.history.typeAria')}
              className={selectClass}
              value={type}
              onChange={(e) => {
                setType(e.target.value as TransactionType | '');
                setPage(1);
              }}
            >
              <option value="">{t('finance.history.allTypes')}</option>
              {Object.entries(transactionLabelKeys).map(([key, labelKey]) => (
                <option key={key} value={key}>
                  {t(labelKey)}
                </option>
              ))}
            </select>
            <select
              aria-label={t('finance.history.statusAria')}
              className={selectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as TransactionStatus | '');
                setPage(1);
              }}
            >
              <option value="">{t('finance.history.allStatuses')}</option>
              {Object.entries(transactionStatusLabelKeys).map(([key, labelKey]) => (
                <option key={key} value={key}>
                  {t(labelKey)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <SellerResourceState loading={resource.loading} error={resource.error} retry={resource.retry}>
        {result &&
          (result.data.items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="border-y border-blue-100 bg-blue-50/60 text-slate-500">
                  <tr>
                    {[
                      t('finance.history.colTimeId'),
                      tab === 'transactions'
                        ? t('finance.history.colTransaction')
                        : t('finance.history.colBank'),
                      t('finance.history.colAmount'),
                      t('finance.history.colStatus'),
                      t('finance.history.colDetail'),
                    ].map((label) => (
                      <th key={label} className="px-3 py-3 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.kind === 'transactions'
                    ? result.data.items.map((item) => (
                        <tr key={item.id} className="align-top hover:bg-blue-50/30">
                          <td className="px-3 py-4">
                            <p>{financeDate(item.createdAt)}</p>
                            <small className="mt-1 block text-slate-400" title={item.id}>
                              {item.id.slice(0, 8)}
                            </small>
                          </td>
                          <td className="px-3 py-4 font-medium">
                            {getTransactionLabel(item.type)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 font-semibold text-blue-700">
                            {financeMoney(item.amount)}
                          </td>
                          <td className="px-3 py-4">
                            <Badge
                              tone={
                                item.status === 'SUCCESS'
                                  ? 'green'
                                  : item.status === 'FAILED'
                                    ? 'red'
                                    : 'amber'
                              }
                            >
                              {getTransactionStatusLabel(item.status)}
                            </Badge>
                          </td>
                          <td className="max-w-[300px] break-words px-3 py-4 leading-6 text-slate-500">
                            {item.description || '—'}
                          </td>
                        </tr>
                      ))
                    : result.data.items.map((item) => (
                        <tr key={item.id} className="align-top hover:bg-blue-50/30">
                          <td className="px-3 py-4">
                            <p>{financeDate(item.createdAt)}</p>
                            <small className="mt-1 block text-slate-400" title={item.id}>
                              {item.id.slice(0, 8)}
                            </small>
                          </td>
                          <td className="px-3 py-4">
                            <p className="font-medium">{item.bankName}</p>
                            <small className="mt-1 block text-slate-500">
                              •••• {item.accountNumber.slice(-4)}
                            </small>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 font-semibold text-blue-700">
                            {financeMoney(item.amount)}
                          </td>
                          <td className="px-3 py-4">
                            <Badge
                              tone={
                                item.status === 'REJECTED'
                                  ? 'red'
                                  : item.status === 'COMPLETED'
                                    ? 'green'
                                    : item.status === 'APPROVED'
                                      ? 'blue'
                                      : 'amber'
                              }
                            >
                              {getWithdrawalLabel(item.status)}
                            </Badge>
                          </td>
                          <td className="px-3 py-4">
                            <button
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                              onClick={() => setDetail(item)}
                            >
                              <EyeOutlined /> {t('finance.history.viewDetail')}
                            </button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={
                tab === 'transactions'
                  ? t('finance.history.emptyTransactions')
                  : t('finance.history.emptyWithdrawals')
              }
              description={t('finance.history.emptyDesc')}
            />
          ))}
        {result && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              {t('ui.paginationSummary', {
                total: result.data.total,
                page: result.data.page,
                totalPages: Math.max(1, result.data.totalPages),
              })}
            </span>
            <div className="flex gap-2">
              <SellerButton
                secondary
                aria-label={t('ui.prevPage')}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <LeftOutlined />
              </SellerButton>
              <SellerButton
                secondary
                aria-label={t('ui.nextPage')}
                disabled={page >= result.data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <RightOutlined />
              </SellerButton>
            </div>
          </div>
        )}
      </SellerResourceState>
      {detail && <SellerWithdrawalDetail item={detail} onClose={() => setDetail(null)} />}
    </Panel>
  );
}
