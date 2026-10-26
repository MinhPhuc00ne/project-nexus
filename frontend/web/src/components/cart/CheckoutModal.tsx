import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '../Popup';
import { clearCart, type CartItem } from '../../services/cart';
import { getStoredUser, getStoredToken } from '../../services/auth';
import { getAddresses, createAddress } from '../../services/address';
import { checkoutApi, type PayosPaymentInfo, type BuyerOrder } from '../../services/orders';
import {
  CheckCircle2,
  MapPin,
  Edit2,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Copy,
  Loader2,
  ShoppingBag,
  Truck,
} from 'lucide-react';

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
    // Storage read fallback
  }
  const user = getStoredUser();
  return {
    recipientName: user?.fullName || 'Khách hàng',
    phone: '',
    city: 'TP. Hồ Chí Minh',
    district: '',
    ward: '',
    street: '',
  };
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: CartItem[];
  grandTotal: number;
  onCheckoutSuccess?: () => void;
  showToast: (msg: string) => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  selectedItems,
  grandTotal,
  onCheckoutSuccess,
  showToast,
}: CheckoutModalProps) {
  const navigate = useNavigate();
  const [address, setAddress] = useState<DeliveryAddress>(getStoredAddress);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editForm, setEditForm] = useState<DeliveryAddress>(address);
  const [addressError, setAddressError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'WALLET' | 'STRIPE'>('PAYOS');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [payosPayment, setPayosPayment] = useState<PayosPaymentInfo | null>(null);
  const [createdOrders, setCreatedOrders] = useState<BuyerOrder[]>([]);

  useEffect(() => {
    if (!isOpen || !getStoredToken()) return;
    getAddresses()
      .then((list) => {
        if (list && list.length > 0) {
          const defaultAddr = list.find((a) => a.isDefault) || list[0];
          const loaded: DeliveryAddress = {
            recipientName: defaultAddr.recipientName,
            phone: defaultAddr.phone,
            city: defaultAddr.city,
            district: defaultAddr.district || '',
            ward: defaultAddr.ward || '',
            street: defaultAddr.street,
          };
          setAddress(loaded);
          setEditForm(loaded);
          setIsEditingAddress(false);
        } else {
          // Sổ địa chỉ chưa có -> bắt buộc mở form nhập
          const emptyAddr: DeliveryAddress = {
            recipientName: '',
            phone: '',
            city: 'TP. Hồ Chí Minh',
            district: '',
            ward: '',
            street: '',
          };
          setAddress(emptyAddr);
          setEditForm(emptyAddr);
          setIsEditingAddress(true);
        }
      })
      .catch(() => {
        setIsEditingAddress(true);
      });
  }, [isOpen]);

  const handleSaveAddress = async (e: FormEvent) => {
    e.preventDefault();
    if (!editForm.recipientName.trim() || !editForm.phone.trim() || !editForm.street.trim()) {
      setAddressError('Vui lòng điền họ tên, số điện thoại và địa chỉ cụ thể.');
      return;
    }
    setAddress(editForm);
    localStorage.setItem(DEFAULT_ADDRESS_KEY, JSON.stringify(editForm));
    setIsEditingAddress(false);
    showToast('Đã lưu và cập nhật địa chỉ giao hàng thành công!');
    try {
      await createAddress({
        recipientName: editForm.recipientName.trim(),
        phone: editForm.phone.trim(),
        city: editForm.city.trim(),
        district: editForm.district.trim(),
        ward: editForm.ward.trim(),
        street: editForm.street.trim(),
        isDefault: true,
      });
    } catch {
      // ignore
    }
  };

  const handleConfirmCheckout = async () => {
    if (!address.recipientName.trim() || !address.phone.trim() || !address.street.trim()) {
      showToast('Vui lòng cung cấp đầy đủ thông tin địa chỉ giao hàng.');
      setIsEditingAddress(true);
      return;
    }

    setIsProcessingOrder(true);
    try {
      const res = await checkoutApi({
        shippingAddress: {
          recipientName: address.recipientName.trim(),
          phone: address.phone.trim(),
          city: address.city.trim(),
          district: address.district ? address.district.trim() : undefined,
          ward: address.ward ? address.ward.trim() : undefined,
          street: address.street.trim(),
        },
        itemIds: selectedItems.map((i) => String(i.id)),
        paymentMethod,
        returnUrl: `${window.location.origin}/buyer/orders?paid=true`,
        cancelUrl: `${window.location.origin}/buyer/orders?cancel=true`,
      });

      setCreatedOrders(res.orders || []);
      setPayosPayment(res.payosPayment);
      setCheckoutSuccess(true);
      await clearCart();
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
      showToast('Đặt hàng thành công!');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Đặt hàng thất bại. Vui lòng kiểm tra lại giỏ hàng.';
      showToast(message);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleClose = () => {
    if (!isProcessingOrder) {
      if (checkoutSuccess) {
        setCheckoutSuccess(false);
        setPayosPayment(null);
        setCreatedOrders([]);
      }
      onClose();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}!`);
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={handleClose}
      title="Xác Nhận Đặt Hàng & Thanh Toán Ký Quỹ"
      size="lg"
    >
      {checkoutSuccess ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Đặt Hàng Thành Công!</h3>
            <p className="text-xs text-slate-500 mt-1">
              {createdOrders.length > 0
                ? `Mã đơn hàng: ${createdOrders.map((o) => o.orderNumber).join(', ')}`
                : 'Đơn hàng của bạn đã được ghi nhận trên hệ thống.'}
            </p>
          </div>

          {/* PayOS VietQR Payment Box */}
          {payosPayment ? (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 max-w-lg mx-auto text-left shadow-xl border border-indigo-900/50">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <QrCode className="text-emerald-400" size={20} />
                  <span className="font-bold text-sm text-white">Thanh Toán PayOS VietQR 24/7</span>
                </div>
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Tự Động Xác Nhận
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* QR Display */}
                <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center">
                  {payosPayment.qrCode ? (
                    payosPayment.qrCode.startsWith('http') ||
                    payosPayment.qrCode.startsWith('data:') ? (
                      <img
                        src={payosPayment.qrCode}
                        alt="PayOS VietQR"
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <img
                        src={`https://api.vietqr.io/image/${payosPayment.bin}-${payosPayment.accountNumber}-compact.png?amount=${payosPayment.amount}&addInfo=${encodeURIComponent(
                          payosPayment.description || '',
                        )}&accountName=${encodeURIComponent(payosPayment.accountName || '')}`}
                        alt="PayOS VietQR"
                        className="w-44 h-44 object-contain"
                      />
                    )
                  ) : (
                    <div className="w-44 h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <QrCode size={40} className="mb-2 text-slate-300" />
                      <span>Quét mã qua link PayOS</span>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 mt-1 font-semibold">
                    Quét bằng App Ngân Hàng
                  </span>
                </div>

                {/* Account Details */}
                <div className="space-y-2.5 text-xs">
                  {payosPayment.accountName && (
                    <div>
                      <span className="text-slate-400 text-[11px] block">Chủ tài khoản:</span>
                      <strong className="text-white text-xs">{payosPayment.accountName}</strong>
                    </div>
                  )}
                  {payosPayment.accountNumber && (
                    <div>
                      <span className="text-slate-400 text-[11px] block">Số tài khoản:</span>
                      <div className="flex items-center gap-2">
                        <strong className="text-emerald-400 font-mono text-sm tracking-wider">
                          {payosPayment.accountNumber}
                        </strong>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(payosPayment.accountNumber!, 'Số tài khoản')
                          }
                          className="text-slate-400 hover:text-white transition"
                          title="Sao chép"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 text-[11px] block">Số tiền thanh toán:</span>
                    <strong className="text-amber-400 text-sm font-extrabold">
                      {Number(payosPayment.amount).toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>
                  {payosPayment.description && (
                    <div>
                      <span className="text-slate-400 text-[11px] block">
                        Nội dung chuyển khoản:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 font-mono bg-white/10 px-2 py-0.5 rounded text-[11px] break-all">
                          {payosPayment.description}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(payosPayment.description!, 'Nội dung chuyển tiền')
                          }
                          className="text-slate-400 hover:text-white transition"
                          title="Sao chép"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PayOS Button */}
              {payosPayment.checkoutUrl && (
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-300">
                    Hoặc mở trang thanh toán trực tiếp:
                  </span>
                  <a
                    href={payosPayment.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
                  >
                    <span>Mở Cổng PayOS</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left max-w-md mx-auto text-xs">
              <span className="font-bold text-slate-800 block mb-1">
                Phương thức: {paymentMethod === 'WALLET' ? 'Ví NEXUS Pay' : 'PayOS'}
              </span>
              <p className="text-slate-600 leading-relaxed">
                Đơn hàng đã được lưu và đang chờ người bán xác nhận đóng gói chuyển giao hàng.
              </p>
            </div>
          )}

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                handleClose();
                navigate('/buyer/orders');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow cursor-pointer flex items-center gap-1.5"
            >
              <ShoppingBag size={14} />
              <span>Xem Đơn Hàng Của Tôi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleClose();
                navigate('/search');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 text-xs text-slate-700">
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
                      onChange={(e) => setEditForm({ ...editForm, recipientName: e.target.value })}
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
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      placeholder="TP. Hồ Chí Minh"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Quận / Huyện
                    </label>
                    <input
                      type="text"
                      value={editForm.district}
                      onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                      placeholder="Quận 1"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Phường / Xã
                    </label>
                    <input
                      type="text"
                      value={editForm.ward}
                      onChange={(e) => setEditForm({ ...editForm, ward: e.target.value })}
                      placeholder="Phường Bến Nghé"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Địa chỉ cụ thể (Số nhà, tên đường, số căn hộ) *
                  </label>
                  <input
                    type="text"
                    value={editForm.street}
                    onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                    placeholder="Số 123 Đường Lê Lợi..."
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#f24e1e]"
                    required
                  />
                </div>

                {addressError && (
                  <p className="text-[11px] text-red-500 font-medium">{addressError}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  {address.recipientName.trim() && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                  )}
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
                  <span className="font-semibold text-slate-700">
                    {address.phone || 'Chưa có số ĐT'}
                  </span>
                </p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {[address.street, address.ward, address.district, address.city]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}
          </div>

          <div>
            <span className="font-bold text-slate-800 block mb-2">Phương thức thanh toán:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Lựa chọn 1: Thanh toán ngay */}
              <button
                type="button"
                onClick={() => setPaymentMethod('PAYOS')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative ${
                  paymentMethod === 'PAYOS'
                    ? 'border-[#f24e1e] bg-orange-50/70 text-slate-900 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <QrCode size={16} className="text-[#f24e1e]" />
                    <span className="font-bold text-xs text-slate-900">1. Thanh toán ngay</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#f24e1e]/10 text-[#f24e1e]">
                    PayOS VietQR
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Quét mã QR qua app ngân hàng 24/7, xác nhận tức thì và tạm giữ ký quỹ Escrow bảo
                  vệ người mua.
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
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-slate-500" />
                    <span className="font-bold text-xs text-slate-700">
                      2. Thanh toán sau khi nhận hàng
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    COD (Sắp ra mắt)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Nhận hàng và thanh toán tiền mặt. Sẽ được áp dụng sau khi hoàn tất đối soát GHN.
                </p>
              </button>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl p-3 bg-white">
            {selectedItems.map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-8 h-8 rounded object-contain border border-slate-100"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-800 text-xs block truncate">
                      {item.name}
                    </span>
                    {item.shopName && (
                      <span className="text-[10px] text-indigo-600 font-bold block">
                        Shop: {item.shopName}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 shrink-0 text-xs">x{item.qty}</span>
                </div>
                <span className="font-bold text-[#f24e1e] ml-3 shrink-0 text-xs">
                  {Number(item.price * item.qty).toLocaleString('vi-VN')} ₫
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-2 text-indigo-900 text-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Tiền được tạm giữ an toàn tại NEXUS Escrow cho tới khi bạn nhận và kiểm tra hàng.
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-900">Tổng thanh toán ký quỹ:</span>
            <span className="text-xl font-extrabold text-[#f24e1e]">
              {Number(grandTotal).toLocaleString('vi-VN')} ₫
            </span>
          </div>

          <button
            type="button"
            disabled={isProcessingOrder}
            onClick={handleConfirmCheckout}
            className="w-full py-3.5 rounded-xl bg-[#f24e1e] hover:bg-[#d63b0e] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessingOrder ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang xử lý đặt hàng & khởi tạo PayOS...</span>
              </>
            ) : (
              'Xác Nhận Đặt Hàng & Thanh Toán'
            )}
          </button>
        </div>
      )}
    </Popup>
  );
}
