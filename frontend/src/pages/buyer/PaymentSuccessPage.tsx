import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ShoppingBag, ArrowRight } from 'lucide-react';
import { checkPaymentStatusApi } from '@/features/orders/services/orders';

export default function PaymentSuccessPage(): ReactNode {
  const { t } = useTranslation('commerce');
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const orderCode = searchParams.get('orderCode');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    checkPaymentStatusApi(orderId)
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-12 text-ink">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
          <CheckCircle2 size={44} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-ink">{t('paymentSuccess.title')}</h1>
          <p className="text-xs text-muted">
            {orderCode
              ? t('paymentSuccess.descWithCode', { code: orderCode })
              : t('paymentSuccess.descDefault')}
          </p>
        </div>

        <div className="space-y-2 rounded-xl bg-emerald-50/70 p-4 text-left text-xs text-emerald-900 border border-emerald-200">
          <p className="font-semibold text-emerald-950">{t('paymentSuccess.escrowTitle')}</p>
          <p className="text-[11px] text-emerald-800">
            {loading ? t('paymentSuccess.syncing') : t('paymentSuccess.sellerNotified')}
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link
            to={orderId ? `/buyer/orders/${encodeURIComponent(orderId)}` : '/buyer/orders'}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
          >
            <span>
              {orderId ? t('paymentSuccess.viewOrderDetail') : t('paymentSuccess.ordersList')}
            </span>
            <ArrowRight size={14} />
          </Link>
          <Link
            to="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <ShoppingBag size={14} />
            <span>{t('paymentSuccess.continueShopping')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
