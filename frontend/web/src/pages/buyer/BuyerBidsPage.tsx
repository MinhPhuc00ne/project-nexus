import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Gavel,
  Clock,
  Trophy,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Flame,
  ShoppingBag,
} from 'lucide-react';

import { MOCK_BUYER_BIDS, type BuyerBidStatus } from '../../mocks';

type BidStatus = BuyerBidStatus;

const mockBids = MOCK_BUYER_BIDS;

/* ─────────── Status Config ─────────── */
const statusConfig: Record<
  Exclude<BidStatus, 'ALL'>,
  { label: string; icon: React.ReactNode; cls: string; desc: string }
> = {
  WINNING: {
    label: 'Đang dẫn đầu',
    icon: <Trophy size={11} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Giá thầu của bạn cao nhất',
  },
  ACTIVE: {
    label: 'Đang tham gia',
    icon: <TrendingUp size={11} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Phiên đang diễn ra',
  },
  OUTBID: {
    label: 'Bị vượt giá',
    icon: <AlertCircle size={11} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
    desc: 'Người khác đặt cao hơn',
  },
  WON: {
    label: 'Đã thắng',
    icon: <CheckCircle size={11} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Chúc mừng! Bạn đã thắng đấu giá',
  },
  LOST: {
    label: 'Đã thua',
    icon: <XCircle size={11} />,
    cls: 'bg-slate-50 text-slate-500 border-slate-200',
    desc: 'Phiên đã kết thúc',
  },
  ENDED: {
    label: 'Đã kết thúc',
    icon: <Clock size={11} />,
    cls: 'bg-slate-50 text-slate-500 border-slate-200',
    desc: 'Phiên đấu giá đã kết thúc',
  },
};

const tabs: { key: BidStatus; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'WINNING', label: 'Dẫn đầu' },
  { key: 'OUTBID', label: 'Bị vượt' },
  { key: 'ACTIVE', label: 'Đang đấu' },
  { key: 'WON', label: 'Đã thắng' },
  { key: 'LOST', label: 'Đã thua' },
];

/* ─────────── Component ─────────── */
export default function BuyerBidsPage() {
  const [activeTab, setActiveTab] = useState<BidStatus>('ALL');

  const filtered = mockBids.filter((b) => activeTab === 'ALL' || b.status === activeTab);

  const winningCount = mockBids.filter((b) => b.status === 'WINNING').length;
  const activeCount = mockBids.filter(
    (b) => b.status === 'ACTIVE' || b.status === 'WINNING' || b.status === 'OUTBID',
  ).length;
  const wonCount = mockBids.filter((b) => b.status === 'WON').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Gavel size={18} className="text-violet-600" />
          Phiên đấu giá của tôi
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Theo dõi các phiên đang tham gia và lịch sử thắng/thua
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-center">
          <Trophy size={16} className="text-amber-600 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-amber-700">{winningCount}</p>
          <p className="text-[11px] text-amber-600 font-semibold">Đang dẫn đầu</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-center">
          <Flame size={16} className="text-blue-600 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-blue-700">{activeCount}</p>
          <p className="text-[11px] text-blue-600 font-semibold">Đang diễn ra</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-center">
          <CheckCircle size={16} className="text-emerald-600 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-emerald-700">{wonCount}</p>
          <p className="text-[11px] text-emerald-600 font-semibold">Đã thắng</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const count =
            tab.key === 'ALL'
              ? mockBids.length
              : mockBids.filter((b) => b.status === tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bid List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <Gavel size={36} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Không có phiên đấu giá nào</p>
          <Link
            to="/auction"
            className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition"
          >
            <ShoppingBag size={13} />
            Khám phá đấu giá
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((bid) => {
            const s = statusConfig[bid.status];
            const isActive = ['ACTIVE', 'WINNING', 'OUTBID'].includes(bid.status);
            const bidGain = bid.currentBid - bid.startPrice;
            const gainPct = Math.round((bidGain / bid.startPrice) * 100);

            return (
              <div
                key={bid.id}
                className={`rounded-2xl border bg-white shadow-sm overflow-hidden hover:shadow-md transition ${
                  bid.status === 'WINNING'
                    ? 'border-amber-300 shadow-amber-100'
                    : bid.status === 'OUTBID'
                      ? 'border-red-200'
                      : 'border-slate-200'
                }`}
              >
                {/* Header */}
                <div
                  className={`flex items-center justify-between px-4 py-2.5 border-b ${
                    bid.status === 'WINNING'
                      ? 'bg-amber-50/80 border-amber-200'
                      : bid.status === 'OUTBID'
                        ? 'bg-red-50/60 border-red-100'
                        : 'bg-slate-50/60 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock
                      size={12}
                      className={`${
                        isActive
                          ? bid.status === 'OUTBID'
                            ? 'text-red-500'
                            : 'text-blue-600'
                          : 'text-slate-400'
                      }`}
                    />
                    <span
                      className={`text-[11px] font-semibold ${
                        isActive ? 'text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {isActive ? `Còn lại: ${bid.timeLeft}` : bid.endTime}
                    </span>
                    {isActive && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.cls}`}
                  >
                    {s.icon}
                    {s.label}
                  </span>
                </div>

                {/* Body */}
                <div className="flex items-start gap-4 px-4 py-4">
                  <div className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
                    <img
                      src={bid.img}
                      alt={bid.productName}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 line-clamp-2">
                      {bid.productName}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      #{bid.auctionId} • {bid.totalBids} lượt đặt giá
                    </p>

                    {/* Price Info */}
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 p-2">
                        <p className="text-[10px] text-slate-400 mb-0.5">Giá thầu của tôi</p>
                        <p className="text-xs font-extrabold text-violet-700">
                          {bid.myBid.toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                      <div
                        className={`rounded-lg p-2 ${
                          bid.status === 'WINNING'
                            ? 'bg-amber-50'
                            : bid.status === 'OUTBID'
                              ? 'bg-red-50'
                              : 'bg-slate-50'
                        }`}
                      >
                        <p className="text-[10px] text-slate-400 mb-0.5">Giá hiện tại</p>
                        <p
                          className={`text-xs font-extrabold ${
                            bid.status === 'WINNING'
                              ? 'text-amber-700'
                              : bid.status === 'OUTBID'
                                ? 'text-red-600'
                                : 'text-slate-800'
                          }`}
                        >
                          {bid.currentBid.toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                    </div>

                    {/* Gain */}
                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                      <TrendingUp size={11} />
                      Tăng {gainPct}% so với giá khởi điểm ({bid.startPrice.toLocaleString('vi-VN')}{' '}
                      ₫)
                    </p>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
                  {bid.status === 'WON' && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                    >
                      Tiến hành thanh toán
                    </button>
                  )}
                  {bid.status === 'OUTBID' && (
                    <Link
                      to={`/auction/${bid.auctionId}`}
                      className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition flex items-center gap-1"
                    >
                      <Gavel size={11} />
                      Đặt lại giá thầu
                    </Link>
                  )}
                  <Link
                    to={`/auction/${bid.auctionId}`}
                    className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition flex items-center gap-1"
                  >
                    Xem phiên đấu giá <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
