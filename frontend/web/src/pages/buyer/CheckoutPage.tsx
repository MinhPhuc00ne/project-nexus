import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Edit2,
  CheckCircle2,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Copy,
  Loader2,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  Package,
  Truck,
} from 'lucide-react';
import { fetchCart, clearCart, type CartItem } from '../../services/cart';
import { getAddresses, createAddress, type UserAddress } from '../../services/address';
import { checkoutApi, type PayosPaymentInfo, type BuyerOrder } from '../../services/orders';
import { getStoredToken } from '../../services/auth';

export default function CheckoutPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);

  // Address State
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customAddress, setCustomAddress] = useState({
    recipientName: '',
    phone: '',
    city: 'TP. Hồ Chí Minh',
    district: '',
    ward: '',
    street: '',
  });
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'WALLET' | 'STRIPE'>('PAYOS');

  // Checkout State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [payosPayment, setPayosPayment] = useState<PayosPaymentInfo | null>(null);
  const [createdOrders, setCreatedOrders] = useState<BuyerOrder[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      setLoadingCart(true);
      try {
        const cart = await fetchCart();
        const selected = cart.filter((i) => i.selected);
        if (isMounted) {
          setItems(selected.length > 0 ? selected : cart);
        }

        const addrList = await getAddresses();
        if (isMounted && addrList && addrList.length > 0) {
          setAddresses(addrList);
          const def = addrList.find((a) => a.isDefault) || addrList[0];
          setSelectedAddressId(def.id);
          setIsEditingCustom(false);
        } else {
          // Chưa có địa chỉ trong sổ địa chỉ -> Bắt buộc mở form nhập
          setIsEditingCustom(true);
        }
      } catch (err) {
        console.warn('Lỗi tải dữ liệu thanh toán:', err);
        setIsEditingCustom(true);
      } finally {
        if (isMounted) setLoadingCart(false);
      }
    };

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const activeAddress = addresses.find((a) => a.id === selectedAddressId);
  const currentAddress = activeAddress
    ? {
        recipientName: activeAddress.recipientName,
        phone: activeAddress.phone,
        city: activeAddress.city,
        district: activeAddress.district || '',
        ward: activeAddress.ward || '',
        street: activeAddress.street,
      }
    : customAddress;

  const rawSubtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shippingFee = items.length > 0 ? 30000 : 0;
  const grandTotal = rawSubtotal + shippingFee;

  const handleCustomAddressSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !customAddress.recipientName.trim() ||
      !customAddress.phone.trim() ||
      !customAddress.street.trim()
    ) {
      showToast('Vui lòng điền đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
      return;
    }
    setIsEditingCustom(false);
    showToast('Đã lưu và cập nhật địa chỉ giao hàng.');
    try {
      const created = await createAddress({
        recipientName: customAddress.recipientName.trim(),
        phone: customAddress.phone.trim(),
        city: customAddress.city.trim(),
        district: customAddress.district.trim(),
        ward: customAddress.ward.trim(),
        street: customAddress.street.trim(),
        isDefault: true,
      });
      if (created) {
        setAddresses((prev) => [created, ...prev]);
        setSelectedAddressId(created.id);
      }
    } catch {
      // ignore
    }
  };

  const handleCheckout = async () => {
    if (
      !currentAddress.recipientName.trim() ||
      !currentAddress.phone.trim() ||
      !currentAddress.street.trim()
    ) {
      showToast('Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng.');
      setIsEditingCustom(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await checkoutApi({
        shippingAddress: {
          recipientName: currentAddress.recipientName.trim(),
          phone: currentAddress.phone.trim(),
          city: currentAddress.city.trim(),
          district: currentAddress.district ? currentAddress.district.trim() : undefined,
          ward: currentAddress.ward ? currentAddress.ward.trim() : undefined,
          street: currentAddress.street.trim(),
        },
        itemIds: items.map((i) => String(i.id)),
        shippingFee,
        paymentMethod,
        returnUrl: `${window.location.origin}/buyer/orders?paid=true`,
        cancelUrl: `${window.location.origin}/buyer/orders?cancel=true`,
      });

      setCreatedOrders(res.orders || []);
      setPayosPayment(res.payosPayment);
      setCheckoutDone(true);
      await clearCart();
      showToast('Đặt hàng thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đặt hàng thất bại. Vui lòng kiểm tra lại.';
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}!`);
  };

  if (loadingCart) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-semibold">Đang chuẩn bị thông tin thanh toán...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link to="/" className="hover:text-blue-600 transition">
            Trang chủ
          </Link>
          <ChevronRight size={13} />
          <Link to="/cart" className="hover:text-blue-600 transition">
            Giỏ hàng
          </Link>
          <ChevronRight size={13} />
          <span className="font-semibold text-slate-800">Thanh toán đơn hàng</span>
        </div>

        {checkoutDone ? (
          /* RESULT AFTER CHECKOUT */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-2xl mx-auto text-center shadow-sm space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Đặt Hàng Thành Công!</h1>
              <p className="text-xs text-slate-500 mt-1">
                {createdOrders.length > 0
                  ? `Mã đơn hàng: ${createdOrders.map((o) => o.orderNumber).join(', ')}`
                  : 'Đơn hàng của bạn đã được tiếp nhận và bảo chứng bởi NEXUS Escrow.'}
              </p>
            </div>

            {/* PayOS VietQR Details */}
            {payosPayment ? (
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 text-left shadow-lg border border-indigo-900/50">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="text-emerald-400" size={22} />
                    <span className="font-bold text-sm text-white">
                      Thanh Toán PayOS VietQR 24/7
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Tự Động Kích Hoạt
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center shadow">
                    {payosPayment.qrCode ? (
                      payosPayment.qrCode.startsWith('http') ||
                      payosPayment.qrCode.startsWith('data:') ? (
                        <img
                          src={payosPayment.qrCode}
                          alt="PayOS VietQR"
                          className="w-48 h-48 object-contain"
                        />
                      ) : (
                        <img
                          src={`https://api.vietqr.io/image/${payosPayment.bin}-${payosPayment.accountNumber}-compact.png?amount=${payosPayment.amount}&addInfo=${encodeURIComponent(
                            payosPayment.description || '',
                          )}&accountName=${encodeURIComponent(payosPayment.accountName || '')}`}
                          alt="PayOS VietQR"
                          className="w-48 h-48 object-contain"
                        />
                      )
                    ) : (
                      <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                        <QrCode size={48} className="mb-2 text-slate-300" />
                        <span>Quét mã qua link PayOS</span>
                      </div>
                    )}
                    <span className="text-[11px] text-slate-500 mt-2 font-semibold">
                      Mở app ngân hàng để quét mã
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {payosPayment.accountName && (
                      <div>
                        <span className="text-slate-400 text-[11px] block">Người thụ hưởng:</span>
                        <strong className="text-white text-sm">{payosPayment.accountName}</strong>
                      </div>
                    )}
                    {payosPayment.accountNumber && (
                      <div>
                        <span className="text-slate-400 text-[11px] block">Số tài khoản:</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-emerald-400 font-mono text-base tracking-wider">
                            {payosPayment.accountNumber}
                          </strong>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(payosPayment.accountNumber!, 'Số tài khoản')
                            }
                            className="text-slate-400 hover:text-white transition"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 text-[11px] block">
                        Số tiền cần thanh toán:
                      </span>
                      <strong className="text-amber-400 text-base font-extrabold">
                        {Number(payosPayment.amount).toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                    {payosPayment.description && (
                      <div>
                        <span className="text-slate-400 text-[11px] block">
                          Nội dung chuyển khoản:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200 font-mono bg-white/10 px-2 py-0.5 rounded text-xs break-all">
                            {payosPayment.description}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(payosPayment.description!, 'Nội dung chuyển tiền')
                            }
                            className="text-slate-400 hover:text-white transition"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {payosPayment.checkoutUrl && (
                  <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-300">
                      Hoặc mở trang thanh toán chính thức:
                    </span>
                    <a
                      href={payosPayment.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                    >
                      <span>Mở Cổng PayOS</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs leading-relaxed">
                Đơn hàng đã được lưu trữ trong danh sách đơn mua. Bạn có thể theo dõi trạng thái
                giao hàng bất kỳ lúc nào.
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/buyer/orders"
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow flex items-center gap-1.5"
              >
                <ShoppingBag size={14} />
                <span>Xem Đơn Hàng Của Tôi</span>
              </Link>
              <Link
                to="/search"
                className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          /* EMPTY CHECKOUT */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-sm">
            <Package size={40} className="text-slate-300 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              Không có sản phẩm nào để thanh toán
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Vui lòng quay lại giỏ hàng và chọn các sản phẩm bạn muốn đặt mua.
            </p>
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
            >
              <ArrowLeft size={14} />
              <span>Quay lại giỏ hàng</span>
            </Link>
          </div>
        ) : (
          /* MAIN CHECKOUT FORM (2 COLUMNS) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Address & Payment Methods */}
            <div className="lg:col-span-7 space-y-6">
              {/* Delivery Address Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="text-[#f24e1e]" size={18} />
                    <span>Địa chỉ nhận hàng (GHN Express)</span>
                  </h2>
                  {!isEditingCustom && (
                    <button
                      type="button"
                      onClick={() => setIsEditingCustom(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
                    >
                      <Edit2 size={13} />
                      <span>{addresses.length > 0 ? 'Thay đổi địa chỉ' : 'Sửa địa chỉ'}</span>
                    </button>
                  )}
                </div>

                {isEditingCustom ? (
                  <form
                    onSubmit={handleCustomAddressSubmit}
                    className="space-y-3 pt-2 border-t border-slate-100"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Họ và tên người nhận *
                        </label>
                        <input
                          type="text"
                          required
                          value={customAddress.recipientName}
                          onChange={(e) =>
                            setCustomAddress({ ...customAddress, recipientName: e.target.value })
                          }
                          placeholder="Nguyễn Văn A"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Số điện thoại liên hệ *
                        </label>
                        <input
                          type="tel"
                          required
                          value={customAddress.phone}
                          onChange={(e) =>
                            setCustomAddress({ ...customAddress, phone: e.target.value })
                          }
                          placeholder="0901234567"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Tỉnh / Thành phố *
                        </label>
                        <input
                          type="text"
                          required
                          value={customAddress.city}
                          onChange={(e) =>
                            setCustomAddress({ ...customAddress, city: e.target.value })
                          }
                          placeholder="TP. Hồ Chí Minh"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Quận / Huyện
                        </label>
                        <input
                          type="text"
                          value={customAddress.district}
                          onChange={(e) =>
                            setCustomAddress({ ...customAddress, district: e.target.value })
                          }
                          placeholder="Quận 1"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Phường / Xã
                        </label>
                        <input
                          type="text"
                          value={customAddress.ward}
                          onChange={(e) =>
                            setCustomAddress({ ...customAddress, ward: e.target.value })
                          }
                          placeholder="Phường Bến Nghé"
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Địa chỉ cụ thể (Số nhà, tên đường, số căn hộ) *
                      </label>
                      <input
                        type="text"
                        required
                        value={customAddress.street}
                        onChange={(e) =>
                          setCustomAddress({ ...customAddress, street: e.target.value })
                        }
                        placeholder="Số 123 Đường Lê Lợi..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingCustom(false)}
                        className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition"
                      >
                        Lưu Địa Chỉ
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {addresses.length > 0 && (
                      <div className="space-y-2">
                        {addresses.map((a) => (
                          <label
                            key={a.id}
                            className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                              selectedAddressId === a.id
                                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="shippingAddress"
                              checked={selectedAddressId === a.id}
                              onChange={() => setSelectedAddressId(a.id)}
                              className="mt-0.5 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="text-xs">
                              <span className="font-bold text-slate-900">
                                {a.recipientName} • {a.phone}
                              </span>
                              {a.isDefault && (
                                <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                  Mặc định
                                </span>
                              )}
                              <p className="text-slate-600 mt-0.5">
                                {[a.street, a.ward, a.district, a.city].filter(Boolean).join(', ')}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {addresses.length === 0 && (
                      <div className="text-xs text-slate-600 space-y-1">
                        <p className="font-bold text-slate-900">
                          {currentAddress.recipientName || 'Chưa có thông tin người nhận'} •{' '}
                          {currentAddress.phone}
                        </p>
                        <p>
                          {[
                            currentAddress.street,
                            currentAddress.ward,
                            currentAddress.district,
                            currentAddress.city,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900 mb-3">Phương thức thanh toán</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Lựa chọn 1: Thanh toán ngay */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAYOS')}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative ${
                      paymentMethod === 'PAYOS'
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <QrCode size={18} className="text-blue-600" />
                        <span className="font-bold text-xs text-slate-900">1. Thanh toán ngay</span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        PayOS VietQR
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Quét mã QR qua app ngân hàng 24/7, tự động đối soát và tạm giữ bảo đảm tại
                      NEXUS Escrow.
                    </p>
                  </button>

                  {/* Lựa chọn 2: Thanh toán sau khi nhận hàng */}
                  <button
                    type="button"
                    onClick={() => {
                      showToast(
                        'Hiện tại sàn chỉ hỗ trợ Thanh toán ngay qua PayOS để bảo đảm ký quỹ Escrow.',
                      );
                    }}
                    className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-left transition cursor-pointer hover:bg-slate-100/70 opacity-80"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Truck size={18} className="text-slate-500" />
                        <span className="font-bold text-xs text-slate-700">
                          2. Thanh toán sau khi nhận hàng
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        COD (Sắp ra mắt)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Nhận hàng và thanh toán tiền mặt cho shipper. Đang tích hợp trong đợt cập nhật
                      tiếp theo.
                    </p>
                  </button>
                </div>
              </div>

              {/* Escrow Guarantee Banner */}
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-3 text-xs text-indigo-900">
                <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-0.5">Bảo chứng Ký quỹ NEXUS Escrow</h4>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    Khoản thanh toán được ký quỹ an toàn. Người bán chỉ được giải ngân sau khi bạn
                    đã nhận hàng, kiểm định đồng hồ và hài lòng với chất lượng.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Order Summary & Place Order */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                  Danh sách sản phẩm thanh toán ({items.length})
                </h3>

                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto mb-4">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={it.img}
                          alt={it.name}
                          className="w-12 h-12 object-contain rounded-lg border border-slate-100 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-900 line-clamp-1">{it.name}</span>
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
                  ))}
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
                  onClick={handleCheckout}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
