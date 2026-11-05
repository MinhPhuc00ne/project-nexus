import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package,
  ChevronLeft,
  Truck,
  CheckCircle,
  Clock,
  CreditCard,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Banknote,
} from 'lucide-react';
import {
  getBuyerOrderDetailApi,
  payOrderApi,
  confirmDeliveryOrderApi,
  isCodOrder,
  type BuyerOrder,
} from '../../services/orders';
import OrderTimeline from '../../components/orders/OrderTimeline';
import OrderAddressCard from '../../components/orders/OrderAddressCard';
import OrderItemsSummary from '../../components/orders/OrderItemsSummary';

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
  CONFIRMED: {
    label: 'Hoàn thành',
    color: 'text-teal-800',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
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
  const [isConfirming, setIsConfirming] = useState(false);

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

  const handleConfirmDelivery = async () => {
    if (!order) return;
    if (!window.confirm('Bạn xác nhận đã nhận được kiện hàng này đầy đủ và nguyên vẹn?')) {
      return;
    }
    setIsConfirming(true);
    try {
      await confirmDeliveryOrderApi(order.id);
      await fetchOrderDetail();
    } catch (err: unknown) {
      console.error('Lỗi xác nhận nhận hàng:', err);
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      alert(msg || 'Không thể xác nhận nhận hàng lúc này. Vui lòng thử lại sau.');
    } finally {
      setIsConfirming(false);
    }
  };

  const currentAddress = (order?.shippingAddressSnapshot ||
    order?.shippingAddress ||
    {}) as NonNullable<BuyerOrder['shippingAddress']>;

  const isCod = isCodOrder(order);
  const statusConfig = (order?.status && statusMap[order.status]) || statusMap.PENDING_PAYMENT;
  const StatusIcon = statusConfig.icon;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-xs">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
        <span>Đang tải thông tin đơn hàng...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-16 text-center max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <p className="text-sm font-semibold text-rose-600 mb-4">
          {error || 'Không tìm thấy đơn hàng'}
        </p>
        <Link
          to="/buyer/orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
        >
          <ChevronLeft size={14} /> Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/buyer/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition mb-2"
          >
            <ChevronLeft size={14} /> Quay lại danh sách đơn hàng
          </Link>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <span>Chi tiết đơn hàng #{order.orderNumber || order.id?.slice(0, 8)}</span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border}`}
            >
              <StatusIcon size={12} />
              {statusConfig.label}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ngày đặt hàng: {new Date(order.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>

        {order.status === 'PENDING_PAYMENT' &&
          (isCod ? (
            <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 shadow-sm">
              <Banknote size={15} className="text-emerald-600" />
              <span>Tiền mặt khi nhận hàng (COD)</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isPaying}
              onClick={handlePayNow}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isPaying ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang kết nối PayOS...</span>
                </>
              ) : (
                <>
                  <CreditCard size={14} />
                  <span>Thanh toán PayOS ngay</span>
                  <ExternalLink size={12} />
                </>
              )}
            </button>
          ))}
      </div>

      {/* Action Banner for Delivered / Completed */}
      {order.status === 'DELIVERED' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <CheckCircle size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                Đơn hàng đã được bưu tá GHN giao thành công
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Vui lòng kiểm tra sản phẩm. Nếu có vấn đề hãy bấm khiếu nại/trả hàng. Nếu hàng
                nguyên vẹn, hãy bấm xác nhận nhận hàng.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/buyer/disputes?orderId=${order.id}`}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition shadow-sm"
            >
              Khiếu nại / Trả hàng
            </Link>
            <button
              type="button"
              disabled={isConfirming}
              onClick={handleConfirmDelivery}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
            >
              {isConfirming ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>Đã nhận được hàng</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {(order.status === 'CONFIRMED' || order.status === 'COMPLETED') && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <CheckCircle size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-950">Đơn hàng đã hoàn thành</h4>
              <p className="text-xs text-blue-700 mt-0.5">
                Cảm ơn bạn đã mua sắm tại NEXUS! Bạn có thể đánh giá sản phẩm để chia sẻ trải
                nghiệm.
              </p>
            </div>
          </div>
          <Link
            to={`/buyer/reviews?orderId=${order.id}`}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
          >
            Đánh giá sản phẩm
          </Link>
        </div>
      )}

      {/* Order Timeline */}
      <OrderTimeline
        status={order.status}
        createdAt={order.createdAt}
        updatedAt={order.updatedAt}
        isCod={isCod}
      />

      {/* Main Details (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Items Summary */}
        <div className="lg:col-span-8">
          <OrderItemsSummary order={order} />
        </div>

        {/* Right: Address & Payment Info */}
        <div className="lg:col-span-4 space-y-6">
          <OrderAddressCard address={currentAddress} />

          {/* Payment Method Card */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              {isCod ? (
                <Banknote size={16} className="text-emerald-600" />
              ) : (
                <CreditCard size={16} className="text-blue-600" />
              )}
              <span>Phương thức thanh toán</span>
            </h3>
            {isCod ? (
              <div className="space-y-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Hình thức:</span>
                  <span className="font-extrabold text-emerald-700">
                    Tiền mặt khi nhận hàng (COD)
                  </span>
                </div>
                {['DELIVERED', 'CONFIRMED', 'COMPLETED'].includes(order.status) ? (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Trạng thái:</span>
                    <span className="font-semibold text-emerald-700">
                      Đã thanh toán tiền mặt ({Number(order.totalAmount).toLocaleString('vi-VN')} ₫)
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Cần trả shipper khi giao:</span>
                      <span className="font-extrabold text-[#f24e1e]">
                        {Number(order.totalAmount).toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Trạng thái:</span>
                      <span className="font-semibold text-amber-700">
                        Chờ nhận hàng & thanh toán
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Hình thức:</span>
                  <span className="text-blue-600">PayOS VietQR (Escrow)</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Trạng thái:</span>
                  <span className="font-semibold text-slate-700">
                    {order.status !== 'PENDING_PAYMENT'
                      ? 'Đã thanh toán (PayOS VietQR)'
                      : 'Chờ thanh toán'}
                  </span>
                </div>
              </div>
            )}

            {isCod ? (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-2.5 text-[11px] text-emerald-900">
                <Truck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>
                  Quý khách được quyền đồng kiểm tra sản phẩm với bưu tá GHN Express trước khi thanh
                  toán.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-indigo-100/70 bg-indigo-50/70 p-2.5 text-[11px] text-indigo-700">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                <span>Giao dịch được bảo hộ 100% qua cơ chế ký quỹ NEXUS Escrow.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
