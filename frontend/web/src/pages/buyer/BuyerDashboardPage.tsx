import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Heart,
  Wallet,
  Gavel,
  ShieldAlert,
  MapPin,
  ArrowRight,
  TrendingUp,
  ShoppingBag,
  Star,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBuyerOrdersApi, type BuyerOrder } from '../../services/orders';
import { getBuyerWalletApi, type BuyerWalletResponse } from '../../services/wallet.service';

const statusMap: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  PENDING_PAYMENT: {
    label: 'Chờ thanh toán',
    icon: <Clock size={12} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  PAID: {
    label: 'Đã thanh toán',
    icon: <CheckCircle size={12} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  PREPARING: {
    label: 'Chuẩn bị hàng',
    icon: <Package size={12} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    icon: <Truck size={12} />,
    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: <CheckCircle size={12} />,
    cls: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  CANCELLED: {
    label: 'Đã huỷ',
    icon: <AlertCircle size={12} />,
    cls: 'bg-red-50 text-red-700 border-red-200',
  },
};

const quickLinks = [
  { to: '/buyer/addresses', icon: MapPin, label: 'Sổ địa chỉ', color: 'text-teal-600' },
  { to: '/buyer/disputes', icon: ShieldAlert, label: 'Khiếu nại', color: 'text-red-500' },
  { to: '/buyer/bids', icon: Gavel, label: 'Đấu giá', color: 'text-violet-600' },
  { to: '/search', icon: ShoppingBag, label: 'Mua sắm', color: 'text-blue-600' },
];

export default function BuyerDashboardPage() {
  const { user, storedUser } = useAuth();
  const profile = user || storedUser;
  const firstName = profile?.fullName?.split(' ').slice(-1)[0] ?? 'Bạn';

  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [wallet, setWallet] = useState<BuyerWalletResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [ordersData, walletData] = await Promise.allSettled([
          getBuyerOrdersApi(),
          getBuyerWalletApi(),
        ]);
        if (isMounted) {
          if (ordersData.status === 'fulfilled' && Array.isArray(ordersData.value)) {
            setOrders(ordersData.value);
          }
          if (walletData.status === 'fulfilled' && walletData.value) {
            setWallet(walletData.value);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const walletBalance = Number(wallet?.balance ?? user?.wallet?.balance ?? 0);
  const safeOrders = Array.isArray(orders) ? orders : [];
  const activeOrdersCount = safeOrders.filter(
    (o) => o?.status !== 'COMPLETED' && o?.status !== 'CANCELLED',
  ).length;

  const dashboardStats = [
    {
      key: 'orders',
      label: 'Đơn hàng của tôi',
      value: String(safeOrders.length),
      sub: `${activeOrdersCount} đơn đang xử lý`,
      icon: Package,
      color: 'from-blue-500 to-indigo-600',
      link: '/buyer/orders',
    },
    {
      key: 'wallet',
      label: 'Ví NEXUS Pay',
      value: `${walletBalance.toLocaleString('vi-VN')} ₫`,
      sub: 'Số dư ví khả dụng',
      icon: Wallet,
      color: 'from-amber-500 to-orange-600',
      link: '/buyer/wallet',
    },
    {
      key: 'wishlist',
      label: 'Yêu thích',
      value: 'Sản phẩm đã lưu',
      sub: 'Khám phá bộ sưu tập',
      icon: Heart,
      color: 'from-rose-500 to-pink-600',
      link: '/buyer/wishlist',
    },
    {
      key: 'bids',
      label: 'Đấu giá trực tiếp',
      value: 'Phiên đấu giá',
      sub: 'Theo dõi giá thầu',
      icon: Gavel,
      color: 'from-violet-500 to-purple-600',
      link: '/buyer/bids',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-blue-500/20">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1">
            Chào mừng trở lại 👋
          </p>
          <h1 className="text-2xl font-extrabold mb-1">Xin chào, {firstName}!</h1>
          <p className="text-sm text-blue-100">
            Theo dõi đơn hàng, quản lý ví NEXUS Pay và khám phá mô hình 3D chính hãng.
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-full">
              <Star size={12} className="text-amber-300" />
              Điểm uy tín: {user?.reputationScore ?? 100}
            </span>
            <span className="flex items-center gap-1 bg-white/15 px-3 py-1.5 rounded-full">
              <TrendingUp size={12} />
              {user?.trustLevel ?? 'STANDARD'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {dashboardStats.map((stat) => (
          <Link
            key={stat.key}
            to={stat.link}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
          >
            <div
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}
            >
              <stat.icon size={18} />
            </div>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">{stat.value}</p>
            <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package size={15} className="text-blue-600" />
            Đơn hàng gần đây
          </h2>
          <Link
            to="/buyer/orders"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            Xem tất cả <ArrowRight size={12} />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-blue-600" /> Đang tải đơn hàng…
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-slate-500">Bạn chưa có đơn hàng nào.</p>
            <Link
              to="/search"
              className="inline-block text-xs font-bold text-blue-600 hover:underline"
            >
              Khám phá sản phẩm ngay →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 5).map((order) => {
              const firstItem = order.items?.[0];
              const title = firstItem?.product?.title || `Đơn hàng #${order.orderNumber}`;
              const img =
                firstItem?.product?.thumbnail ||
                firstItem?.product?.images?.[0]?.url ||
                '/images/watches/watch-1.png';
              const s = statusMap[order.status] ?? statusMap['PENDING_PAYMENT'];

              return (
                <Link
                  key={order.id}
                  to={`/buyer/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition group"
                >
                  <div className="h-11 w-11 shrink-0 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
                    <img src={img} alt={title} className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                      {title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      #{order.orderNumber} • {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold text-[#f24e1e]">
                      {Number(order.totalAmount).toLocaleString('vi-VN')} ₫
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}
                    >
                      {s.icon} {s.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-4 gap-3">
        {quickLinks.map((ql) => (
          <Link
            key={ql.to}
            to={ql.to}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 px-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-center group"
          >
            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ql.icon size={18} className={ql.color} />
            </div>
            <span className="text-[11px] font-semibold text-slate-600">{ql.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
