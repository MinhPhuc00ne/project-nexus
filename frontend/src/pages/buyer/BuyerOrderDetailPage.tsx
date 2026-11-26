import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { getIntlLocale } from '../../i18n/config';
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
  Banknote,
} from 'lucide-react';
import {
  getBuyerOrderDetailApi,
  payOrderApi,
  confirmDeliveryOrderApi,
  isCodOrder,
  type BuyerOrder,
} from '@/features/orders/services/orders';
import OrderTimeline from '../../components/orders/OrderTimeline';
import OrderAddressCard from '../../components/orders/OrderAddressCard';
import OrderItemsSummary from '../../components/orders/OrderItemsSummary';
import OrderReviewModal from '../../components/orders/OrderReviewModal';
import { useToast } from '../../components/ToastNotification';

const statusMap = {
  PENDING_PAYMENT: {
    labelKey: 'orderDetailPage.status.pendingPayment',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: Clock,
  },
  PAID: {
    labelKey: 'orderDetailPage.status.paid',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle,
  },
  PREPARING: {
    labelKey: 'orderDetailPage.status.preparing',
    color: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Package,
  },
  SHIPPING: {
    labelKey: 'orderDetailPage.status.shipping',
    color: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: Truck,
  },
  DELIVERED: {
    labelKey: 'orderDetailPage.status.delivered',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle,
  },
  CONFIRMED: {
    labelKey: 'orderDetailPage.status.completed',
    color: 'text-teal-800',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: CheckCircle,
  },
  COMPLETED: {
    labelKey: 'orderDetailPage.status.completed',
    color: 'text-teal-800',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: CheckCircle,
  },
  CANCELLED: {
    labelKey: 'orderDetailPage.status.cancelled',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: Clock,
  },
} as const;

