import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Popup from '../Popup';
import { clearCart, type CartItem } from '../../services/cart';
import { getStoredUser, getStoredToken } from '../../services/auth';
import { getAddresses } from '../../services/address';
import { CheckCircle2, MapPin, Edit2, QrCode, Wallet, CreditCard } from 'lucide-react';

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
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSaveAddress = (e: FormEvent) => {
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
      if (onCheckoutSuccess) {
        onCheckoutSuccess();
      }
    }, 1500);
  };

  const handleClose = () => {
    if (!isProcessingOrder) {
      if (checkoutSuccess) {
        setCheckoutSuccess(false);
      }
      onClose();
    }
  };

  return (
    <Popup isOpen={isOpen} onClose={handleClose} title="Xác Nhận Đặt Hàng & Ký Quỹ Escrow">
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
                handleClose();
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
            className="w-full py-3.5 rounded-xl bg-[#f24e1e] hover:bg-[#d63b0e] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessingOrder ? 'Đang tạo giao dịch ký quỹ...' : 'Xác Nhận Thanh Toán Ký Quỹ'}
          </button>
        </div>
      )}
    </Popup>
  );
}
