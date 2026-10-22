import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Clock,
  Truck,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  RotateCcw,
  Filter,
  ShoppingBag,
} from 'lucide-react';

import { MOCK_BUYER_ORDERS, type BuyerOrderStatus } from '../../mocks';

type OrderStatus = BuyerOrderStatus;

const mockOrders = MOCK_BUYER_ORDERS;

/* ─────────── Status Config ─────────── */
const statusConfig: Record<
  Exclude<OrderStatus, 'ALL'>,
  { label: string; icon: React.ReactNode; cls: string; dot: string }
> = {
  PENDING: {
    label: 'Chờ xác nhận',
    icon: <Clock size={11} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-400',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    icon: <CheckCircle size={11} />,
    cls: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-400',
  },
  DELIVERING: {
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

const tabs: { key: OrderStatus; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xác nhận' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'DELIVERING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
];

/* ─────────── Component ─────────── */
export default function BuyerOrdersPage() {
  const [activeTab, setActiveTab] = useState<OrderStatus>('ALL');
  const [search, setSearch] = useState('');

  const filtered = mockOrders.filter((o) => {
    const matchStatus = activeTab === 'ALL' || o.status === activeTab;
    const matchSearch =
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.product.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            Đơn hàng của tôi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Theo dõi và quản lý toàn bộ đơn hàng</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition shadow-sm"
        >
          <Filter size={13} />
          Lọc
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Tìm theo mã đơn hàng hoặc tên sản phẩm…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-slate-400 transition"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const count =
            tab.key === 'ALL'
              ? mockOrders.length
              : mockOrders.filter((o) => o.status === tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <ShoppingBag size={36} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Không tìm thấy đơn hàng nào</p>
          <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const s = statusConfig[order.status];
            return (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {/* Order Header */}
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

                {/* Order Body */}
                <Link
                  to={`/buyer/orders/${order.id}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50/50 transition group"
                >
                  <div className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
                    <img
                      src={order.img}
                      alt={order.product}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1.5"%3E%3Crect x="2" y="2" width="20" height="20" rx="3"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpolyline points="21 15 16 10 5 21"/%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition">
                      {order.product}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Mã đơn: {order.id} • {order.date} • x{order.qty}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-sm font-extrabold text-[#f24e1e]">{order.price}</span>
                    <ChevronRight
                      size={14}
                      className="text-slate-400 group-hover:text-blue-600 transition"
                    />
                  </div>
                </Link>

                {/* Order Footer Actions */}
                <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
                  {order.status === 'DELIVERING' && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition"
                    >
                      Xác nhận đã nhận
                    </button>
                  )}
                  {order.canReview && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition flex items-center gap-1"
                    >
                      ⭐ Đánh giá sản phẩm
                    </button>
                  )}
                  {order.canReturn && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition flex items-center gap-1"
                    >
                      <RotateCcw size={11} />
                      Yêu cầu hoàn trả
                    </button>
                  )}
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition flex items-center gap-1"
                    >
                      <AlertCircle size={11} />
                      Huỷ đơn
                    </button>
                  )}
                  <Link
                    to={`/buyer/orders/${order.id}`}
                    className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                  >
                    Xem chi tiết <ChevronRight size={11} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
