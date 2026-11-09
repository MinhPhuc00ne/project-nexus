import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { CartItem } from '../../types/cart.types';

interface CartItemListProps {
  items: CartItem[];
  isAllSelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectItem: (id: string | number) => void;
  onUpdateQty: (id: string | number, qty: number) => void;
  onRemoveItem: (id: string | number) => void;
}

export const CartItemList: React.FC<CartItemListProps> = ({
  items,
  isAllSelected,
  onToggleSelectAll,
  onToggleSelectItem,
  onUpdateQty,
  onRemoveItem,
}) => {
  return (
    <div className="lg:col-span-8 space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-3.5 flex items-center justify-between text-xs font-bold text-slate-600 shadow-sm">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={(e) => onToggleSelectAll(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded accent-[#f24e1e] focus:ring-orange-400"
          />
          <span>Chọn tất cả ({items.length} món)</span>
        </label>
        <div className="hidden sm:flex items-center gap-12 pr-6">
          <span className="w-24 text-right">Đơn giá</span>
          <span className="w-24 text-center">Số lượng</span>
          <span className="w-28 text-right">Số tiền</span>
          <span className="w-8"></span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
        {items.map((item) => {
          const targetUrl = item.productId ? `/product/${item.productId}` : `/product/${item.id}`;

          // Parse parenthesized options if present in item.name
          const match = item.name.match(/\s*\((.*?)\)$/);
          const cleanTitle = match ? item.name.replace(/\s*\([^)]*\)$/, '').trim() : item.name;

          const effectiveSelections: Record<string, string> = { ...(item.selections || {}) };
          if (Object.keys(effectiveSelections).length === 0 && match && match[1]) {
            const parts = match[1].split(/,\s*/);
            for (const part of parts) {
              const [k, v] = part.split(/:\s*/);
              if (k && v) {
                effectiveSelections[k.trim()] = v.trim();
              }
            }
          }
          const selectionEntries = Object.entries(effectiveSelections);
          const hasSelections = selectionEntries.length > 0;

          return (
            <div
              key={item.id}
              className={`p-5 flex flex-col gap-3 transition ${
                item.isOutOfStock ? 'bg-red-50/40 opacity-80' : 'hover:bg-slate-50/50'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={Boolean(item.selected)}
                    disabled={item.isOutOfStock}
                    onChange={() => onToggleSelectItem(item.id)}
                    className="h-4 w-4 shrink-0 cursor-pointer rounded accent-[#f24e1e] focus:ring-orange-400 disabled:opacity-50"
                  />
                  <Link
                    to={targetUrl}
                    className="shrink-0 w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 p-1 overflow-hidden flex items-center justify-center"
                  >
                    <img src={item.img} alt={item.name} className="w-full h-full object-contain" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    {item.shopName && (
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">
                        {item.shopName}
                      </span>
                    )}
                    <Link
                      to={targetUrl}
                      className="text-xs font-bold text-slate-900 hover:text-[#f24e1e] transition line-clamp-2"
                    >
                      {cleanTitle}
                    </Link>
                    <div className="mt-1">
                      {item.isOutOfStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                          Hết hàng
                        </span>
                      ) : item.isStockInsufficient ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Chỉ còn lại {item.availableQty} sản phẩm
                        </span>
                      ) : hasSelections ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-slate-500">
                            Phân loại:
                          </span>
                          {selectionEntries.map(([key, val]) => (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-700"
                            >
                              <span className="text-slate-400 mr-1">{key}:</span>
                              <span className="font-bold text-slate-900">{val}</span>
                            </span>
                          ))}
                          <span className="text-[11px] text-emerald-600 font-medium ml-1">
                            • Bảo chứng Escrow
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400">
                            Phân loại: Bản Tiêu Chuẩn • Bảo chứng Escrow
                          </span>
                          <Link
                            to={targetUrl}
                            className="text-[11px] text-[#f24e1e] hover:underline font-semibold"
                          >
                            (Chọn màu sắc/kích cỡ)
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="w-24 text-right">
                    <span className="text-xs font-semibold text-slate-700 block">
                      {Number(item.price).toLocaleString('vi-VN')} ₫
                    </span>
                    {item.hasPriceChanged && item.priceAtAdded && (
                      <span className="text-[10px] text-slate-400 line-through block">
                        {Number(item.priceAtAdded).toLocaleString('vi-VN')} ₫
                      </span>
                    )}
                  </div>

                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.qty - 1)}
                      className="px-2 py-1 hover:bg-slate-200 transition text-slate-600 cursor-pointer"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-slate-900 bg-white py-1">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      disabled={item.availableQty !== undefined && item.qty >= item.availableQty}
                      onClick={() => onUpdateQty(item.id, item.qty + 1)}
                      className="px-2 py-1 hover:bg-slate-200 transition text-slate-600 cursor-pointer disabled:opacity-40"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <div className="w-28 text-right text-sm font-extrabold text-[#f24e1e]">
                    {Number(item.price * item.qty).toLocaleString('vi-VN')} ₫
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Xóa sản phẩm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {item.hasPriceChanged && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                  <span>
                    Giá sản phẩm vừa được người bán cập nhật: từ{' '}
                    <strong>{Number(item.priceAtAdded).toLocaleString('vi-VN')} ₫</strong> sang{' '}
                    <strong>{Number(item.price).toLocaleString('vi-VN')} ₫</strong>.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-3">
        <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold mb-0.5">Thanh toán Ký quỹ Bảo chứng Escrow an toàn</h4>
          <p className="text-indigo-700 leading-relaxed text-[11px]">
            Toàn bộ đơn hàng được giữ tiền ký quỹ tại cổng PayOS / Ví NEXUS Pay. Người bán chỉ nhận
            được khoản thanh toán sau khi quý khách đồng kiểm bưu kiện và xác nhận hoàn tất.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CartItemList;
