import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  Tag,
  CheckCircle2,
  QrCode,
  Wallet,
  CreditCard,
  ChevronRight,
  Check,
  MapPin,
  Edit2,
} from 'lucide-react';
import {
  getCartItems,
  updateCartQty,
  removeFromCart,
  toggleSelectItem,
  toggleSelectAll,
  clearCart,
  type CartItem,
} from '../../services/cart';
import { getStoredUser } from '../../services/auth';
import Popup from '../../components/Popup';

export interface DeliveryAddress {
  recipientName: string;
  phone: string;
  city: string;
  district: string;
  ward: string;
  street: string;
}

const DEFAULT_ADDRESS_KEY = 'nexus:delivery-address';

function getStoredAddress(): DeliveryAddress {
  try {
    const raw = localStorage.getItem(DEFAULT_ADDRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.recipientName === 'string') return parsed;
    }
  } catch {
    // fallback
  }
  const user = getStoredUser();
  return {
    recipientName: user?.fullName || 'Đinh Tú Liên',
    phone: '0909123456',
    city: 'TP. Hồ Chí Minh',
    district: 'Quận Bình Thạnh',
    ward: 'Phường 22',
    street: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ',
  };
}

export default function CartPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(() => getCartItems());
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(
    null,
  );
  const [voucherError, setVoucherError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Address State
  const [address, setAddress] = useState<DeliveryAddress>(getStoredAddress);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editForm, setEditForm] = useState<DeliveryAddress>(address);
  const [addressError, setAddressError] = useState('');

  // Checkout modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'WALLET' | 'STRIPE'>('PAYOS');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

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
  const selectedQuantity = selectedItems.reduce((sum, i) => sum + i.qty, 0);
  const rawSubtotal = selectedItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const grandTotal = Math.max(0, rawSubtotal - discountAmount);
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    setVoucherError('');

    if (!code) {
      setVoucherError('Vui lòng nhập mã giảm giá.');
      return;
    }

    if (code === 'NEXUS500K') {
      setAppliedVoucher({ code: 'NEXUS500K', discount: 500000 });
      showToast('Áp dụng mã NEXUS500K giảm 500.000đ thành công!');
    } else if (code === 'FREESHIP') {
      setAppliedVoucher({ code: 'FREESHIP', discount: 150000 });
      showToast('Áp dụng mã FREESHIP miễn phí vận chuyển thành công!');
    } else {
      setVoucherError('Mã ưu đãi không hợp lệ hoặc đã hết hạn.');
    }
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.recipientName.trim() || !editForm.phone.trim() || !editForm.street.trim()) {
      setAddressError('Vui lòng điền họ tên, số điện thoại và địa chỉ cụ thể.');
      return;
    }
    setAddress(editForm);
    localStorage.setItem(DEFAULT_ADDRESS_KEY, JSON.stringify(editForm));
    setIsEditingAddress(false);
    showToast('Đã lưu và cập nhật địa chỉ giao hàng thành công!');
  };

  const handleConfirmCheckout = () => {
    setIsProcessingOrder(true);
    setTimeout(() => {
      setIsProcessingOrder(false);
      setCheckoutSuccess(true);
      clearCart();
    }, 1500);
  };

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
        {/* Navigation Bar & Back Button */}
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
            {/* Left Column: Cart Items Table (8 Cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Table header bar */}
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

              {/* Items List */}
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition"
                  >
                    {/* Checkbox & Product Info */}
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

                    {/* Price, Quantity, Subtotal, Delete */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Unit Price */}
                      <div className="w-24 text-right text-xs font-semibold text-slate-700">
                        {Number(item.price).toLocaleString('vi-VN')} ₫
                      </div>

                      {/* Quantity Selector */}
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

                      {/* Line Subtotal */}
                      <div className="w-28 text-right text-sm font-extrabold text-[#f24e1e]">
                        {Number(item.price * item.qty).toLocaleString('vi-VN')} ₫
                      </div>

                      {/* Remove Button */}
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

              {/* Security Escrow Callout */}
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

            {/* Right Column: Order Summary (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Voucher Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Tag size={15} className="text-[#f24e1e]" />
                  Mã Ưu Đãi / Voucher Sàn
                </h3>

                <form onSubmit={handleApplyVoucher} className="flex gap-2 mb-2">
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
                      onClick={() => setAppliedVoucher(null)}
                      className="text-slate-400 hover:text-red-500 font-bold ml-2"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Price Calculation Card */}
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
                    <span className="font-semibold text-emerald-600">MIỄN PHÍ</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">Tổng thanh toán:</span>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-[#f24e1e]">
                      {Number(grandTotal).toLocaleString('vi-VN')} ₫
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      (Đã bao gồm VAT & Ký quỹ Escrow)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={selectedItems.length === 0}
                  onClick={() => setShowCheckoutModal(true)}
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
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <Popup
        isOpen={showCheckoutModal}
        onClose={() => {
          if (!isProcessingOrder) setShowCheckoutModal(false);
        }}
        title="Xác Nhận Đặt Hàng & Ký Quỹ Escrow"
      >
        {checkoutSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Đặt Hàng & Ký Quỹ Thành Công!</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Mã giao dịch ký quỹ PayOS đã được tạo. Số tiền{' '}
              <strong>{Number(grandTotal).toLocaleString('vi-VN')} ₫</strong> được giữ bảo chứng an
              toàn.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left max-w-md mx-auto">
              <span className="font-bold text-slate-800 text-xs block mb-1">
                Địa chỉ nhận hàng (GHN Express):
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                <strong>{address.recipientName}</strong> • {address.phone} • {address.street},{' '}
                {address.ward}, {address.district}, {address.city}
              </p>
            </div>
            <div className="pt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCheckoutModal(false);
                  setCheckoutSuccess(false);
                  navigate('/search');
                }}
                className="px-6 py-2.5 rounded-xl bg-[#f24e1e] text-white font-bold text-xs hover:bg-[#d63b0e] transition shadow"
              >
                Tiếp tục mua sắm
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-xs text-slate-700">
            {/* Address */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <MapPin size={15} className="text-[#f24e1e]" />
                  Địa chỉ nhận hàng (GHN Express):
                </span>
                {!isEditingAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditForm(address);
                      setAddressError('');
                      setIsEditingAddress(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                  >
                    <Edit2 size={13} />
                    Chỉnh sửa
                  </button>
                )}
              </div>

              {isEditingAddress ? (
                <form
                  onSubmit={handleSaveAddress}
                  className="space-y-3 pt-2.5 border-t border-slate-200 mt-2"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Họ và tên người nhận *
                      </label>
                      <input
                        type="text"
                        value={editForm.recipientName}
                        onChange={(e) =>
                          setEditForm({ ...editForm, recipientName: e.target.value })
                        }
                        placeholder="Nguyễn Văn A"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Số điện thoại liên hệ *
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="0901234567"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tỉnh / Thành phố *
                      </label>
                      <select
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                      >
                        <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                        <option value="Hà Nội">Hà Nội</option>
                        <option value="Đà Nẵng">Đà Nẵng</option>
                        <option value="Hải Phòng">Hải Phòng</option>
                        <option value="Cần Thơ">Cần Thơ</option>
                        <option value="Bình Dương">Bình Dương</option>
                        <option value="Đồng Nai">Đồng Nai</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Quận / Huyện *
                      </label>
                      <input
                        type="text"
                        value={editForm.district}
                        onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                        placeholder="Quận / Huyện"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Phường / Xã *
                      </label>
                      <input
                        type="text"
                        value={editForm.ward}
                        onChange={(e) => setEditForm({ ...editForm, ward: e.target.value })}
                        placeholder="Phường / Xã"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Địa chỉ cụ thể (Số nhà, tên đường, tòa nhà) *
                    </label>
                    <input
                      type="text"
                      value={editForm.street}
                      onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                      placeholder="Số nhà, tên đường, số căn hộ/tòa nhà..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                      required
                    />
                  </div>

                  {addressError && (
                    <p className="text-[11px] text-red-500 font-medium">{addressError}</p>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-[#f24e1e] hover:bg-[#d63b0e] transition shadow-sm cursor-pointer"
                    >
                      Lưu Địa Chỉ
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-slate-700 space-y-0.5">
                  <p className="font-bold text-slate-900 text-xs">
                    {address.recipientName} •{' '}
                    <span className="font-semibold text-slate-700">{address.phone}</span>
                  </p>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {address.street}, {address.ward}, {address.district}, {address.city}
                  </p>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <span className="font-bold text-slate-800 block mb-2">
                Phương thức thanh toán bảo chứng:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'PAYOS' as const,
                    name: 'PayOS VietQR',
                    icon: QrCode,
                    desc: 'Quét mã ngân hàng 24/7',
                  },
                  {
                    id: 'WALLET' as const,
                    name: 'Ví NEXUS Pay',
                    icon: Wallet,
                    desc: 'Trừ trực tiếp số dư ví',
                  },
                  {
                    id: 'STRIPE' as const,
                    name: 'Thẻ Quốc Tế',
                    icon: CreditCard,
                    desc: 'Visa / Mastercard',
                  },
                ].map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        paymentMethod === pm.id
                          ? 'border-[#f24e1e] bg-orange-50 text-slate-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon
                          size={16}
                          className={paymentMethod === pm.id ? 'text-[#f24e1e]' : 'text-slate-500'}
                        />
                        <span className="font-bold text-xs">{pm.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">{pm.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Items Preview */}
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-3 bg-white">
              {selectedItems.map((item) => (
                <div key={item.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-8 h-8 rounded object-contain border border-slate-100"
                    />
                    <span className="font-semibold text-slate-800 truncate">{item.name}</span>
                    <span className="text-slate-400 shrink-0">x{item.qty}</span>
                  </div>
                  <span className="font-bold text-[#f24e1e] ml-3 shrink-0">
                    {Number(item.price * item.qty).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-900">Tổng thanh toán ký quỹ:</span>
              <span className="text-xl font-extrabold text-[#f24e1e]">
                {Number(grandTotal).toLocaleString('vi-VN')} ₫
              </span>
            </div>

            {/* Submit */}
            <button
              type="button"
              disabled={isProcessingOrder}
              onClick={handleConfirmCheckout}
              className="w-full py-3.5 rounded-xl bg-[#f24e1e] hover:bg-[#d63b0e] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessingOrder ? 'Đang tạo giao dịch ký quỹ...' : 'Xác Nhận Thanh Toán Ký Quỹ'}
            </button>
          </div>
        )}
      </Popup>
    </div>
  );
}
