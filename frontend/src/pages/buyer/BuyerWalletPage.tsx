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
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getBuyerWalletApi,
  depositBuyerWalletApi,
  type WalletTransactionItem,
} from '../../services/wallet.service';
import WalletTopUpModal from '../../components/wallet/WalletTopUpModal';

type FilterType = 'ALL' | 'TOP_UP' | 'PAYMENT' | 'REFUND';

const statusBadge: Record<string, { icon: React.ReactNode; cls: string }> = {
  COMPLETED: {
    icon: <CheckCircle size={10} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  PENDING: {
    icon: <Clock size={10} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  FAILED: {
    icon: <AlertCircle size={10} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
  },
};

const filterTabs = [
  { key: 'ALL', labelKey: 'walletPage.tabs.all' },
  { key: 'TOP_UP', labelKey: 'walletPage.tabs.topUp' },
  { key: 'PAYMENT', labelKey: 'walletPage.tabs.payment' },
  { key: 'REFUND', labelKey: 'walletPage.tabs.refund' },
] as const satisfies { key: FilterType; labelKey: string }[];

export default function BuyerWalletPage() {
  const { t, i18n } = useTranslation('buyer');
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('PAYOS');
  const [submittingTopUp, setSubmittingTopUp] = useState(false);

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [lockedBalance, setLockedBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBuyerWalletApi();
      if (data) {
        setBalance(Number(data.balance) || 0);
        setLockedBalance(Number(data.lockedBalance) || 0);
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      }
    } catch {
      setBalance(0);
      setLockedBalance(0);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWallet();
  }, [fetchWallet]);

  const handleDeposit = async () => {
    const amount = Number(topUpAmount);
    if (!amount || amount < 10000) {
      showToast(t('walletPage.minDepositError'));
      return;
    }
    setSubmittingTopUp(true);
    try {
      const res = await depositBuyerWalletApi({
        amount,
        paymentMethod: selectedMethod,
      });
      if (res.checkoutUrl) {
        window.open(res.checkoutUrl, '_blank');
      }
      showToast(t('walletPage.depositRequestSent'));
      setShowTopUp(false);
      setTopUpAmount('');
      void fetchWallet();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('walletPage.depositConnectError');
      showToast(msg);
    } finally {
      setSubmittingTopUp(false);
    }
  };

  const safeTxs = Array.isArray(transactions) ? transactions : [];
  const filtered = safeTxs.filter((tx) => {
    if (filter === 'ALL') return true;
    return tx?.type === filter;
  });

  const totalIn = safeTxs
    .filter((tx) => (tx?.amount ?? 0) > 0 && tx?.status === 'COMPLETED')
    .reduce((sum, tx) => sum + Number(tx?.amount ?? 0), 0);

  const totalOut = safeTxs
    .filter((tx) => (tx?.amount ?? 0) < 0 && tx?.status === 'COMPLETED')
    .reduce((sum, tx) => sum + Math.abs(Number(tx?.amount ?? 0)), 0);

  return (
    <div className="space-y-5">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[9999] rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white shadow-xl animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-[#f24e1e] p-6 text-white shadow-lg shadow-orange-500/25">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-white/80" />
              <p className="text-xs font-semibold text-white/80 uppercase tracking-widest">
                {t('walletPage.cardTitle')}
              </p>
            </div>
            <p className="text-3xl font-extrabold mb-0.5">
              {formatCurrency(balance, i18n.language)}
            </p>
            <p className="text-xs text-white/70">{t('walletPage.availableBalance')}</p>

            <div className="mt-3 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-1.5 w-fit">
              <Lock size={12} className="text-white/80" />
              <span className="text-xs text-white/90">
                {t('walletPage.escrowLocked')}{' '}
                <strong>{formatCurrency(lockedBalance, i18n.language)}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTopUp(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-orange-600 shadow-md hover:bg-orange-50 transition cursor-pointer self-start sm:self-center"
          >
            <Plus size={15} /> {t('walletPage.topUpButton')}
          </button>
        </div>

        <div className="relative z-10 mt-4 flex items-center gap-2">
          <span className="font-mono text-[11px] text-white/60">
            NEXUS-{user?.id?.slice(0, 8).toUpperCase() ?? 'USER'}
          </span>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(user?.id ?? '')}
            className="text-white/50 hover:text-white transition"
            title={t('walletPage.copyWalletIdTitle')}
          >
            <Copy size={11} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft size={13} className="text-emerald-600" />
            <span className="text-[11px] font-semibold text-slate-500">
              {t('walletPage.totalTopUp')}
            </span>
          </div>
          <p className="text-base font-extrabold text-emerald-600">
            +{formatCurrency(totalIn, i18n.language)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight size={13} className="text-red-500" />
            <span className="text-[11px] font-semibold text-slate-500">
              {t('walletPage.totalSpent')}
            </span>
          </div>
          <p className="text-base font-extrabold text-red-500">
            -{formatCurrency(totalOut, i18n.language)}
          </p>
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

      {/* Transaction History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-slate-900">{t('walletPage.historyTitle')}</h2>
          <div className="flex flex-wrap gap-1.5">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  filter === tab.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-orange-500" />{' '}
            {t('walletPage.loadingHistory')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            {t('walletPage.emptyHistory')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((tx) => {
              const isPositive = Number(tx.amount) > 0;
              const badge = statusBadge[tx.status] ?? statusBadge.COMPLETED;

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {tx.description || tx.type}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleString(getIntlLocale(i18n.language))}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-extrabold ${
                        isPositive ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {formatCurrency(Number(tx.amount), i18n.language)}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`}
                    >
                      {badge.icon} {tx.status}
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
