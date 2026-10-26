import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Search,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  ChevronRight,
  ShoppingBag,
  CreditCard,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { getBuyerOrdersApi, payOrderApi, type BuyerOrder } from '../../services/orders';
import { MOCK_BUYER_ORDERS } from '../../mocks';

type TabStatus =
  'ALL' | 'PENDING_PAYMENT' | 'PAID' | 'PREPARING' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

/* ─────────── Status Config ─────────── */
const statusConfig: Record<
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

const tabs: { key: TabStatus; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { key: 'PAID', label: 'Đã thanh toán' },
  { key: 'PREPARING', label: 'Chuẩn bị hàng' },
  { key: 'SHIPPING', label: 'Đang giao' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
];

export default function BuyerOrdersPage() {
  const [activeTab, setActiveTab] = useState<TabStatus>('ALL');
  const [search, setSearch] = useState('');
  const [realOrders, setRealOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBuyerOrdersApi();
      if (Array.isArray(data)) {
        setRealOrders(data);
      }
    } catch (err) {
      console.warn('Lỗi tải đơn hàng thật từ API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const handlePayNow = async (orderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPayingOrderId(orderId);
    try {
      const paymentInfo = await payOrderApi(orderId, 'PAYOS');
      if (paymentInfo.checkoutUrl) {
        window.open(paymentInfo.checkoutUrl, '_blank');
      }
    } catch (err) {
      console.error('Lỗi khởi tạo cổng PayOS:', err);
      alert('Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.');
    } finally {
      setPayingOrderId(null);
    }
  };

  // Map real orders or fallback to mock
  const displayOrders =
    realOrders.length > 0
      ? realOrders.map((o) => {
          const firstItem = o.items[0];
          const title = firstItem?.product?.title || `Đơn hàng #${o.orderNumber}`;
          const thumbnail =
            firstItem?.product?.thumbnail ||
            firstItem?.product?.images?.[0]?.url ||
            '/images/watches/watch-1.png';
          const rawStatus = (o.status as TabStatus) || 'PENDING_PAYMENT';
          const validStatus: Exclude<TabStatus, 'ALL'> =
            rawStatus in statusConfig
              ? (rawStatus as Exclude<TabStatus, 'ALL'>)
              : 'PENDING_PAYMENT';

          return {
            id: o.id,
            orderNumber: o.orderNumber,
            shopName: o.seller?.fullName || 'Gian Hàng NEXUS',
            product: title,
            qty: o.items.reduce((s, it) => s + it.quantity, 0),
            price: `${Number(o.totalAmount).toLocaleString('vi-VN')} ₫`,
            date: new Date(o.createdAt).toLocaleDateString('vi-VN'),
            status: validStatus,
            img: thumbnail,
            itemsCount: o.items.length,
          };
        })
      : MOCK_BUYER_ORDERS.map((m) => ({
          id: m.id,
          orderNumber: m.id,
          shopName: m.shopName,
          product: m.product,
          qty: m.qty,
          price: m.price,
          date: m.date,
          status: (m.status === 'PENDING' ? 'PENDING_PAYMENT' : m.status) as Exclude<
            TabStatus,
            'ALL'
          >,
          img: m.img,
          itemsCount: 1,
        }));

  const filtered = displayOrders.filter((o) => {
    const matchStatus = activeTab === 'ALL' || o.status === activeTab;
    const matchSearch =
      !search ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
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
              ? displayOrders.length
              : displayOrders.filter((o) => o.status === tab.key).length;
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
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <span>Đang tải danh sách đơn hàng...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <ShoppingBag size={36} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Không tìm thấy đơn hàng nào</p>
          <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const s = statusConfig[order.status] || statusConfig.PENDING_PAYMENT;
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
                    />
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
                    <ChevronRight
                      size={14}
                      className="text-slate-400 group-hover:text-blue-600 transition"
                    />
                  </div>
                </Link>

                {/* Order Footer Actions */}
                <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/40">
                  {order.status === 'PENDING_PAYMENT' && (
                    <button
                      type="button"
                      disabled={payingOrderId === order.id}
                      onClick={(e) => handlePayNow(order.id, e)}
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {payingOrderId === order.id ? (
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
