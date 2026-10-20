import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import {
  getCartItems,
  updateCartQty,
  removeFromCart,
  toggleSelectItem,
  toggleSelectAll,
  type CartItem,
} from '../../services/cart';
import CheckoutModal, { type DeliveryAddress } from '../../components/cart/CheckoutModal';
import CartOrderSummary from '../../components/cart/CartOrderSummary';

export type { DeliveryAddress };

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    const handleCartSync = () => setItems(getCartItems());
    window.addEventListener('nexus:cart-change', handleCartSync);
    window.addEventListener('storage', handleCartSync);
    return () => {
      window.removeEventListener('nexus:cart-change', handleCartSync);
      window.removeEventListener('storage', handleCartSync);
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const selectedItems = items.filter((i) => i.selected);
  const totalQuantity = items.reduce((sum, i) => sum + i.qty, 0);
  const rawSubtotal = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const grandTotal = Math.max(0, rawSubtotal - discountAmount);
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3.5 text-white shadow-2xl animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <nav className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-indigo-600 transition">
              Trang Chủ
            </Link>
            <ChevronRight size={13} />
            <span className="font-semibold text-slate-800">Giỏ Hàng Của Bạn</span>
          </nav>
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft size={14} />
            Tiếp tục mua sắm
          </button>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
          <ShoppingBag className="text-[#f24e1e]" size={28} />
          Giỏ Hàng ({totalQuantity} sản phẩm)
        </h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm max-w-xl mx-auto my-8">
            <div className="w-20 h-20 bg-orange-50 text-[#f24e1e] rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={36} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Giỏ hàng của bạn đang trống</h2>
            <p className="text-sm text-slate-500 mb-6">
              Khám phá các sản phẩm thương mại cao cấp và phiên đấu giá 3D độc quyền trên NEXUS ngay
              hôm nay!
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f24e1e] hover:bg-[#d63b0e] text-white font-bold text-sm transition shadow-md"
            >
              Tiếp tục mua sắm
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-3.5 flex items-center justify-between text-xs font-bold text-slate-600 shadow-sm">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
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
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={Boolean(item.selected)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="h-4 w-4 shrink-0 cursor-pointer rounded accent-[#f24e1e] focus:ring-orange-400"
                      />
                      <Link
                        to={`/product/${item.id}`}
                        className="shrink-0 w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 p-1 overflow-hidden flex items-center justify-center"
                      >
                        <img
                          src={item.img}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        {item.shopName && (
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">
                            {item.shopName}
                          </span>
                        )}
                        <Link
                          to={`/product/${item.id}`}
                          className="text-xs font-bold text-slate-900 hover:text-[#f24e1e] transition line-clamp-2"
                        >
                          {item.name}
                        </Link>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          Phân loại: Bản Tiêu Chuẩn • Bảo chứng Escrow
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="w-24 text-right text-xs font-semibold text-slate-700">
                        {Number(item.price).toLocaleString('vi-VN')} ₫
                      </div>

                      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.qty - 1)}
                          className="px-2 py-1 hover:bg-slate-200 transition text-slate-600 cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-900 bg-white py-1">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.qty + 1)}
                          className="px-2 py-1 hover:bg-slate-200 transition text-slate-600 cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="w-28 text-right text-sm font-extrabold text-[#f24e1e]">
                        {Number(item.price * item.qty).toLocaleString('vi-VN')} ₫
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          removeFromCart(item.id);
                          showToast('Đã xóa sản phẩm khỏi giỏ hàng.');
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-3">
                <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-0.5">Thanh toán Ký quỹ Bảo chứng Escrow an toàn</h4>
                  <p className="text-indigo-700 leading-relaxed text-[11px]">
                    Toàn bộ đơn hàng được giữ tiền ký quỹ tại cổng PayOS / Stripe. Người bán chỉ
                    nhận được khoản thanh toán sau khi quý khách đồng kiểm bưu kiện và xác nhận hoàn
                    tất.
                  </p>
                </div>
              </div>
            </div>

            <CartOrderSummary
              selectedItems={selectedItems}
              rawSubtotal={rawSubtotal}
              grandTotal={grandTotal}
              appliedVoucher={appliedVoucher}
              onApplyVoucher={(code) => {
                if (code === 'NEXUS500K') {
                  setAppliedVoucher({ code: 'NEXUS500K', discount: 500000 });
                  showToast('Áp dụng mã NEXUS500K giảm 500.000đ thành công!');
                } else if (code === 'FREESHIP') {
                  setAppliedVoucher({ code: 'FREESHIP', discount: 150000 });
                  showToast('Áp dụng mã FREESHIP miễn phí vận chuyển thành công!');
                }
              }}
              onRemoveVoucher={() => setAppliedVoucher(null)}
              onProceedCheckout={() => setShowCheckoutModal(true)}
            />
          </div>
        )}
      </div>

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        selectedItems={selectedItems}
        grandTotal={grandTotal}
        onCheckoutSuccess={() => {
          setItems([]);
        }}
        showToast={showToast}
      />
    </div>
  );
}
