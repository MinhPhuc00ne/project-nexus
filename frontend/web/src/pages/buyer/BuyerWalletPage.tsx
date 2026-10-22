import { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  TrendingUp,
  Plus,
  ArrowRight,
  Copy,
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

import {
  MOCK_BUYER_TRANSACTIONS,
  type BuyerFilterType,
  type BuyerTransaction,
  type BuyerTxType,
} from '../../mocks';

type TxType = BuyerTxType;
type FilterType = BuyerFilterType;
type Transaction = BuyerTransaction;

const mockTransactions = MOCK_BUYER_TRANSACTIONS;

const txConfig: Record<
  TxType,
  { icon: React.ReactNode; colorAmount: string; colorBg: string; colorIcon: string }
> = {
  TOP_UP: {
    icon: <ArrowDownLeft size={14} />,
    colorAmount: 'text-emerald-600',
    colorBg: 'bg-emerald-50',
    colorIcon: 'text-emerald-600',
  },
  PAYMENT: {
    icon: <ArrowUpRight size={14} />,
    colorAmount: 'text-red-500',
    colorBg: 'bg-red-50',
    colorIcon: 'text-red-500',
  },
  REFUND: {
    icon: <ArrowDownLeft size={14} />,
    colorAmount: 'text-blue-600',
    colorBg: 'bg-blue-50',
    colorIcon: 'text-blue-600',
  },
  ESCROW_LOCK: {
    icon: <Lock size={14} />,
    colorAmount: 'text-amber-600',
    colorBg: 'bg-amber-50',
    colorIcon: 'text-amber-600',
  },
  ESCROW_RELEASE: {
    icon: <ArrowDownLeft size={14} />,
    colorAmount: 'text-violet-600',
    colorBg: 'bg-violet-50',
    colorIcon: 'text-violet-600',
  },
};

const statusBadge: Record<Transaction['status'], { icon: React.ReactNode; cls: string }> = {
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

const topUpMethods = [
  { icon: Smartphone, label: 'VNPay QR', desc: 'Quét mã nhanh' },
  { icon: CreditCard, label: 'Stripe', desc: 'Visa / Mastercard' },
  { icon: Building2, label: 'PayOS', desc: 'Chuyển khoản NG' },
];

/* ─────────── Component ─────────── */
export default function BuyerWalletPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  const balance = user?.wallet?.balance ?? 4500000;
  const lockedBalance = user?.wallet?.lockedBalance ?? 128500000;

  const filtered = mockTransactions.filter((tx) => {
    if (filter === 'ALL') return true;
    return tx.type === filter;
  });

  const totalIn = mockTransactions
    .filter((tx) => tx.amount > 0 && tx.status === 'COMPLETED')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalOut = mockTransactions
    .filter((tx) => tx.amount < 0 && tx.status === 'COMPLETED')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const quickAmounts = [500000, 1000000, 2000000, 5000000];

  return (
    <div className="space-y-5">
      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-[#f24e1e] p-6 text-white shadow-lg shadow-orange-500/25">
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-6 left-10 h-20 w-20 rounded-full bg-white/10 blur-xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} className="text-white/80" />
            <p className="text-xs font-semibold text-white/80 uppercase tracking-widest">
              NEXUS Pay
            </p>
          </div>
          <p className="text-3xl font-extrabold mb-0.5">{balance.toLocaleString('vi-VN')} ₫</p>
          <p className="text-xs text-white/70">Số dư khả dụng</p>

          {/* Locked balance */}
          <div className="mt-4 flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 w-fit">
            <Lock size={12} className="text-white/80" />
            <span className="text-xs text-white/90">
              Ký quỹ đang giữ: <strong>{lockedBalance.toLocaleString('vi-VN')} ₫</strong>
            </span>
          </div>
        </div>

        {/* Wallet ID */}
        <div className="relative z-10 mt-4 flex items-center gap-2">
          <span className="font-mono text-[11px] text-white/60">
            NEXUS-{user?.id?.slice(0, 8).toUpperCase() ?? 'A1B2C3D4'}
          </span>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(user?.id ?? '')}
            className="text-white/50 hover:text-white transition"
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
            <span className="text-[11px] font-semibold text-slate-500">Tổng nạp</span>
          </div>
          <p className="text-base font-extrabold text-emerald-600">
            +{totalIn.toLocaleString('vi-VN')} ₫
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={13} className="text-red-500" />
            <span className="text-[11px] font-semibold text-slate-500">Tổng chi</span>
          </div>
          <p className="text-base font-extrabold text-red-500">
            -{totalOut.toLocaleString('vi-VN')} ₫
          </p>
        </div>
      </div>

      {/* Top Up Button */}
      <button
        type="button"
        onClick={() => setShowTopUp(!showTopUp)}
        className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition"
      >
        <div className="flex items-center gap-2">
          <Plus size={16} />
          <span className="text-sm font-bold">Nạp tiền vào ví</span>
        </div>
        <ArrowRight size={14} className={`transition-transform ${showTopUp ? 'rotate-90' : ''}`} />
      </button>

      {/* Top Up Panel */}
      {showTopUp && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold text-slate-900">Chọn phương thức nạp tiền</h3>

          {/* Method buttons */}
          <div className="grid grid-cols-3 gap-2">
            {topUpMethods.map((m) => (
              <button
                key={m.label}
                type="button"
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-center group"
              >
                <m.icon size={18} className="text-slate-500 group-hover:text-blue-600 transition" />
                <span className="text-[11px] font-bold text-slate-700">{m.label}</span>
                <span className="text-[10px] text-slate-400">{m.desc}</span>
              </button>
            ))}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Số tiền nạp</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập số tiền…"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full pr-12 pl-4 py-2.5 text-sm font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₫
              </span>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopUpAmount(amt.toLocaleString('vi-VN'))}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition"
                >
                  +{(amt / 1000).toLocaleString('vi-VN')}K
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
          >
            Tiến hành nạp tiền
          </button>
        </div>
      )}

      {/* Transaction History */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Lịch sử giao dịch</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 px-3 py-2.5 border-b border-slate-100 overflow-x-auto scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                filter === tab.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="divide-y divide-slate-100">
          {filtered.map((tx) => {
            const cfg = txConfig[tx.type];
            const badge = statusBadge[tx.status];
            const isPositive = tx.amount > 0;
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50/60 transition"
              >
                <div
                  className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center ${cfg.colorBg} ${cfg.colorIcon}`}
                >
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{tx.label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-slate-400">{tx.date}</p>
                    <span
                      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${badge.cls}`}
                    >
                      {badge.icon}
                      {tx.status === 'COMPLETED'
                        ? 'Hoàn thành'
                        : tx.status === 'PENDING'
                          ? 'Đang xử lý'
                          : 'Thất bại'}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-sm font-extrabold shrink-0 ${
                    isPositive ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {tx.amount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
