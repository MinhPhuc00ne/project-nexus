import React, { useState, useEffect } from 'react';
import { Gavel, Truck, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import type { AuctionEntity } from '../../services/auction.service';

interface AuctionBidTerminalProps {
  auction?: AuctionEntity | null;
  timeLeft: number;
  currentPrice: number;
  leadingBidder: string;
  onBidSuccess: (amount: number) => void;
  isEligible?: boolean;
  eligibilityReason?: string;
  isFlaggedViewOnly?: boolean;
  totalBidsCount?: number;
}

export const AuctionBidTerminal: React.FC<AuctionBidTerminalProps> = ({
  auction,
  timeLeft,
  currentPrice,
  leadingBidder,
  onBidSuccess,
  isEligible: _isEligible = true,
  eligibilityReason,
  isFlaggedViewOnly = false,
  totalBidsCount,
}) => {
  const minIncrement = auction?.bidIncrement ? Number(auction.bidIncrement) : 1000000;
  const [customBidAmount, setCustomBidAmount] = useState(currentPrice + minIncrement);
  const [showBidModal, setShowBidModal] = useState(false);

  useEffect(() => {
    setCustomBidAmount(currentPrice + minIncrement);
  }, [currentPrice, minIncrement]);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const formatUSD = (vnd: number) => {
    const usd = Math.round(vnd / 24000);
    return `(≈ $${new Intl.NumberFormat('en-US').format(usd)} USD)`;
  };

  const handleQuickIncrement = (inc: number) => {
    setCustomBidAmount(currentPrice + inc);
  };

  const handleConfirmBid = () => {
    onBidSuccess(customBidAmount);
    setShowBidModal(false);
  };

  const displayTitle =
    auction?.product?.title ||
    auction?.title ||
    'Audemars Piguet Royal Oak Chronograph 41mm Selfwinding';
  const lotNumber = auction?.id
    ? `LOT #${auction.id.slice(0, 8).toUpperCase()}`
    : 'LOT #AP-2025-X09';
  const startPriceVal = auction?.startingPrice ? Number(auction.startingPrice) : 95000000;
  const quickIncrements = [minIncrement, minIncrement * 2, minIncrement * 5, minIncrement * 10];
  const bidsCount = totalBidsCount ?? auction?.totalBidsCount ?? (auction?.bids?.length || 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Title & Reference */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-extrabold tracking-wider text-blue-600 uppercase">
            {auction?.product?.id ? 'NEXUS VERIFIED COLLECTION' : 'OFFICIAL AUCTION ROOM'}
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            {lotNumber}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 leading-snug m-0">{displayTitle}</h1>
        {auction?.description && (
          <p className="text-[13px] text-slate-500 line-clamp-2 m-0">{auction.description}</p>
        )}
      </div>

      {/* Countdown Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white rounded-xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Thời Gian Còn Lại:
          </span>
          <span className="font-mono text-2xl sm:text-3xl font-extrabold text-rose-400 tracking-wider">
            {timeLeft > 0 ? formatTimer(timeLeft) : 'ĐÃ KẾT THÚC'}
          </span>
        </div>
        <div className="text-right flex flex-col gap-1">
          <span className="text-sm font-bold text-white">{bidsCount} lượt trả giá</span>
          <span className="text-[11px] text-sky-400 flex items-center gap-1.5 justify-end">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Trực tiếp 3D
          </span>
        </div>
      </div>

      {/* Price & Terminal Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-slate-600">
            Giá Đặt Hiện Tại (Leading Bid):
          </span>
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Live FX: $1 ≈ 24.000đ
          </span>
        </div>

        <div className="flex items-baseline gap-3 flex-wrap mb-3">
          <span className="text-3xl sm:text-4xl font-black text-rose-600 leading-none">
            {formatVND(currentPrice)}
          </span>
          <span className="text-[15px] font-bold text-blue-600">{formatUSD(currentPrice)}</span>
        </div>

        <div className="text-xs text-slate-500 mb-4">
          Khởi điểm: <strong>{formatVND(startPriceVal)}</strong> • Bước giá tối thiểu:{' '}
          <strong>+{formatVND(minIncrement)}</strong>
        </div>

        {/* Leading Bidder */}
        <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 flex items-center justify-between mb-5 border-l-3 border-emerald-500">
          <span>Người đang giữ giá:</span>
          <span className="font-bold text-slate-900">{leadingBidder} 👑</span>
        </div>

        {/* View-only eligibility warning */}
        {isFlaggedViewOnly && (
          <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Chế độ Chỉ Xem (View-Only)</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {eligibilityReason ||
                  'Điểm uy tín tài khoản của bạn chưa đáp ứng yêu cầu tối thiểu của phiên này.'}
              </p>
            </div>
          </div>
        )}

        {/* Quick Bid Increment Buttons */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickIncrements.map((incVal, idx) => {
              const isSelected = customBidAmount === currentPrice + incVal;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isFlaggedViewOnly || timeLeft <= 0}
                  className={`p-2.5 rounded-xl cursor-pointer transition text-center flex flex-col items-center justify-center gap-0.5 border ${
                    isSelected
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  onClick={() => handleQuickIncrement(incVal)}
                >
                  <span className="font-extrabold text-xs">+{formatVND(incVal)}</span>
                  <span
                    className={`text-[10px] font-medium ${
                      isSelected ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    = {formatVND(currentPrice + incVal)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Bid Input & Action */}
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex-1">
              <input
                type="text"
                disabled={isFlaggedViewOnly || timeLeft <= 0}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-base font-extrabold text-slate-900 bg-slate-50 focus:bg-white focus:border-rose-500 focus:outline-none disabled:opacity-50"
                value={formatVND(customBidAmount)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setCustomBidAmount(Number(raw) || 0);
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                VNĐ
              </span>
            </div>

            <button
              type="button"
              disabled={isFlaggedViewOnly || timeLeft <= 0 || customBidAmount <= currentPrice}
              className="py-2.5 px-5 bg-gradient-to-r from-orange-500 to-rose-600 text-white font-extrabold text-sm rounded-xl shadow-md transition hover:opacity-95 active:scale-95 whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              onClick={() => setShowBidModal(true)}
            >
              <Gavel className="w-4 h-4" />
              <span>{isFlaggedViewOnly ? 'Chỉ Xem' : 'Đặt Giá Ngay'}</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 m-0 text-center">
            🔒 Ký quỹ an toàn qua ví (AUCTION_BID_LOCK) • Tự động hoàn tiền 100%
            (AUCTION_BID_REFUND) khi có người trả giá cao hơn.
          </p>
        </div>
      </div>

      {/* Shipping & Policies */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3.5 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-rose-50 text-rose-500">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-900 m-0">
              Vận chuyển Hỏa Tốc GHN Express Bảo Hiểm 100%
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed m-0 mt-0.5">
              Đóng gói bảo mật chống va đập, bảo hiểm toàn phần giá trị và đồng kiểm trực tiếp khi
              nhận hàng.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-900 m-0">
              Bảo Chứng Ký Quỹ PayOS Escrow & Hoàn Tiền 100%
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed m-0 mt-0.5">
              Cọc được khóa an toàn trong ví. Tự động hoàn lại 100% ngay khi có người trả giá cao
              hơn.
            </p>
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showBidModal && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4"
          onClick={() => setShowBidModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 m-0">
                Xác Nhận Đặt Giá Đấu Giá 3D
              </h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                onClick={() => setShowBidModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl mb-4 text-xs text-slate-700">
              <p className="font-bold text-slate-900 mb-1">{displayTitle}</p>
              <p className="m-0 text-slate-500">{lotNumber}</p>
            </div>

            <div className="space-y-3 mb-5 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Mức giá bạn đặt:</span>
                <span className="font-bold text-rose-600 text-base">
                  {formatVND(customBidAmount)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Cần khóa cọc trong ví (10%):</span>
                <span className="font-bold text-blue-600">
                  {formatVND(Math.round(customBidAmount * 0.1))}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Bảo chứng ký quỹ:</span>
                <span className="font-semibold text-emerald-600">Ví NEXUS Pay Escrow</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-5 leading-relaxed bg-slate-50 p-2.5 rounded-lg">
              * Khoản cọc sẽ được tạm khóa trong ví. Nếu có người trả giá cao hơn, hệ thống sẽ tự
              động mở khóa hoàn tiền 100% về ví khả dụng ngay lập tức.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                onClick={() => setShowBidModal(false)}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-bold text-xs shadow-md hover:opacity-95 cursor-pointer"
                onClick={handleConfirmBid}
              >
                Khóa Cọc & Đặt Giá Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionBidTerminal;
