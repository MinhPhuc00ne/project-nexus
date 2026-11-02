import { useState, type FormEvent } from 'react';
import { Tag, Check, ArrowRight, Truck, ShieldCheck } from 'lucide-react';
import type { CartItem } from '../../services/cart';

interface CartOrderSummaryProps {
  selectedItems: CartItem[];
  rawSubtotal: number;
  grandTotal: number;
  appliedVoucher: { code: string; discount: number } | null;
  onApplyVoucher: (code: string) => void;
  onRemoveVoucher: () => void;
  onProceedCheckout: () => void;
}

export default function CartOrderSummary({
  selectedItems,
  rawSubtotal,
  grandTotal,
  appliedVoucher,
  onApplyVoucher,
  onRemoveVoucher,
  onProceedCheckout,
}: CartOrderSummaryProps) {
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');

  const selectedQuantity = selectedItems.reduce((sum, i) => sum + i.qty, 0);

  const handleSubmitVoucher = (e: FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    setVoucherError('');
    if (!code) {
      setVoucherError('Vui lòng nhập mã giảm giá.');
      return;
    }
    if (code === 'NEXUS500K' || code === 'FREESHIP') {
      onApplyVoucher(code);
      setVoucherCode('');
    } else {
      setVoucherError('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  return (
    <div className="lg:col-span-4 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Tag size={15} className="text-[#f24e1e]" />
          Mã Ưu Đãi / Voucher Sàn
        </h3>

        <form onSubmit={handleSubmitVoucher} className="flex gap-2 mb-2">
          <input
            type="text"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
            placeholder="Nhập NEXUS500K hoặc FREESHIP"
            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#f24e1e] uppercase font-semibold"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Áp dụng
          </button>
        </form>

        {voucherError && <p className="text-[11px] text-red-500">{voucherError}</p>}
        {appliedVoucher && (
          <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 mt-2">
            <span className="font-bold flex items-center gap-1">
              <Check size={13} /> {appliedVoucher.code} (-
              {Number(appliedVoucher.discount).toLocaleString('vi-VN')}₫)
            </span>
            <button
              type="button"
              onClick={onRemoveVoucher}
              className="text-slate-400 hover:text-red-500 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
          Tóm Tắt Đơn Hàng
        </h3>

        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Tạm tính ({selectedQuantity} món đã chọn):</span>
            <span className="font-semibold text-slate-800">
              {Number(rawSubtotal).toLocaleString('vi-VN')} ₫
            </span>
          </div>

          {appliedVoucher && (
            <div className="flex justify-between text-emerald-600">
              <span>Voucher giảm giá:</span>
              <span className="font-bold">
                -{Number(appliedVoucher.discount).toLocaleString('vi-VN')} ₫
              </span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Phí vận chuyển GHN Express:</span>
            {appliedVoucher?.code === 'FREESHIP' ? (
              <span className="font-semibold text-emerald-600">MIỄN PHÍ</span>
            ) : (
              <span className="font-medium text-slate-500 italic">Tính ở bước thanh toán</span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
          <span className="text-sm font-bold text-slate-900">Tổng thanh toán:</span>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-[#f24e1e]">
              {Number(grandTotal).toLocaleString('vi-VN')} ₫
            </div>
            <span className="text-[10px] text-slate-400 block">
              {appliedVoucher?.code === 'FREESHIP'
                ? '(Đã bao gồm VAT & Ký quỹ Escrow)'
                : '(Chưa gồm cước GHN theo địa chỉ nhận)'}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={selectedItems.length === 0}
          onClick={onProceedCheckout}
          className={`w-full py-4 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
            selectedItems.length === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-[#f24e1e] hover:bg-[#d63b0e] text-white hover:shadow-lg'
          }`}
        >
          Tiến Hành Thanh Toán ({selectedQuantity})
          <ArrowRight size={16} />
        </button>

        <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-2">
          <span className="flex items-center gap-1">
            <Truck size={14} className="text-blue-600" /> Đồng kiểm GHN
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" /> Ký quỹ 100%
          </span>
        </div>
      </div>
    </div>
  );
}
