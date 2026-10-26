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
} from 'lucide-react';
import { getBuyerOrderDetailApi, payOrderApi, type BuyerOrder } from '../../services/orders';
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
            <span>Chi tiết đơn hàng #{order.orderNumber}</span>
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

        {order.status === 'PENDING_PAYMENT' && (
          <button
            type="button"
            disabled={isPaying}
            onClick={handlePayNow}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
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
        )}
      </div>

      {/* Order Timeline */}
      <OrderTimeline
        status={order.status}
        createdAt={order.createdAt}
        updatedAt={order.updatedAt}
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
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              <span>Phương thức thanh toán</span>
            </h3>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Hình thức:</span>
                <span className="text-blue-600">PayOS VietQR (Escrow)</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Trạng thái:</span>
                <span className="font-semibold text-slate-700">{statusConfig.label}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-indigo-700 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100/70">
              <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
              <span>Giao dịch được bảo hộ 100% qua cơ chế ký quỹ NEXUS Escrow.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
