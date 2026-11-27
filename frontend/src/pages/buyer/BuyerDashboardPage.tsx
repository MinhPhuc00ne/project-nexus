import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/types';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
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
  Award,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getBuyerOrdersApi, type BuyerOrder } from '@/features/orders/services/orders';
import {
  getBuyerWalletApi,
  type BuyerWalletResponse,
} from '@/features/wallet/services/wallet.service';
import BuyerInterestRecommendations from '../../components/buyer/BuyerInterestRecommendations';
import { isOrderActive } from '../../components/orders/orderStatus';

const statusMap = {
  PENDING_PAYMENT: {
    labelKey: 'dashboard.status.pendingPayment',
    icon: <Clock size={12} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  PAID: {
    labelKey: 'dashboard.status.paid',
    icon: <CheckCircle size={12} />,
    cls: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  PREPARING: {
    labelKey: 'dashboard.status.preparing',
    icon: <Package size={12} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  SHIPPING: {
    labelKey: 'dashboard.status.shipping',
    icon: <Truck size={12} />,
    cls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  COMPLETED: {
    labelKey: 'dashboard.status.completed',
    icon: <CheckCircle size={12} />,
    cls: 'bg-blue-600 text-white border-blue-600',
  },
  CANCELLED: {
    labelKey: 'dashboard.status.cancelled',
    icon: <AlertCircle size={12} />,
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
  },
} as const;

const QUICK_LINK_BLUE_CLASS = 'text-blue-600';

const quickLinks = [
  {
    to: '/buyer/reputation',
    icon: Award,
    labelKey: 'dashboard.quickLinks.reputation',
    color: 'text-blue-600',
  },
  {
    to: '/buyer/addresses',
    icon: MapPin,
    labelKey: 'dashboard.quickLinks.addresses',
    color: QUICK_LINK_BLUE_CLASS,
  },
  {
    to: '/buyer/disputes',
    icon: ShieldAlert,
    labelKey: 'dashboard.quickLinks.disputes',
    color: QUICK_LINK_BLUE_CLASS,
  },
  {
    to: '/buyer/bids',
    icon: Gavel,
    labelKey: 'dashboard.quickLinks.bids',
    color: QUICK_LINK_BLUE_CLASS,
  },
  {
    to: '/search',
    icon: ShoppingBag,
    labelKey: 'dashboard.quickLinks.shop',
    color: QUICK_LINK_BLUE_CLASS,
  },
] as const;

export default function BuyerDashboardPage() {
  const { t, i18n } = useTranslation('buyer');
  const { user, storedUser } = useAuth();
  const profile = user || storedUser;
  const firstName = profile?.fullName?.split(' ').slice(-1)[0] ?? t('dashboard.defaultFirstName');

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
  // `COMPLETED` is the orders page's word for a tab, not a status the API
  // sends, so this filter never excluded anything: a buyer was told every order
  // they had ever placed was still in progress.
  const activeOrdersCount = safeOrders.filter((o) => isOrderActive(o?.status)).length;

  const dashboardStats = [
    {
      key: 'orders',
      label: t('dashboard.stats.ordersLabel'),
      value: String(safeOrders.length),
      sub: t('dashboard.stats.ordersSub', { count: activeOrdersCount }),
      icon: Package,
      link: '/buyer/orders',
    },
    {
      key: 'wallet',
      label: t('dashboard.stats.walletLabel'),
      value: formatCurrency(walletBalance, i18n.language),
      sub: t('dashboard.stats.walletSub'),
      icon: Wallet,
      link: '/buyer/wallet',
    },
    {
      key: 'wishlist',
      label: t('dashboard.stats.wishlistLabel'),
      value: t('dashboard.stats.wishlistValue'),
      sub: t('dashboard.stats.wishlistSub'),
      icon: Heart,
      link: '/buyer/wishlist',
    },
    {
      key: 'bids',
      label: t('dashboard.stats.bidsLabel'),
      value: t('dashboard.stats.bidsValue'),
      sub: t('dashboard.stats.bidsSub'),
      icon: Gavel,
      link: '/buyer/bids',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Welcome Banner (Blue & White Signature Theme) */}
      <div className="relative overflow-hidden rounded-lg bg-[var(--color-navy)] p-6 text-white shadow-xs">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-200 mb-1">
            {t('dashboard.bannerBadge')}
          </p>
          <h1 className="text-xl font-semibold mb-1">
            {t('dashboard.greeting', { name: firstName })}
          </h1>
          <p className="text-xs text-blue-100">{t('dashboard.bannerDesc')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <Link
              to="/buyer/reputation"
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition border border-white/20 px-3 py-1 rounded-md text-white cursor-pointer"
            >
              <Star size={12} className="text-blue-200 fill-blue-200" />
              <span>
                {t('dashboard.reputationLabel')} <strong>{user?.reputationScore ?? 100}</strong>
              </span>
              <span className="text-[10px] text-blue-200 ml-1">{t('dashboard.viewDetails')}</span>
            </Link>
            <Link
              to="/buyer/reputation"
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition border border-white/20 px-3 py-1 rounded-md text-white cursor-pointer"
            >
              <TrendingUp size={12} className="text-blue-200" />
              <span>
                {t('dashboard.tierLabel')} <strong>{user?.trustLevel ?? 'EXCELLENT'}</strong>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {user?.role === Role.BUYER && <BuyerInterestRecommendations buyerId={user.id} />}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {dashboardStats.map((stat) => (
          <Link
            key={stat.key}
            to={stat.link}
            className="group rounded-lg border border-slate-200 bg-white p-4 shadow-xs hover:border-blue-400 transition-all"
          >
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-100 mb-2.5">
              <stat.icon size={17} />
            </div>
            <p className="text-base font-semibold text-ink leading-tight">{stat.value}</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{stat.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Package size={15} className="text-blue-600" />
            {t('dashboard.recentOrdersTitle')}
          </h2>
          <Link
            to="/buyer/orders"
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
          >
            {t('dashboard.viewAll')} <ArrowRight size={12} />
          </Link>
        </div>

        {loading && (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-blue-600" />{' '}
            {t('dashboard.loadingOrders')}
          </div>
        )}
        {!loading && orders.length === 0 && (
          <div className="p-8 text-center space-y-2">
            <p className="text-xs text-muted">{t('dashboard.noOrders')}</p>
            <Link
              to="/search"
              className="inline-block text-xs font-semibold text-blue-600 hover:underline"
            >
              {t('dashboard.exploreNow')}
            </Link>
          </div>
        )}
        {!loading && orders.length > 0 && (
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 5).map((order) => {
              const firstItem = order.items?.[0];
              const title =
                firstItem?.product?.title ||
                t('dashboard.orderTitleFallback', { number: order.orderNumber });
              const img =
                firstItem?.product?.thumbnail ||
                firstItem?.product?.images?.[0]?.imageUrl ||
                firstItem?.product?.images?.[0]?.url ||
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
              const s =
                statusMap[order.status as keyof typeof statusMap] ?? statusMap['PENDING_PAYMENT'];

              return (
                <Link
                  key={order.id}
                  to={`/buyer/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-blue-50/40 transition group"
                >
                  <div className="h-11 w-11 shrink-0 rounded-md border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                    <img
                      src={img}
                      alt={title}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink truncate group-hover:text-blue-600 transition">
                      {title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      #{order.orderNumber} •{' '}
                      {new Date(order.createdAt).toLocaleDateString(getIntlLocale(i18n.language))}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-blue-700">
                      {formatCurrency(Number(order.totalAmount), i18n.language)}
                    </p>
                    <span
                      className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${s.cls}`}
                    >
                      {s.icon} {t(s.labelKey)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickLinks.map((ql) => (
          <Link
            key={ql.to}
            to={ql.to}
            className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white py-3.5 px-2 shadow-xs hover:border-blue-400 transition-all text-center group"
          >
            <div className="h-9 w-9 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ql.icon size={17} className={ql.color} />
            </div>
            <span className="text-xs font-semibold text-slate-700">{t(ql.labelKey)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
