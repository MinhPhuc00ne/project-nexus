import React from 'react';
import type { CartItem } from '../../services/cart';

export interface CheckoutItemsSummaryProps {
  items: CartItem[];
  itemsSubtotal: number;
  shippingFee: number;
  grandTotal: number;
  isCalculatingFee?: boolean;
}

export const CheckoutItemsSummary: React.FC<CheckoutItemsSummaryProps> = ({
  items,
  itemsSubtotal,
  shippingFee,
  grandTotal,
  isCalculatingFee = false,
}) => {
  return (
    <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs">
      <div className="flex justify-between border-b border-slate-200 pb-2 font-bold text-slate-800">
        <span>Sản phẩm thanh toán ({items.length})</span>
        <span>Thành tiền</span>
      </div>
      <div className="max-h-36 divide-y divide-slate-100 overflow-y-auto">
        {items.map((item) => {
          const match = item.name.match(/\s*\((.*?)\)$/);
          const cleanTitle = match ? item.name.replace(/\s*\([^)]*\)$/, '').trim() : item.name;
          const effectiveSelections: Record<string, string> = { ...(item.selections || {}) };
          if (Object.keys(effectiveSelections).length === 0 && match && match[1]) {
            const parts = match[1].split(/,\s*/);
            for (const part of parts) {
              const [k, v] = part.split(/:\s*/);
              if (k && v) effectiveSelections[k.trim()] = v.trim();
            }
          }
          const hasSelections = Object.keys(effectiveSelections).length > 0;

          return (
            <div key={item.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex-1 min-w-0">
                <span className="line-clamp-1 font-medium text-slate-700">
                  {cleanTitle} <span className="text-slate-400">x{item.qty}</span>
                </span>
                {hasSelections && (
                  <span className="text-[10px] text-slate-400 block truncate">
                    {Object.entries(effectiveSelections)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' • ')}
                  </span>
                )}
              </div>
              <span className="shrink-0 font-bold text-slate-900">
                {(Number(item.price) * item.qty).toLocaleString('vi-VN')} ₫
              </span>
            </div>
          );
        })}
      </div>
      <div className="space-y-1 border-t border-slate-200 pt-2 text-slate-600">
        <div className="flex justify-between">
          <span>Tiền hàng:</span>
          <span className="font-semibold text-slate-800">
            {Number(itemsSubtotal).toLocaleString('vi-VN')} ₫
          </span>
        </div>
        <div className="flex justify-between">
          <span>Phí vận chuyển GHN:</span>
          <span className="font-semibold text-slate-800">
            {isCalculatingFee ? (
              <span className="italic text-slate-400">Đang tính cước GHN...</span>
            ) : shippingFee === 0 ? (
              <span className="font-bold text-emerald-600">MIỄN PHÍ</span>
            ) : (
              `${Number(shippingFee).toLocaleString('vi-VN')} ₫`
            )}
          </span>
        </div>
      </div>
      <div className="flex items-baseline justify-between border-t border-slate-200 pt-2 font-bold">
        <span className="text-slate-700">Tổng thanh toán:</span>
        <span className="text-base font-extrabold text-blue-600">
          {isCalculatingFee ? (
            <span className="text-xs font-medium italic text-slate-400">Đang tính...</span>
          ) : (
            `${Number(grandTotal).toLocaleString('vi-VN')} ₫`
          )}
        </span>
      </div>
    </div>
  );
};

export default CheckoutItemsSummary;
