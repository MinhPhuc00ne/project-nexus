import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  getCartItems,
  fetchCart,
  updateCartQty,
  removeFromCart,
  toggleSelectItem,
  toggleSelectAll,
  type CartItem,
} from '../../services/cart';
import CheckoutModal, { type DeliveryAddress } from '../../components/cart/CheckoutModal';
import CartOrderSummary from '../../components/cart/CartOrderSummary';
import CartItemList from '../../components/cart/CartItemList';
import { getStoredToken } from '../../services/auth';

export type { DeliveryAddress };

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  const [loading, setLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handleCartSync = () => setItems(getCartItems());
    window.addEventListener('nexus:cart-change', handleCartSync);
    window.addEventListener('storage', handleCartSync);

    const loadData = async () => {
      setLoading(true);
      try {
        const fetched = await fetchCart();
        if (isMounted) setItems(fetched);
      } catch (err) {
        console.error('Lỗi tải giỏ hàng:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void loadData();

    return () => {
      isMounted = false;
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

  const handleUpdateQty = async (id: string | number, qty: number) => {
    try {
      await updateCartQty(id, qty);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể cập nhật số lượng.');
    }
  };

  const handleRemove = async (id: string | number) => {
    try {
      await removeFromCart(id);
      showToast('Đã xóa sản phẩm khỏi giỏ hàng.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể xóa sản phẩm.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
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
          {loading && <Loader2 size={18} className="animate-spin text-slate-400 ml-2" />}
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
            <CartItemList
              items={items}
              isAllSelected={isAllSelected}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelectItem={toggleSelectItem}
              onUpdateQty={handleUpdateQty}
              onRemoveItem={handleRemove}
            />

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
              onProceedCheckout={() => {
                if (!getStoredToken()) {
                  navigate('/login', { state: { from: '/cart' } });
                  return;
                }
                const hasOutOfStock = selectedItems.some((i) => i.isOutOfStock);
                if (hasOutOfStock) {
                  showToast('Vui lòng bỏ chọn sản phẩm đã hết hàng trước khi thanh toán.');
                  return;
                }
                const hasInsufficient = selectedItems.some((i) => i.isStockInsufficient);
                if (hasInsufficient) {
                  showToast('Một số sản phẩm vượt quá tồn kho khả dụng. Vui lòng giảm số lượng.');
                  return;
                }
                setShowCheckoutModal(true);
              }}
            />
          </div>
        )}
      </div>

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        selectedItems={selectedItems}
        grandTotal={grandTotal}
        onCheckoutSuccess={() => setItems([])}
        showToast={showToast}
      />
    </div>
  );
}
