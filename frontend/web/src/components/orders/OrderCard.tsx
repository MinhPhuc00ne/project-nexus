import React from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  CreditCard,
  ExternalLink,
  Loader2,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
} from 'lucide-react';

export type TabStatus =
  'ALL' | 'PENDING_PAYMENT' | 'PAID' | 'PREPARING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

export const statusConfig: Record<
  Exclude<TabStatus, 'ALL'>,
  { label: string; icon: React.ReactNode; cls: string; dot: string }
> = {
  PENDING_PAYMENT: {
    label: 'Chờ thanh toán',
    icon: <Clock size={11} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
  },
  PAID: {
    label: 'Đã thanh toán',
    icon: <CheckCircle size={11} />,
    cls: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-400',
  },
  PREPARING: {
    label: 'Đang chuẩn bị',
    icon: <Package size={11} />,
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-400',
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    icon: <Truck size={11} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: <CheckCircle size={11} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Đã huỷ',
    icon: <XCircle size={11} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-400',
  },
};

export interface DisplayOrder {
  id: string;
  orderNumber: string;
  shopName: string;
  product: string;
  qty: number;
  price: string;
  date: string;
  status: Exclude<TabStatus, 'ALL'>;
  img: string;
  itemsCount: number;
  isCod?: boolean;
}

interface OrderCardProps {
  order: DisplayOrder;
  isPaying: boolean;
  onPayNow: (orderId: string, e: React.MouseEvent) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, isPaying, onPayNow }) => {
  const s = statusConfig[order.status] || statusConfig.PENDING_PAYMENT;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot} animate-pulse`} />
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            {order.shopName}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${s.cls}`}
        >
          {s.icon}
          {s.label}
        </span>
      </div>

      <Link
        to={`/buyer/orders/${order.id}`}
        className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50/50 transition group"
      >
        <div className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
          <img src={order.img} alt={order.product} className="h-full w-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition">
            {order.product}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Mã đơn: {order.orderNumber} • {order.date} • x{order.qty} sản phẩm
          </p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <span className="text-sm font-extrabold text-[#f24e1e]">{order.price}</span>
          <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-600 transition" />
        </div>
      </Link>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-4 py-2.5">
        {order.status === 'PENDING_PAYMENT' &&
          (order.isCod ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
              <Banknote size={13} className="text-emerald-600" />
              <span>Tiền mặt khi nhận hàng (COD)</span>
            </span>
          ) : (
            <button
              type="button"
              disabled={isPaying}
              onClick={(e) => onPayNow(order.id, e)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isPaying ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Đang mở PayOS...</span>
                </>
              ) : (
                <>
                  <CreditCard size={12} />
                  <span>Thanh toán PayOS</span>
                  <ExternalLink size={11} />
                </>
              )}
            </button>
          ))}
        <Link
          to={`/buyer/orders/${order.id}`}
          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
        >
          Xem chi tiết <ChevronRight size={11} />
        </Link>
      </div>
    </div>
  );
};

export default OrderCard;
