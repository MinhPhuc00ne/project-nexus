import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package,
  ChevronLeft,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  User,
  CreditCard,
  ShieldCheck,
  Loader2,
  ExternalLink,
  ShoppingBag,
  Store,
  Edit2,
  Check,
} from 'lucide-react';
import Popup from '../../components/Popup';
import {
  getBuyerOrderDetailApi,
  payOrderApi,
  type BuyerOrder,
  type ShippingAddressInput,
} from '../../services/orders';
import { getAddresses, type UserAddress } from '../../services/address';

interface TimelineStep {
  label: string;
  time?: string;
  done: boolean;
  active: boolean;
}

const statusMap: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: typeof Clock }
> = {
  PENDING_PAYMENT: {
    label: 'Chờ thanh toán',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: Clock,
  },
  PAID: {
    label: 'Đã thanh toán',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle,
  },
  PREPARING: {
    label: 'Chuẩn bị hàng',
    color: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Package,
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    color: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: Truck,
  },
  DELIVERED: {
    label: 'Đã giao hàng',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle,
  },
  COMPLETED: {
    label: 'Hoàn thành',
    color: 'text-teal-800',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Đã huỷ',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: Clock,
  },
};

export default function BuyerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Address edit state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressBook, setAddressBook] = useState<UserAddress[]>([]);
  const [addressForm, setAddressForm] = useState<ShippingAddressInput>({
    recipientName: '',
    phone: '',
    city: 'TP. Hồ Chí Minh',
    district: '',
    ward: '',
    street: '',
  });
  const [addressError, setAddressError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchOrderDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBuyerOrderDetailApi(id);
      setOrder(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải chi tiết đơn hàng.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handlePayNow = async () => {
    if (!order) return;
    setIsPaying(true);
    try {
      const paymentInfo = await payOrderApi(order.id, 'PAYOS');
      if (paymentInfo.checkoutUrl) {
        window.open(paymentInfo.checkoutUrl, '_blank');
      }
    } catch {
      alert('Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.');
    } finally {
      setIsPaying(false);
    }
  };

  const currentAddress = (order?.shippingAddressSnapshot ||
    order?.shippingAddress ||
    {}) as NonNullable<BuyerOrder['shippingAddress']>;

  const handleOpenEditAddress = async () => {
    setAddressForm({
      recipientName: currentAddress.recipientName || '',
      phone: currentAddress.phone || '',
      city: currentAddress.city || 'TP. Hồ Chí Minh',
      district: currentAddress.district || '',
      ward: currentAddress.ward || '',
      street: currentAddress.street || '',
    });
    setAddressError('');
    setIsEditingAddress(true);
    try {
      const list = await getAddresses();
      if (list && list.length > 0) {
        setAddressBook(list);
      }
    } catch {
      // ignore
    }
  };

  const handleSelectBookAddress = (addr: UserAddress) => {
    setAddressForm({
      recipientName: addr.recipientName,
      phone: addr.phone,
      city: addr.city,
      district: addr.district || '',
      ward: addr.ward || '',
      street: addr.street,
    });
  };

  const handleSaveAddress = (e: FormEvent) => {
    e.preventDefault();
    if (
      !addressForm.recipientName.trim() ||
      !addressForm.phone.trim() ||
      !addressForm.street.trim()
    ) {
      setAddressError('Vui lòng điền đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
      return;
    }

    setOrder((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        shippingAddressSnapshot: { ...addressForm },
      };
    });

    setIsEditingAddress(false);
    setToastMessage('Đã cập nhật địa chỉ giao hàng cho đơn hàng thành công!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fmt = (n: number) => (n === 0 ? 'Miễn phí' : `${n.toLocaleString('vi-VN')} ₫`);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs font-medium">Đang tải thông tin chi tiết đơn hàng...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-4">
        <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
        <div>
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy đơn hàng</h3>
          <p className="text-xs text-slate-500 mt-1">
            {error || 'Mã đơn hàng không hợp lệ hoặc đã bị xóa.'}
          </p>
        </div>
        <Link
          to="/buyer/orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm"
        >
          <ChevronLeft size={14} />
          <span>Quay lại danh sách đơn hàng</span>
        </Link>
      </div>
    );
  }

  const s = statusMap[order.status] || statusMap.PENDING_PAYMENT;
  const StatusIcon = s.icon;
  const canChangeAddress = ['PENDING_PAYMENT', 'PAID', 'PREPARING'].includes(order.status);

  // Build timeline
  const createdDateStr = new Date(order.createdAt).toLocaleString('vi-VN');
  const isPaid = ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED', 'COMPLETED'].includes(order.status);
  const isShipping = ['SHIPPING', 'DELIVERED', 'COMPLETED'].includes(order.status);
  const isDelivered = ['DELIVERED', 'COMPLETED'].includes(order.status);

  const timeline: TimelineStep[] = [
    { label: 'Đặt hàng thành công', time: createdDateStr, done: true, active: false },
    {
      label:
        order.status === 'PENDING_PAYMENT'
          ? 'Chờ thanh toán PayOS'
          : 'Đã thanh toán (Escrow tạm giữ)',
      done: isPaid,
      active: order.status === 'PENDING_PAYMENT',
    },
    {
      label: 'Người bán chuẩn bị & bàn giao vận chuyển',
      done: isShipping,
      active: order.status === 'PREPARING',
    },
    { label: 'Đang giao hàng đến bạn', done: isDelivered, active: order.status === 'SHIPPING' },
    {
      label: 'Hoàn tất đơn hàng',
      done: order.status === 'COMPLETED',
      active: order.status === 'DELIVERED',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs">
          <Link
            to="/buyer/orders"
            className="flex items-center gap-1 font-semibold text-slate-500 hover:text-blue-600 transition"
          >
            <ChevronLeft size={14} />
            Đơn hàng
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-bold text-slate-900">{order.orderNumber}</span>
        </div>
        <span className="text-[11px] text-slate-400">
          Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}
        </span>
      </div>

      {/* Order Status Banner */}
      <div className={`rounded-2xl border ${s.border} ${s.bg} p-5 space-y-4`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <StatusIcon size={18} className={s.color} />
            <span className={`text-sm font-bold ${s.color}`}>{s.label}</span>
          </div>
          {order.status === 'PENDING_PAYMENT' && (
            <button
              type="button"
              disabled={isPaying}
              onClick={handlePayNow}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isPaying ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Đang kết nối PayOS...</span>
                </>
              ) : (
                <>
                  <CreditCard size={13} />
                  <span>Thanh toán PayOS ngay</span>
                  <ExternalLink size={12} />
                </>
              )}
            </button>
          )}
        </div>

        {/* Timeline */}
        <div className="relative pt-2">
          <div className="absolute left-2 top-3 bottom-3 w-0.5 bg-slate-200" />
          <div className="space-y-3.5">
            {timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-3 pl-1">
                <div
                  className={`relative z-10 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    step.done
                      ? 'bg-blue-600 border-blue-600'
                      : step.active
                        ? 'bg-white border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]'
                        : 'bg-white border-slate-300'
                  }`}
                >
                  {step.done && <CheckCircle size={10} className="text-white" />}
                  {step.active && <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                </div>
                <div className="flex-1 min-w-0 pb-0.5">
                  <p
                    className={`text-xs font-semibold ${
                      step.done || step.active ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.time && <p className="text-[11px] text-slate-400">{step.time}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seller / Shop Info */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-slate-800">
              {order.seller?.fullName || 'Gian Hàng Đối Tác NEXUS'}
            </span>
          </div>
          {order.seller?.id && (
            <Link
              to={`/shop/${order.seller.id}`}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Xem gian hàng →
            </Link>
          )}
        </div>

        {/* Products List */}
        <div className="divide-y divide-slate-100">
          {order.items.map((item) => {
            const thumbnail =
              item.product.thumbnail ||
              item.product.images?.[0]?.url ||
              '/images/watches/watch-1.png';
            return (
              <div key={item.id} className="flex items-start gap-4 p-4">
                <div className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
                  <img
                    src={thumbnail}
                    alt={item.product.title}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.productId}`}
                    className="text-xs font-bold text-slate-900 hover:text-blue-600 transition line-clamp-2"
                  >
                    {item.product.title}
                  </Link>
                  <p className="text-[11px] text-slate-400 mt-1">Số lượng: x{item.quantity}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-[#f24e1e]">
                    {Number(item.subtotal || item.unitPrice * item.quantity).toLocaleString(
                      'vi-VN',
                    )}{' '}
                    ₫
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Đơn giá: {Number(item.unitPrice).toLocaleString('vi-VN')} ₫
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Address Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <MapPin size={13} className="text-teal-600" />
            Địa chỉ giao hàng
          </h3>
          {canChangeAddress && (
            <button
              type="button"
              onClick={handleOpenEditAddress}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer shadow-sm"
            >
              <Edit2 size={12} />
              <span>Thay đổi địa chỉ</span>
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <User size={12} className="text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">
              {currentAddress.recipientName || 'Chưa có họ tên người nhận'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Phone size={12} className="text-slate-400 shrink-0" />
            <span className="text-slate-600">
              {currentAddress.phone || 'Chưa có số điện thoại'}
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
            <span className="text-slate-600 leading-relaxed">
              {[
                currentAddress.street,
                currentAddress.ward,
                currentAddress.district,
                currentAddress.city,
              ]
                .filter(Boolean)
                .join(', ') || 'Chưa có địa chỉ cụ thể'}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <CreditCard size={13} className="text-violet-600" />
          Chi tiết thanh toán
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Phương thức</span>
            <span className="font-semibold text-slate-800">Thanh toán ngay qua PayOS VietQR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tạm tính</span>
            <span className="font-semibold text-slate-800">
              {Number(order.subtotal || order.totalAmount).toLocaleString('vi-VN')} ₫
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Phí vận chuyển</span>
            <span className="font-semibold text-emerald-600">
              {fmt(Number(order.shippingFee || 0))}
            </span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Giảm giá</span>
              <span className="font-semibold text-red-500">
                -{Number(order.discountAmount).toLocaleString('vi-VN')} ₫
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-900">Tổng thanh toán</span>
            <span className="text-base font-extrabold text-[#f24e1e]">
              {Number(order.totalAmount).toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>
      </div>

      {/* Escrow Notice */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3.5 flex items-start gap-3">
        <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-indigo-700 leading-relaxed">
          Đơn hàng đang được bảo vệ bởi cơ chế <strong>Ký quỹ Escrow</strong>. Tiền sẽ chỉ được giải
          ngân cho người bán sau khi bạn nhận và kiểm tra hàng thành công.
        </p>
      </div>

      {/* Address Edit Modal */}
      <Popup
        isOpen={isEditingAddress}
        onClose={() => setIsEditingAddress(false)}
        title="Thay Đổi Địa Chỉ Giao Hàng"
        size="md"
      >
        <form onSubmit={handleSaveAddress} className="space-y-4 text-xs text-slate-700">
          {/* Quick Select from Address Book */}
          {addressBook.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-2">
                Chọn nhanh từ Sổ địa chỉ của bạn:
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {addressBook.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => handleSelectBookAddress(a)}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {a.recipientName} • <span className="text-slate-600">{a.phone}</span>
                        {a.isDefault && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                            Mặc định
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {[a.street, a.ward, a.district, a.city].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <span className="text-blue-600 font-semibold text-[11px] shrink-0 ml-2">
                      Chọn
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Inputs */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Họ và tên người nhận *
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.recipientName}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, recipientName: e.target.value })
                  }
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  required
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
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
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
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
                  value={addressForm.district}
                  onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
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
                  value={addressForm.ward}
                  onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
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
                value={addressForm.street}
                onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                placeholder="Số 123 Đường Lê Lợi..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 bg-white"
              />
            </div>

            {addressError && (
              <p className="text-[11px] text-red-500 font-semibold">{addressError}</p>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditingAddress(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm cursor-pointer"
            >
              Cập Nhật Địa Chỉ
            </button>
          </div>
        </form>
      </Popup>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
