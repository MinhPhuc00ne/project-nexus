import { useEffect, useState, useCallback } from 'react';
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

const filterTabs: { key: FilterType; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'TOP_UP', label: 'Nạp tiền' },
  { key: 'PAYMENT', label: 'Thanh toán' },
  { key: 'REFUND', label: 'Hoàn tiền' },
];

export default function BuyerWalletPage() {
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
      showToast('Vui lòng nhập số tiền nạp tối thiểu 10.000 ₫');
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
      showToast('Đã gửi yêu cầu nạp tiền vào ví!');
      setShowTopUp(false);
      setTopUpAmount('');
      void fetchWallet();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối nạp tiền.';
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
      <div className="relative overflow-hidden rounded-lg bg-[#1c3973] border border-blue-900 p-6 text-white shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-blue-200" />
              <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">
                Ví điện tử NEXUS Pay
              </p>
            </div>
            <p className="text-3xl font-extrabold mb-0.5">{balance.toLocaleString('vi-VN')} ₫</p>
            <p className="text-xs text-blue-200/80">Số dư khả dụng</p>

            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-md px-3 py-1.5 w-fit border border-white/20">
              <Lock size={12} className="text-blue-200" />
              <span className="text-xs text-white">
                Ký quỹ đang giữ: <strong>{lockedBalance.toLocaleString('vi-VN')} ₫</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTopUp(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer self-start sm:self-center"
          >
            <Plus size={15} /> Nạp tiền ví
          </button>
        </div>

        <div className="relative z-10 mt-4 flex items-center gap-2">
          <span className="font-mono text-[11px] text-blue-200/70">
            NEXUS-{user?.id?.slice(0, 8).toUpperCase() ?? 'USER'}
          </span>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(user?.id ?? '')}
            className="text-blue-200/60 hover:text-white transition"
            title="Sao chép ID ví"
          >
            <Copy size={11} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownLeft size={13} className="text-emerald-600" />
            <span className="text-[11px] font-semibold text-slate-500">Tổng nạp</span>
          </div>
          <p className="text-base font-extrabold text-emerald-600">
            +{totalIn.toLocaleString('vi-VN')} ₫
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight size={13} className="text-red-500" />
            <span className="text-[11px] font-semibold text-slate-500">Tổng chi tiêu</span>
          </div>
          <p className="text-base font-extrabold text-red-500">
            -{totalOut.toLocaleString('vi-VN')} ₫
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
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-slate-900">Lịch sử giao dịch</h2>
          <div className="flex flex-wrap gap-1.5">
            {filterTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  filter === t.key
                    ? 'bg-[#1c3973] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-blue-600" /> Đang tải lịch sử ví…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Chưa có giao dịch nào được ghi nhận.
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
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-xs font-extrabold ${
                        isPositive ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {Number(tx.amount).toLocaleString('vi-VN')} ₫
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.cls}`}
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
