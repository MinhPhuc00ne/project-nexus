import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Plus,
  ArrowDownToLine,
  Landmark,
  Copy,
  Check,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ToastNotification';
import {
  getBuyerWalletApi,
  getBuyerTransactionsApi,
  depositBuyerWalletApi,
  checkBuyerDepositStatusApi,
  createBuyerWithdrawalApi,
  getBuyerWithdrawalsApi,
  type WalletDepositProvider,
  type BuyerWithdrawalInput,
  type BuyerFinanceTransaction,
} from '../../services/wallet.service';
import WalletTopUpModal from '../../components/wallet/WalletTopUpModal';
import BuyerWithdrawalModal from '../../components/wallet/BuyerWithdrawalModal';
import type { SellerWithdrawal } from '../../types/seller-finance.types';

type FilterType = 'ALL' | 'TOP_UP' | 'PAYMENT' | 'REFUND' | 'WITHDRAWAL';

const statusBadge: Record<string, { icon: React.ReactNode; cls: string }> = {
  SUCCESS: {
    icon: <CheckCircle size={10} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  COMPLETED: {
    icon: <CheckCircle size={10} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  PENDING: {
    icon: <Clock size={10} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  APPROVED: {
    icon: <Clock size={10} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  REJECTED: {
    icon: <AlertCircle size={10} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
  },
  FAILED: {
    icon: <AlertCircle size={10} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
  },
};

const withdrawalStatusLabelKeys = {
  PENDING: 'walletPage.withdrawalStatus.pending',
  APPROVED: 'walletPage.withdrawalStatus.approved',
  COMPLETED: 'walletPage.withdrawalStatus.completed',
  REJECTED: 'walletPage.withdrawalStatus.rejected',
} as const;

const transactionStatusLabelKeys = {
  PENDING: 'walletPage.transactionStatus.pending',
  SUCCESS: 'walletPage.transactionStatus.success',
  COMPLETED: 'walletPage.transactionStatus.success',
  FAILED: 'walletPage.transactionStatus.failed',
  CANCELLED: 'walletPage.transactionStatus.cancelled',
} as const;

function isKnownTransactionStatus(
  status: string,
): status is keyof typeof transactionStatusLabelKeys {
  return Object.prototype.hasOwnProperty.call(transactionStatusLabelKeys, status);
}

const filterTabs = [
  { key: 'ALL', labelKey: 'walletPage.tabs.all' },
  { key: 'TOP_UP', labelKey: 'walletPage.tabs.topUp' },
  { key: 'PAYMENT', labelKey: 'walletPage.tabs.payment' },
  { key: 'REFUND', labelKey: 'walletPage.tabs.refund' },
  { key: 'WITHDRAWAL', labelKey: 'walletPage.tabs.withdrawal' },
] as const satisfies { key: FilterType; labelKey: string }[];

export default function BuyerWalletPage() {
  const { t, i18n } = useTranslation('buyer');
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<WalletDepositProvider>('PAYOS');
  const [submittingTopUp, setSubmittingTopUp] = useState(false);
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [pendingDepositOrderCode, setPendingDepositOrderCode] = useState<number | null>(null);
  const [withdrawals, setWithdrawals] = useState<SellerWithdrawal[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [copiedWalletId, setCopiedWalletId] = useState(false);

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [lockedBalance, setLockedBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<BuyerFinanceTransaction[]>([]);

  const fetchWithdrawals = useCallback(async () => {
    setLoadingWithdrawals(true);
    try {
      const result = await getBuyerWithdrawalsApi(1, 10);
      setWithdrawals(result.items);
    } catch (error) {
      console.error('Unable to load Buyer withdrawal requests:', error);
      toast.error(error instanceof Error ? error.message : t('walletPage.withdrawalsLoadError'));
    } finally {
      setLoadingWithdrawals(false);
    }
  }, [t, toast]);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const [data, financeHistory] = await Promise.all([
        getBuyerWalletApi(),
        getBuyerTransactionsApi(1, 50),
      ]);
      if (data) {
        setBalance(Number(data.balance) || 0);
        setLockedBalance(Number(data.lockedBalance) || 0);
        setTransactions(Array.isArray(financeHistory.items) ? financeHistory.items : []);
      }
    } catch (error) {
      console.error('Unable to load Buyer wallet:', error);
      toast.error(error instanceof Error ? error.message : t('walletPage.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    void fetchWithdrawals();
  }, [fetchWithdrawals]);

  useEffect(() => {
    if (pendingDepositOrderCode === null) return;
    let active = true;
    let attempts = 0;
    let timeoutId: number;

    const pollDepositStatus = async () => {
      try {
        const status = await checkBuyerDepositStatusApi(pendingDepositOrderCode);
        if (!active) return;
        if (status.status !== 'PENDING') {
          setPendingDepositOrderCode(null);
          if (status.status === 'SUCCESS') {
            setBalance(status.balance);
            toast.success(t('walletPage.depositCompleted'));
          } else {
            toast.error(t('walletPage.depositFailed'));
          }
          void fetchWallet();
          return;
        }
      } catch (error) {
        console.warn('Unable to check Buyer wallet deposit status:', error);
      }

      attempts += 1;
      if (attempts >= 24) {
        setPendingDepositOrderCode(null);
        toast.error(t('walletPage.depositStatusPending'));
        return;
      }
      timeoutId = window.setTimeout(() => void pollDepositStatus(), 5000);
    };

    timeoutId = window.setTimeout(() => void pollDepositStatus(), 5000);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [fetchWallet, pendingDepositOrderCode, t, toast]);

  const handleDeposit = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount < 10000) {
      toast.error(t('walletPage.minDepositError'));
      return;
    }
    const paymentWindow = selectedMethod === 'PAYOS' ? window.open('about:blank', '_blank') : null;
    if (selectedMethod === 'PAYOS' && !paymentWindow) {
      toast.error(t('walletPage.paymentWindowBlocked'));
      return;
    }
    if (paymentWindow) paymentWindow.opener = null;
    setSubmittingTopUp(true);
    try {
      const res = await depositBuyerWalletApi({ amount, provider: selectedMethod });
      if (res.checkoutUrl) {
        paymentWindow?.location.assign(res.checkoutUrl);
        if (res.orderCode) setPendingDepositOrderCode(res.orderCode);
      } else {
        paymentWindow?.close();
        if (typeof res.balance === 'number') setBalance(res.balance);
      }
      toast.success(t('walletPage.depositRequestSent'));
      setShowTopUp(false);
      setTopUpAmount('');
      void fetchWallet();
    } catch (err) {
      paymentWindow?.close();
      toast.error(err instanceof Error ? err.message : t('walletPage.depositConnectError'));
    } finally {
      setSubmittingTopUp(false);
    }
  };

  const handleWithdrawal = async (input: BuyerWithdrawalInput) => {
    setSubmittingWithdrawal(true);
    try {
      const result = await createBuyerWithdrawalApi(input);
      setBalance(result.wallet.balance);
      setLockedBalance(result.wallet.lockedBalance);
      toast.success(result.message || t('walletPage.withdrawalRequestSent'));
      setShowWithdrawal(false);
      await Promise.all([fetchWallet(), fetchWithdrawals(), refreshProfile()]);
    } catch (error) {
      console.error('Unable to submit Buyer withdrawal request:', error);
      toast.error(error instanceof Error ? error.message : t('walletPage.withdrawalRequestFailed'));
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  const handleCopyWalletId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedWalletId(true);
      window.setTimeout(() => setCopiedWalletId(false), 1800);
    } catch (error) {
      console.error('Unable to copy wallet ID:', error);
      toast.error(t('walletPage.copyWalletIdFailed'));
    }
  };

  const safeTxs = Array.isArray(transactions) ? transactions : [];
  const filtered = safeTxs.filter((tx) => {
    if (filter === 'ALL') return true;
    if (filter === 'TOP_UP') return tx?.type === 'DEPOSIT' || tx?.type === 'TOP_UP';
    if (filter === 'PAYMENT') return tx?.type === 'PAYMENT' || tx?.type === 'ORDER_PAYMENT';
    if (filter === 'REFUND') return tx?.type === 'REFUND' || tx?.type === 'ESCROW_REFUND';
    return tx?.type === 'WITHDRAW';
  });

  const totalIn = safeTxs
    .filter(
      (tx) =>
        (tx?.amount ?? 0) > 0 &&
        (tx?.status === 'SUCCESS' || tx?.status === 'COMPLETED') &&
        (tx?.type === 'DEPOSIT' || tx?.type === 'TOP_UP'),
    )
    .reduce((sum, tx) => sum + Number(tx?.amount ?? 0), 0);

  const totalOut = safeTxs
    .filter(
      (tx) =>
        ((tx?.amount ?? 0) < 0 || tx?.type === 'WITHDRAW') &&
        (tx?.status === 'SUCCESS' || tx?.status === 'COMPLETED') &&
        (tx?.type === 'PAYMENT' || tx?.type === 'ORDER_PAYMENT' || tx?.type === 'WITHDRAW'),
    )
    .reduce((sum, tx) => sum + Math.abs(Number(tx?.amount ?? 0)), 0);

  return (
    <div className="space-y-5">
      {/* Balance Card */}
      <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 p-5 text-white shadow-lg shadow-orange-900/10 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-20 h-56 w-56 rounded-full border-[28px] border-white/[0.07]" />
        <div className="pointer-events-none absolute -bottom-28 right-1/4 h-48 w-48 rounded-full bg-white/[0.05]" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-black/10 px-3 py-1.5">
              <Wallet size={14} className="text-white/90" />
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
                {t('walletPage.cardTitle')}
              </p>
            </div>
            <p className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              {formatCurrency(balance, i18n.language)}
            </p>
            <p className="mt-1 text-xs text-white/75">{t('walletPage.availableBalance')}</p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 sm:pt-1">
            <button
              type="button"
              onClick={() => setShowTopUp(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-orange-700 shadow-sm transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Plus size={15} /> {t('walletPage.topUpButton')}
            </button>
            <button
              type="button"
              onClick={() => setShowWithdrawal(true)}
              disabled={balance <= 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowDownToLine size={15} /> {t('walletPage.withdrawButton')}
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-col gap-3 border-t border-white/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center gap-2 text-xs text-white/90">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
              <Lock size={13} />
            </span>
            <span>{t('walletPage.escrowLocked')}</span>
            <strong>{formatCurrency(lockedBalance, i18n.language)}</strong>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyWalletId()}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-black/10 px-2.5 py-1.5 font-mono text-[10px] text-white/75 transition hover:bg-black/20 hover:text-white"
            title={t('walletPage.copyWalletIdTitle')}
          >
            <span>NEXUS-{user?.id?.slice(0, 8).toUpperCase() ?? 'USER'}</span>
            {copiedWalletId ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <ArrowDownLeft size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500">{t('walletPage.totalTopUp')}</p>
            <p className="mt-1 truncate text-base font-extrabold text-emerald-700 sm:text-lg">
              {formatCurrency(totalIn, i18n.language)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <ArrowUpRight size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500">{t('walletPage.totalSpent')}</p>
            <p className="mt-1 truncate text-base font-extrabold text-rose-700 sm:text-lg">
              {formatCurrency(totalOut, i18n.language)}
            </p>
          </div>
        </div>
      </div>

      {/* Top Up Modal Component */}
      <WalletTopUpModal
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
        topUpAmount={topUpAmount}
        setTopUpAmount={setTopUpAmount}
        selectedMethod={selectedMethod}
        setSelectedMethod={setSelectedMethod}
        onConfirm={() => void handleDeposit()}
        submitting={submittingTopUp}
      />
      {showWithdrawal && (
        <BuyerWithdrawalModal
          balance={balance}
          profile={user}
          submitting={submittingWithdrawal}
          onClose={() => setShowWithdrawal(false)}
          onSubmit={(input) => void handleWithdrawal(input)}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Landmark size={17} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {t('walletPage.withdrawalHistoryTitle')}
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                {t('walletPage.withdrawalHistorySubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void Promise.all([fetchWithdrawals(), fetchWallet()])}
            disabled={loadingWithdrawals}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 sm:self-auto"
          >
            {t('walletPage.refresh')}
          </button>
        </div>
        {loadingWithdrawals && (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-xs text-slate-400">
            <Loader2 size={15} className="animate-spin" /> {t('walletPage.loadingWithdrawals')}
          </div>
        )}
        {!loadingWithdrawals && withdrawals.length === 0 && (
          <div className="flex flex-col items-center px-5 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <ArrowDownToLine size={19} />
            </span>
            <p className="mt-3 text-xs font-semibold text-slate-700">
              {t('walletPage.emptyWithdrawals')}
            </p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-slate-500">
              {t('walletPage.withdrawalHistorySubtitle')}
            </p>
            <button
              type="button"
              onClick={() => setShowWithdrawal(true)}
              disabled={balance <= 0}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowDownToLine size={14} /> {t('walletPage.withdrawButton')}
            </button>
          </div>
        )}
        {!loadingWithdrawals && withdrawals.length > 0 && (
          <div className="divide-y divide-slate-100 px-5 sm:px-6">
            {withdrawals.map((request) => {
              const badge = statusBadge[request.status] ?? statusBadge.PENDING;
              return (
                <article
                  key={request.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                      <Landmark size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(request.amount, i18n.language)}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-slate-600">
                        {request.bankName} · {request.accountNumber} · {request.accountHolderName}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(request.createdAt).toLocaleString(getIntlLocale(i18n.language))}
                      </p>
                      {request.rejectionReason && (
                        <p className="mt-1 text-[11px] text-red-600">
                          {t('walletPage.rejectionReason')}: {request.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-semibold ${badge.cls}`}
                  >
                    {badge.icon}
                    {t(withdrawalStatusLabelKeys[request.status])}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Transaction History */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-bold text-slate-900">{t('walletPage.historyTitle')}</h2>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                aria-pressed={filter === tab.key}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold transition ${
                  filter === tab.key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-xs text-slate-400">
            <Loader2 size={16} className="animate-spin text-orange-500" />{' '}
            {t('walletPage.loadingHistory')}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-xs text-slate-400">
            {t('walletPage.emptyHistory')}
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-slate-100 px-5 sm:px-6">
            {filtered.map((tx) => {
              const amount = Number(tx.amount);
              const isWithdrawal = tx.type === 'WITHDRAW';
              const isPositive = !isWithdrawal && amount > 0;
              const badge = statusBadge[tx.status] ?? statusBadge.COMPLETED;
              let transactionIcon = <ArrowUpRight size={15} />;
              let transactionIconClass = 'bg-slate-50 text-slate-500';
              let amountPrefix = '';
              if (isPositive) {
                transactionIcon = <ArrowDownLeft size={15} />;
                transactionIconClass = 'bg-emerald-50 text-emerald-600';
                amountPrefix = '+';
              } else if (isWithdrawal) {
                transactionIcon = <ArrowDownToLine size={15} />;
                transactionIconClass = 'bg-blue-50 text-blue-600';
                amountPrefix = '-';
              } else if (amount < 0) {
                amountPrefix = '-';
              }

              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${transactionIconClass}`}
                    >
                      {transactionIcon}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {tx.description || tx.type}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString(getIntlLocale(i18n.language))}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-extrabold ${
                        isPositive ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {amountPrefix}
                      {formatCurrency(Math.abs(amount), i18n.language)}
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${badge.cls}`}
                    >
                      {badge.icon}{' '}
                      {isKnownTransactionStatus(tx.status)
                        ? t(transactionStatusLabelKeys[tx.status])
                        : tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
