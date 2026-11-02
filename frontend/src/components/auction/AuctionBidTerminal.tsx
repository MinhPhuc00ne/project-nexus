import React, { useState } from 'react';
import { Gavel, Truck, ShieldCheck, X } from 'lucide-react';

interface AuctionBidTerminalProps {
  timeLeft: number;
  currentPrice: number;
  leadingBidder: string;
  onBidSuccess: (amount: number) => void;
}

export const AuctionBidTerminal: React.FC<AuctionBidTerminalProps> = ({
  timeLeft,
  currentPrice,
  leadingBidder,
  onBidSuccess,
}) => {
  const [customBidAmount, setCustomBidAmount] = useState(currentPrice + 1000000);
  const [showBidModal, setShowBidModal] = useState(false);

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
    setCustomBidAmount(customBidAmount + 1000000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Title & Reference */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-extrabold [letter-spacing:0.08em] text-blue-600 uppercase">
            AUDEMARS PIGUET • LE BRASSUS
          </span>
          <span className="text-[11px] font-mono font-bold text-slate-500 [background:#f1f5f9] [padding:0.15rem_0.5rem] rounded">
            LOT #AP-2025-X09
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 leading-snug m-0">
          Audemars Piguet Royal Oak Chronograph 41mm Selfwinding
        </h1>
        <p className="text-[13px] text-slate-500 m-0">
          Ref: 26331ST.OO.1220ST.01 • Thép không gỉ 904L • Mặt Số Xanh Bleu Nuit Tapisserie
        </p>
      </div>

      {/* Countdown Banner */}
      <div className="[background:linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] text-white rounded-xl [padding:1rem_1.25rem] flex items-center justify-between [box-shadow:0_4px_12px_rgba(15,_23,_42,_0.15)]">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase [letter-spacing:0.06em] text-slate-400 font-semibold">
            Thời Gian Còn Lại:
          </span>
          <span className="font-mono text-[26px] font-extrabold [color:#f87171] [letter-spacing:0.05em]">
            {formatTimer(timeLeft)}
          </span>
        </div>
        <div className="text-right flex flex-col gap-1">
          <span className="text-sm font-bold text-white">42 lượt trả giá</span>
          <span className="text-[11px] [color:#38bdf8] flex items-center gap-[0.35rem] justify-end">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            1.428 người đang theo dõi
          </span>
        </div>
      </div>

      {/* Price & Terminal Box */}
      <div className="[background:#ffffff] [border:1px_solid_#e2e8f0] [border-radius:0.875rem] p-5 [box-shadow:0_2px_8px_rgba(0,_0,_0,_0.04)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-slate-600">
            Giá Đặt Hiện Tại (Leading Bid):
          </span>
          <span className="text-[11px] font-semibold text-blue-600 [background:#eff6ff] [padding:0.2rem_0.5rem] rounded-full [border:1px_solid_#dbeafe]">
            Live FX: $1 = 24.000đ
          </span>
        </div>

        <div className="flex items-baseline gap-3 flex-wrap mb-3">
          <span className="[font-size:32px] font-black text-red-500 leading-none">
            {formatVND(currentPrice)}
          </span>
          <span className="text-[15px] font-bold text-blue-600">{formatUSD(currentPrice)}</span>
        </div>

        <div className="text-xs text-slate-500 mb-4">
          Khởi điểm: <strong>95.000.000 đ</strong> (≈ $3,958 USD) • Bước giá tối thiểu:{' '}
          <strong>+1.000.000 đ</strong>
        </div>

        {/* Leading Bidder */}
        <div className="[background:#f8fafc] rounded-lg [padding:0.5rem_0.75rem] text-xs text-slate-600 flex items-center justify-between mb-5 [border-left:3px_solid_#10b981]">
          <span>Người đang giữ giá:</span>
          <span className="font-bold text-slate-900">{leadingBidder} 👑</span>
        </div>

        {/* Quick Bid Increment Buttons */}
        <div className="flex flex-col gap-3">
          <div className="grid [grid-template-columns:repeat(4,_1fr)] gap-2">
            <button
              type="button"
              className="[padding:0.5rem_0.25rem] text-xs font-bold [color:#1e3a8a] bg-blue-50 [border:1px_solid_#bfdbfe] rounded-lg cursor-pointer [transition:all_0.15s_ease] text-center hover:bg-blue-100 hover:[border-color:#93c5fd]"
              onClick={() => handleQuickIncrement(1000000)}
            >
              +1.000.000 đ
            </button>
            <button
              type="button"
              className="[padding:0.5rem_0.25rem] text-xs font-bold [color:#1e3a8a] bg-blue-50 [border:1px_solid_#bfdbfe] rounded-lg cursor-pointer [transition:all_0.15s_ease] text-center hover:bg-blue-100 hover:[border-color:#93c5fd]"
              onClick={() => handleQuickIncrement(2000000)}
            >
              +2.000.000 đ
            </button>
            <button
              type="button"
              className="[padding:0.5rem_0.25rem] text-xs font-bold [color:#1e3a8a] bg-blue-50 [border:1px_solid_#bfdbfe] rounded-lg cursor-pointer [transition:all_0.15s_ease] text-center hover:bg-blue-100 hover:[border-color:#93c5fd]"
              onClick={() => handleQuickIncrement(5000000)}
            >
              +5.000.000 đ
            </button>
            <button
              type="button"
              className="[padding:0.5rem_0.25rem] text-xs font-bold [color:#1e3a8a] bg-blue-50 [border:1px_solid_#bfdbfe] rounded-lg cursor-pointer [transition:all_0.15s_ease] text-center hover:bg-blue-100 hover:[border-color:#93c5fd]"
              onClick={() => handleQuickIncrement(10000000)}
            >
              +10.000.000 đ
            </button>
          </div>

          {/* Custom Bid Input & Action */}
          <div className="flex items-center gap-2 mt-2">
            <div className="relative [flex:1]">
              <input
                type="text"
                className="w-full [padding:0.75rem_1rem] rounded-xl [border:1.5px_solid_#cbd5e1] text-base font-extrabold text-slate-900 bg-slate-50 focus:bg-white focus:border-red-500 focus:outline-none [box-sizing:border-box]"
                value={formatVND(customBidAmount)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setCustomBidAmount(Number(raw) || 0);
                }}
              />
              <span className="absolute right-3 top-[50%] [transform:translateY(-50%)] text-xs font-semibold text-slate-400">
                VNĐ
              </span>
            </div>

            <button
              type="button"
              className="[padding:0.75rem_1.5rem] bg-gradient-to-r from-orange-500 to-red-600 text-white font-extrabold text-sm rounded-xl [border:none] cursor-pointer flex items-center gap-2 [box-shadow:0_4px_12px_rgba(238,_77,_45,_0.35)] [transition:all_0.15s_ease] hover:opacity-95 hover:[transform:translateY(-1px)] whitespace-nowrap active:[transform:translateY(0)]"
              onClick={() => setShowBidModal(true)}
            >
              <Gavel className="w-4 h-4" />
              <span>Đặt Giá Ngay</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 m-0 text-center">
            🔒 Yêu cầu tài khoản có Escrow Deposit 10% (12.850.000 đ) để xác thực giá thầu hợp lệ.
          </p>
        </div>
      </div>

      {/* Shipping & Authenticity Policies */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3.5 [padding:0.875rem_1rem] bg-white [border:1px_solid_#e2e8f0] rounded-xl [box-shadow:0_1px_2px_rgba(0,_0,_0,_0.04)]">
          <div className="[width:36px] [height:36px] rounded-full flex items-center justify-center [flex-shrink:0] bg-red-50 text-red-500">
            <Truck className="w-5 h-5" />
          </div>
          <div className="flex flex-col [gap:0.2rem]">
            <h4 className="text-[13px] font-bold text-slate-900 m-0">
              Vận chuyển Hỏa Tốc GHN Express Bảo Hiểm 100%
            </h4>
            <p className="text-xs text-slate-500 [line-height:1.45] m-0">
              Giao 2H tại TP.HCM & Hà Nội bằng thùng bảo mật chống sốc kèm camera ghi hình niêm
              phong mở hộp.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 [padding:0.875rem_1rem] bg-white [border:1px_solid_#e2e8f0] rounded-xl [box-shadow:0_1px_2px_rgba(0,_0,_0,_0.04)]">
          <div className="[width:36px] [height:36px] rounded-full flex items-center justify-center [flex-shrink:0] bg-blue-50 text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col [gap:0.2rem]">
            <h4 className="text-[13px] font-bold text-slate-900 m-0">
              Chính Sách Hoàn Tiền 200% & Đổi Trả 7 Ngày
            </h4>
            <p className="text-xs text-slate-500 [line-height:1.45] m-0">
              Khách hàng được quyền đồng kiểm cùng chuyên gia; hoàn tiền gấp đôi ngay lập tức nếu
              sai lệch mô hình 3D.
            </p>
          </div>
        </div>
      </div>

      {/* ESCROW CONFIRMATION MODAL */}
      {showBidModal && (
        <div
          className="fixed [inset:0] [background-color:rgba(15,_23,_42,_0.65)] [backdrop-filter:blur(4px)] [z-index:2000] flex items-center justify-center p-4"
          onClick={() => setShowBidModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full [max-width:480px] p-6 [box-shadow:0_20px_25px_-5px_rgba(0,_0,_0,_0.2)] [animation:modalPopAnim_0.2s_cubic-bezier(0.16,_1,_0.3,_1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="[font-size:16px] font-extrabold text-slate-900 m-0">
                Xác Nhận Đặt Giá Đấu Giá 3D
              </h3>
              <button
                type="button"
                className="[background:transparent] [border:none] text-slate-500 cursor-pointer p-1 flex items-center justify-center hover:text-slate-900"
                onClick={() => setShowBidModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg mb-4 text-xs text-slate-700">
              <p className="font-bold text-slate-900 mb-1">
                Audemars Piguet Royal Oak Chronograph 41mm
              </p>
              <p className="m-0 text-slate-500">Mã Lot: AP-2025-X09 • Kho bảo mật TP.HCM</p>
            </div>

            <div className="space-y-3 mb-5 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Giá đặt đề xuất:</span>
                <span className="font-bold text-red-600">{formatVND(customBidAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Tiền cọc Escrow (10%):</span>
                <span className="font-bold text-blue-600">
                  {formatVND(Math.round(customBidAmount * 0.1))}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Cổng ký quỹ Escrow:</span>
                <span className="font-semibold text-slate-800">PayOS / Smart Contract</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-5 leading-relaxed">
              * Khoản cọc sẽ được đóng băng tạm thời trong tài khoản Escrow. Trong trường hợp có
              người đặt giá cao hơn, khoản cọc sẽ được tự động hoàn lại 100% trong vòng 30 giây.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                onClick={() => setShowBidModal(false)}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs shadow-md hover:opacity-95"
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
