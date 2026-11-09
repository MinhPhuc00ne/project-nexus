import React from 'react';
import { Loader2 } from 'lucide-react';
import type { CartItem } from '../../services/cart';

interface CheckoutOrderSummaryProps {
  items: CartItem[];
  rawSubtotal: number;
  shippingFee: number;
  grandTotal: number;
  isSubmitting: boolean;
  onCheckout: () => void;
}

export const CheckoutOrderSummary: React.FC<CheckoutOrderSummaryProps> = ({
  items,
  rawSubtotal,
  shippingFee,
  grandTotal,
  isSubmitting,
  onCheckout,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
        Danh sách sản phẩm thanh toán ({items.length})
      </h3>

      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto mb-4">
        {items.map((it) => {
          const match = it.name.match(/\s*\((.*?)\)$/);
          const cleanTitle = match ? it.name.replace(/\s*\([^)]*\)$/, '').trim() : it.name;
          const effectiveSelections: Record<string, string> = { ...(it.selections || {}) };
          if (Object.keys(effectiveSelections).length === 0 && match && match[1]) {
            const parts = match[1].split(/,\s*/);
            for (const part of parts) {
              const [k, v] = part.split(/:\s*/);
              if (k && v) effectiveSelections[k.trim()] = v.trim();
            }
          }
          const hasSelections = Object.keys(effectiveSelections).length > 0;

          return (
            <div key={it.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={it.img}
                  alt={it.name}
                  className="w-12 h-12 object-contain rounded-lg border border-slate-100 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-slate-900 line-clamp-1">{cleanTitle}</span>
                  {hasSelections && (
                    <span className="text-[10px] text-slate-500 font-medium block truncate mt-0.5">
                      Phân loại:{' '}
                      {Object.entries(effectiveSelections)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' • ')}
                    </span>
                  )}
                  {it.shopName && (
                    <span className="text-[10px] text-blue-600 font-semibold block">
                      Shop: {it.shopName}
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px]">Số lượng: x{it.qty}</span>
                </div>
              </div>
              <span className="font-extrabold text-slate-900 shrink-0">
                {Number(it.price * it.qty).toLocaleString('vi-VN')} ₫
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>Tổng tiền hàng:</span>
          <span className="font-semibold text-slate-900">
            {rawSubtotal.toLocaleString('vi-VN')} ₫
          </span>
        </div>
        <div className="flex justify-between">
          <span>Phí vận chuyển (GHN):</span>
          <span className="font-semibold text-slate-900">
            {shippingFee.toLocaleString('vi-VN')} ₫
          </span>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-slate-100 text-slate-900">
          <span className="text-sm font-bold">Tổng thanh toán:</span>
          <span className="text-xl font-extrabold text-blue-600">
            {grandTotal.toLocaleString('vi-VN')} ₫
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={onCheckout}
        className="w-full mt-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Đang tạo giao dịch PayOS...</span>
          </>
        ) : (
          'Xác Nhận Đặt Hàng & Thanh Toán'
        )}
      </button>
    </div>
  );
};

export default CheckoutOrderSummary;
