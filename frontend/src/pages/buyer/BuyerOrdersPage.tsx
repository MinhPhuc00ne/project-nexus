import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, ShoppingBag, Loader2 } from 'lucide-react';
import { getBuyerOrdersApi, payOrderApi, isCodOrder, type BuyerOrder } from '../../services/orders';
import OrderCard, {
  type TabStatus,
  type DisplayOrder,
  statusConfig,
} from '../../components/orders/OrderCard';

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

  const displayOrders: DisplayOrder[] = (Array.isArray(realOrders) ? realOrders : []).map((o) => {
    const firstItem = o?.items?.[0];
    const title = firstItem?.product?.title || `Đơn hàng #${o?.orderNumber ?? ''}`;
    const thumbnail =
      firstItem?.product?.thumbnail ||
      firstItem?.product?.images?.[0]?.url ||
      '/images/watches/watch-1.png';
    const rawStatus = (o?.status as TabStatus) || 'PENDING_PAYMENT';
    const validStatus: Exclude<TabStatus, 'ALL'> =
      rawStatus in statusConfig ? (rawStatus as Exclude<TabStatus, 'ALL'>) : 'PENDING_PAYMENT';

    return {
      id: o?.id ?? '',
      orderNumber: o?.orderNumber ?? '',
      shopName: o?.seller?.fullName || 'Gian Hàng NEXUS',
      product: title,
      qty: (o?.items ?? []).reduce((s, it) => s + (it?.quantity ?? 0), 0),
      price: `${Number(o?.totalAmount ?? 0).toLocaleString('vi-VN')} ₫`,
      date: o?.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '',
      status: validStatus,
      img: thumbnail,
      itemsCount: o?.items?.length ?? 0,
      isCod: isCodOrder(o),
    };
  });

  const filtered = displayOrders.filter((o) => {
    const matchStatus = activeTab === 'ALL' || o.status === activeTab;
    const matchSearch =
      !search ||
      (o.id ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.orderNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.product ?? '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Package size={18} className="text-blue-600" />
            Đơn hàng của tôi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Theo dõi và quản lý toàn bộ đơn hàng</p>
        </div>
      </div>

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

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-xs">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <span>Đang tải danh sách đơn hàng...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <ShoppingBag size={36} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Chưa có đơn hàng nào</p>
          <p className="text-xs text-slate-400 mt-1">
            {search
              ? 'Không tìm thấy đơn hàng phù hợp với từ khoá'
              : 'Khám phá sản phẩm và mua sắm ngay'}
          </p>
          {!search && (
            <Link
              to="/search"
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              Khám phá sản phẩm
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isPaying={payingOrderId === order.id}
              onPayNow={handlePayNow}
            />
          ))}
        </div>
      )}
    </div>
  );
}