export default function BuyerOrderDetailPage() {
  const { t, i18n } = useTranslation('buyer');
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(() => searchParams.get('review') === '1');

  useEffect(() => {
    setShowReviewModal(searchParams.get('review') === '1' && order?.status === 'CONFIRMED');
  }, [order?.status, searchParams]);

  const fetchOrderDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBuyerOrderDetailApi(id);
      setOrder(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('orderDetailPage.loadError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('orderDetailPage.paymentLinkError'));
    } finally {
      setIsPaying(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order) return;
    if (!window.confirm(t('orderDetailPage.confirmDeliveryPrompt'))) {
      return;
    }
    setIsConfirming(true);
    try {
      await confirmDeliveryOrderApi(order.id);
      toast.success(t('ordersPage.confirmDeliverySuccess'));
      await fetchOrderDetail();
    } catch (err: unknown) {
      console.error('Lỗi xác nhận nhận hàng:', err);
      toast.error(err instanceof Error ? err.message : t('orderDetailPage.confirmDeliveryError'));
    } finally {
      setIsConfirming(false);
    }
  };

  const currentAddress = (order?.shippingAddressSnapshot ||
    order?.shippingAddress ||
    {}) as NonNullable<BuyerOrder['shippingAddress']>;

  const isCod = isCodOrder(order);
  const statusConfig =
    (order?.status && statusMap[order.status as keyof typeof statusMap]) ||
    statusMap.PENDING_PAYMENT;
  const StatusIcon = statusConfig.icon;

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-xs">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
        <span>{t('orderDetailPage.loading')}</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-16 text-center max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <p className="text-sm font-semibold text-rose-600 mb-4">
          {error || t('orderDetailPage.notFound')}
        </p>
        <Link
          to="/buyer/orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
        >
          <ChevronLeft size={14} /> {t('orderDetailPage.backToOrders')}
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
            <ChevronLeft size={14} /> {t('orderDetailPage.backToOrders')}
          </Link>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <span>
              {t('orderDetailPage.title', { number: order.orderNumber || order.id?.slice(0, 8) })}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border}`}
            >
              <StatusIcon size={12} />
              {t(statusConfig.labelKey)}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('orderDetailPage.orderedAt', {
              date: new Date(order.createdAt).toLocaleString(getIntlLocale(i18n.language)),
            })}
          </p>
        </div>

        {order.status === 'PENDING_PAYMENT' &&
          (isCod ? (
            <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 shadow-sm">
              <Banknote size={15} className="text-emerald-600" />
              <span>{t('orderDetailPage.codLabel')}</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isPaying}
              onClick={handlePayNow}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isPaying ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t('orderDetailPage.connectingPayos')}</span>
                </>
              ) : (
                <>
                  <CreditCard size={14} />
                  <span>{t('orderDetailPage.payWithPayos')}</span>
                  <ExternalLink size={12} />
                </>
              )}
            </button>
          ))}
      </div>

      {/* Action Banner for Delivered / Completed */}
      {order.status === 'DELIVERED' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <CheckCircle size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                {t('orderDetailPage.deliveredBannerTitle')}
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                {t('orderDetailPage.deliveredBannerDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/buyer/disputes?orderId=${order.id}`}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition shadow-sm"
            >
              {t('orderDetailPage.disputeOrReturn')}
            </Link>
            <button
              type="button"
              disabled={isConfirming}
              onClick={handleConfirmDelivery}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
            >
              {isConfirming ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{t('orderDetailPage.processing')}</span>
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>{t('orderDetailPage.confirmReceived')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {order.status === 'CONFIRMED' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <CheckCircle size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-950">
                {t('orderDetailPage.completedBannerTitle')}
              </h4>
              <p className="text-xs text-blue-700 mt-0.5">
                {t('orderDetailPage.completedBannerDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowReviewModal(true);
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                next.set('review', '1');
                return next;
              });
            }}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm cursor-pointer"
          >
            {t('orderDetailPage.rateProducts')}
          </button>
        </div>
      )}

      {order && (
        <OrderReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSearchParams((current) => {
              const next = new URLSearchParams(current);
              next.delete('review');
              return next;
            });
          }}
          order={order}
          onSuccess={() => void fetchOrderDetail()}
        />
      )}

      {/* Order Timeline */}
      <OrderTimeline
        status={order.status}
        createdAt={order.createdAt}
        updatedAt={order.updatedAt}
        isCod={isCod}
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
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              {isCod ? (
                <Banknote size={16} className="text-emerald-600" />
              ) : (
                <CreditCard size={16} className="text-blue-600" />
              )}
              <span>{t('orderDetailPage.paymentMethodTitle')}</span>
            </h3>
            {isCod ? (
              <div className="space-y-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{t('orderDetailPage.methodLabel')}</span>
                  <span className="font-extrabold text-emerald-700">
                    {t('orderDetailPage.codLabel')}
                  </span>
                </div>
                {['DELIVERED', 'CONFIRMED', 'COMPLETED'].includes(order.status) ? (
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{t('orderDetailPage.statusLabel')}</span>
                    <span className="font-semibold text-emerald-700">
                      {t('orderDetailPage.paidCash', {
                        amount: formatCurrency(Number(order.totalAmount), i18n.language),
                      })}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{t('orderDetailPage.codAmountDue')}</span>
                      <span className="font-extrabold text-[#f24e1e]">
                        {formatCurrency(Number(order.totalAmount), i18n.language)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{t('orderDetailPage.statusLabel')}</span>
                      <span className="font-semibold text-amber-700">
                        {t('orderDetailPage.awaitingDeliveryPayment')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{t('orderDetailPage.methodLabel')}</span>
                  <span className="text-blue-600">{t('orderDetailPage.payosMethod')}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{t('orderDetailPage.statusLabel')}</span>
                  <span className="font-semibold text-slate-700">
                    {order.status !== 'PENDING_PAYMENT'
                      ? t('orderDetailPage.paidPayos')
                      : t('orderDetailPage.status.pendingPayment')}
                  </span>
                </div>
              </div>
            )}

            {isCod ? (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-2.5 text-[11px] text-emerald-900">
                <Truck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{t('orderDetailPage.codInspectionNote')}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-indigo-100/70 bg-indigo-50/70 p-2.5 text-[11px] text-indigo-700">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                <span>{t('orderDetailPage.escrowProtectionNote')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
