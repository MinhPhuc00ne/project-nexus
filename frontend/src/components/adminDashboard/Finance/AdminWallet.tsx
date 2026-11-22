import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Wallet } from 'lucide-react';
import {
  depositToAdminWallet,
  getAdminWallet,
  getAdminWalletTransactions,
} from '../../../services/admin';
import type {
  AdminWalletSummary,
  AdminWalletTransaction,
  AdminWalletTransactionType,
} from '../../../types/admin-wallet.types';
import { getIntlLocale } from '../../../i18n/config';
import { formatMoney } from '../shared/adminData';
import { Button, Panel } from '../shared/AdminUI';
import { TRANSACTION_TYPES } from './transactionPresentation';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminWallet() {
  const { t, i18n } = useTranslation('admin');
  const formatDate = (value: string) =>
    new Date(value).toLocaleString(getIntlLocale(i18n.language));
  const [summary, setSummary] = useState<AdminWalletSummary | null>(null);
  const [transactions, setTransactions] = useState<AdminWalletTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<AdminWalletTransactionType | ''>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [depositPending, setDepositPending] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void Promise.all([
      getAdminWallet(controller.signal),
      getAdminWalletTransactions({ page, limit: 10, ...(type ? { type } : {}) }, controller.signal),
    ])
      .then(([wallet, history]) => {
        if (controller.signal.aborted) return;
        setSummary(wallet);
        setTransactions(history.items);
        setTotal(history.total);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : t('finance.wallet.loadErr'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, refreshKey, type, t]);

  const submitDeposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value < 10000) {
      setDepositError(t('finance.wallet.invalidAmountErr'));
      return;
    }

    setDepositPending(true);
    setDepositError('');
    setNotice('');
    try {
      const result = await depositToAdminWallet({
        amount: value,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setNotice(result.message);
      setAmount('');
      setDescription('');
      setPage(1);
      setRefreshKey((current) => current + 1);
    } catch (cause) {
      setDepositError(cause instanceof Error ? cause.message : t('finance.wallet.depositErr'));
    } finally {
      setDepositPending(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-5">
      <Panel
        title={t('finance.wallet.title')}
        subtitle={t('finance.wallet.subtitle')}
        icon={<Wallet size={19} />}
        action={
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            <RefreshCw size={14} aria-hidden="true" /> {t('finance.wallet.refresh')}
          </Button>
        }
      >
        {error && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setRefreshKey((current) => current + 1)}>
              {t('finance.wallet.retry')}
            </Button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label={t('finance.wallet.balanceLabel')}
            value={summary ? formatMoney(summary.balance) : '—'}
          />
          <Metric
            label={t('finance.wallet.lockedLabel')}
            value={summary ? formatMoney(summary.lockedBalance) : '—'}
          />
          <Metric
            label={t('finance.wallet.feeCollectedLabel')}
            value={summary ? formatMoney(summary.totalPlatformFeeCollected) : '—'}
          />
          <Metric
            label={t('finance.wallet.totalDepositedLabel')}
            value={summary ? formatMoney(summary.totalDeposited) : '—'}
          />
        </div>
        {summary && (
          <p className="mt-3 text-xs text-slate-500">
            {t('finance.wallet.summaryFooter', {
              count: summary.totalTransactions,
              date: formatDate(summary.updatedAt),
            })}
          </p>
        )}
      </Panel>

      <Panel
        title={t('finance.wallet.depositTitle')}
        subtitle={t('finance.wallet.depositSubtitle')}
      >
        <form
          onSubmit={submitDeposit}
          className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end"
        >
          <label className="block text-xs font-medium text-slate-700">
            {t('finance.wallet.amountLabel')}
            <input
              required
              type="number"
              min={10000}
              step={1}
              value={amount}
              disabled={depositPending}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm"
              placeholder={t('finance.wallet.amountPlaceholder')}
            />
          </label>
          <label className="block text-xs font-medium text-slate-700">
            {t('finance.wallet.noteLabel')}
            <input
              type="text"
              maxLength={500}
              value={description}
              disabled={depositPending}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm"
              placeholder={t('finance.wallet.notePlaceholder')}
            />
          </label>
          <Button type="submit" disabled={depositPending}>
            {depositPending ? t('finance.wallet.depositing') : t('finance.wallet.depositSubmit')}
          </Button>
        </form>
        {depositError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {depositError}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}
      </Panel>

      <Panel
        title={t('finance.wallet.historyTitle')}
        subtitle={t('finance.wallet.historySubtitle')}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <label className="text-xs text-slate-500">
            {t('finance.wallet.typeFilterLabel')}
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as AdminWalletTransactionType | '');
                setPage(1);
              }}
              className="mt-1 block rounded-lg border border-slate-200 bg-white p-2 text-slate-800"
            >
              <option value="">{t('finance.wallet.allTypes')}</option>
              {TRANSACTION_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`finance.types.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <span className="text-xs text-slate-500">
            {t('finance.wallet.totalCount', { count: total })}
          </span>
        </div>
        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            {t('finance.wallet.loadingHistory')}
          </p>
        ) : transactions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {[
                    t('finance.wallet.cols.time'),
                    t('finance.wallet.cols.type'),
                    t('finance.wallet.cols.description'),
                    t('finance.wallet.cols.reference'),
                    t('finance.wallet.cols.amount'),
                    t('finance.wallet.cols.status'),
                  ].map((heading) => (
                    <th key={heading} scope="col" className="p-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="align-top">
                    <td className="whitespace-nowrap p-3">{formatDate(transaction.createdAt)}</td>
                    <td className="p-3">{t(`finance.types.${transaction.type}`)}</td>
                    <td className="max-w-64 break-words p-3">{transaction.description || '—'}</td>
                    <td className="max-w-48 break-all p-3">{transaction.referenceId || '—'}</td>
                    <td className="whitespace-nowrap p-3 font-semibold">
                      {transaction.type === 'DEPOSIT' || transaction.type === 'PLATFORM_FEE'
                        ? '+'
                        : '−'}
                      {formatMoney(transaction.amount)}
                    </td>
                    <td className="p-3">{t(`finance.statuses.${transaction.status}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            {error ? t('finance.wallet.historyLoadErr') : t('finance.wallet.emptyHistory')}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{t('finance.wallet.pageLabel', { page, totalPages })}</span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              {t('finance.wallet.prev')}
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              {t('finance.wallet.next')}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
