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
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  MOCK_BUYER_DASHBOARD_STATS,
  MOCK_BUYER_RECENT_ORDERS,
  type BuyerDashboardStatKey,
} from '../../mocks';

const statIconMap: Record<BuyerDashboardStatKey, React.ComponentType<{ size?: number }>> = {
  orders: Package,
  wishlist: Heart,
  wallet: Wallet,
  bids: Gavel,
};

const mockOrders = MOCK_BUYER_RECENT_ORDERS;

const statusMap: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  PENDING: {
    label: 'Chờ xác nhận',
    icon: <Clock size={12} />,
    cls: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  DELIVERING: {
    label: 'Đang giao hàng',
    icon: <Truck size={12} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    icon: <CheckCircle size={12} />,
    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-blue-500/20">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 left-20 h-24 w-24 rounded-full bg-white/10 blur-xl" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1">
            Chào mừng trở lại 👋
          </p>
          <h1 className="text-2xl font-extrabold mb-1">Xin chào, {firstName}!</h1>
          <p className="text-sm text-blue-100">
            Theo dõi đơn hàng, quản lý ví NEXUS Pay và tham gia đấu giá độc quyền.
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
        {MOCK_BUYER_DASHBOARD_STATS.map((stat) => {
          const Icon = statIconMap[stat.key];
          return (
            <Link
              key={stat.key}
              to={stat.link}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}
              >
                <Icon size={18} />
              </div>
              <p className="text-lg font-extrabold text-slate-900 leading-tight">{stat.value}</p>
              <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</p>
            </Link>
          );
        })}
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
        <div className="divide-y divide-slate-100">
          {mockOrders.map((order) => {
            const s = statusMap[order.status] ?? statusMap['PENDING'];
            return (
              <Link
                key={order.id}
                to={`/buyer/orders/${order.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition group"
              >
                <div className="h-11 w-11 shrink-0 rounded-xl border border-slate-100 bg-slate-50 overflow-hidden flex items-center justify-center">
                  <img
                    src={order.img}
                    alt={order.product}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                    {order.product}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {order.id} • {order.date}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold text-[#f24e1e]">{order.price}</p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}
                  >
                    {s.icon}
                    {s.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
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
