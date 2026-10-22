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
  Copy,
  ExternalLink,
} from 'lucide-react';

import { MOCK_ORDER_DETAIL } from '../../mocks';

export default function BuyerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const order = MOCK_ORDER_DETAIL; // In production, fetch by id

  const fmt = (n: number) => (n === 0 ? 'Miễn phí' : n.toLocaleString('vi-VN') + ' ₫');

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/buyer/orders"
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
        >
          <ChevronLeft size={14} />
          Đơn hàng
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-bold text-slate-900">{id ?? order.id}</span>
      </div>

      {/* Order Status Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-blue-600" />
            <span className="text-sm font-bold text-blue-800">Đang giao hàng</span>
          </div>
          <span className="text-xs text-slate-500">Dự kiến: {order.shipping.estimatedDate}</span>
        </div>
        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />
          <div className="space-y-3">
            {order.timeline.map((step, i) => (
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

      {/* Tracking Code */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
          <Package size={13} className="text-indigo-600" />
          Mã vận đơn GHN
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg flex-1">
            {order.shipping.trackingCode}
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(order.shipping.trackingCode)}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Sao chép"
          >
            <Copy size={14} />
          </button>
          <a
            href={`https://ghn.vn/tracking?order_code=${order.shipping.trackingCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
            title="Xem trên GHN"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Product */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
          <p className="text-xs font-bold text-slate-600">{order.product.shopName}</p>
        </div>
        <div className="flex items-start gap-4 p-4">
          <div className="h-16 w-16 shrink-0 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
            <img
              src={order.product.img}
              alt={order.product.name}
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.3';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 line-clamp-2">{order.product.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{order.product.variant}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">x{order.product.qty}</p>
          </div>
          <span className="text-sm font-extrabold text-[#f24e1e] shrink-0">
            {order.product.price.toLocaleString('vi-VN')} ₫
          </span>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <MapPin size={13} className="text-teal-600" />
          Địa chỉ giao hàng
        </h3>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <User size={12} className="text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-800">{order.address.name}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Phone size={12} className="text-slate-400 shrink-0" />
            <span className="text-slate-600">{order.address.phone}</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
            <span className="text-slate-600">{order.address.address}</span>
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
            <span className="font-semibold text-slate-800">{order.payment.method}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tạm tính</span>
            <span className="font-semibold text-slate-800">
              {order.payment.subtotal.toLocaleString('vi-VN')} ₫
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Phí vận chuyển</span>
            <span className="font-semibold text-emerald-600">{fmt(order.payment.shippingFee)}</span>
          </div>
          {order.payment.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Giảm giá</span>
              <span className="font-semibold text-red-500">
                -{order.payment.discount.toLocaleString('vi-VN')} ₫
              </span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-900">Tổng thanh toán</span>
            <span className="text-base font-extrabold text-[#f24e1e]">
              {order.payment.total.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>
      </div>

      {/* Escrow Notice */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3.5 flex items-start gap-3">
        <ShieldCheck size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-indigo-700 leading-relaxed">
          Đơn hàng đang được bảo vệ bởi cơ chế <strong>Ký quỹ Escrow</strong>. Tiền sẽ chỉ được giải
          ngân cho người bán sau khi bạn xác nhận đã nhận hàng thành công.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
        >
          <CheckCircle size={14} />
          Xác nhận đã nhận hàng
        </button>
        <button
          type="button"
          className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition shadow-sm"
        >
          <Clock size={14} />
        </button>
      </div>
    </div>
  );
}
