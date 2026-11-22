import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Package, Search, ShoppingBag, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
import {
  getBuyerOrdersApi,
  payOrderApi,
  confirmDeliveryOrderApi,
  isCodOrder,
  type BuyerOrder,
} from '../../services/orders';
import OrderCard, {
  type TabStatus,
  type DisplayOrder,
  statusConfig,
} from '../../components/orders/OrderCard';

const tabs = [
  { key: 'ALL', labelKey: 'ordersPage.tabs.all' },
  { key: 'PENDING_PAYMENT', labelKey: 'ordersPage.tabs.pendingPayment' },
  { key: 'PAID', labelKey: 'ordersPage.tabs.paid' },
  { key: 'PREPARING', labelKey: 'ordersPage.tabs.preparing' },
  { key: 'SHIPPING', labelKey: 'ordersPage.tabs.shipping' },
  { key: 'DELIVERED', labelKey: 'ordersPage.tabs.delivered' },
  { key: 'COMPLETED', labelKey: 'ordersPage.tabs.completed' },
  { key: 'CANCELLED', labelKey: 'ordersPage.tabs.cancelled' },
] as const satisfies { key: TabStatus; labelKey: string }[];

export default function BuyerOrdersPage() {
  const { t, i18n } = useTranslation('buyer');
  const [activeTab, setActiveTab] = useState<TabStatus>('ALL');
  const [search, setSearch] = useState('');
  const [realOrders, setRealOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

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
      alert(t('ordersPage.paymentLinkError'));
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleConfirmDelivery = async (orderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(t('ordersPage.confirmDeliveryPrompt'))) {
      return;
    }
    setConfirmingOrderId(orderId);
    try {
      await confirmDeliveryOrderApi(orderId);
      await fetchOrders();
    } catch (err: unknown) {
      console.error('Lỗi xác nhận nhận hàng:', err);
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      alert(msg || t('ordersPage.confirmDeliveryError'));
    } finally {
      setConfirmingOrderId(null);
    }
  };

  const displayOrders: DisplayOrder[] = (Array.isArray(realOrders) ? realOrders : []).map((o) => {
    const firstItem = o?.items?.[0];
    const title =
      firstItem?.product?.title ||
      t('ordersPage.orderTitleFallback', { number: o?.orderNumber ?? '' });
    const thumbnail =
      firstItem?.product?.thumbnail ||
      firstItem?.product?.images?.[0]?.imageUrl ||
      firstItem?.product?.images?.[0]?.url ||
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
    const rawStatus = (o?.status as string) || 'PENDING_PAYMENT';
    const mappedStatus = (rawStatus === 'CONFIRMED' ? 'COMPLETED' : rawStatus) as TabStatus;
    const validStatus: Exclude<TabStatus, 'ALL'> =
      mappedStatus in statusConfig
        ? (mappedStatus as Exclude<TabStatus, 'ALL'>)
        : 'PENDING_PAYMENT';

    return {
      id: o?.id ?? '',
      orderNumber: o?.orderNumber ?? '',
      shopName: o?.seller?.fullName || t('ordersPage.defaultShopName'),
      product: title,
      qty: (o?.items ?? []).reduce((s, it) => s + (it?.quantity ?? 0), 0),
      price: formatCurrency(Number(o?.totalAmount ?? 0), i18n.language),
      date: o?.createdAt
        ? new Date(o.createdAt).toLocaleDateString(getIntlLocale(i18n.language))
        : '',
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
            {t('ordersPage.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('ordersPage.subtitle')}</p>
        </div>
      </div>

      <div className="relative">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder={t('ordersPage.searchPlaceholder')}
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
              {t(tab.labelKey)}
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
          <span>{t('ordersPage.loading')}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <ShoppingBag size={36} className="text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-500">{t('ordersPage.emptyTitle')}</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? t('ordersPage.emptySearch') : t('ordersPage.emptyDefault')}
          </p>
          {!search && (
            <Link
              to="/search"
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              {t('ordersPage.exploreProducts')}
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
              onConfirmDelivery={handleConfirmDelivery}
              isConfirming={confirmingOrderId === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
