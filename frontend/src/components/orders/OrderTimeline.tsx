import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle, Package } from 'lucide-react';
import { getIntlLocale } from '../../i18n/config';

interface TimelineStep {
  label: string;
  time?: string;
  done: boolean;
  active: boolean;
}

interface OrderTimelineProps {
  status: string;
  createdAt: string;
  updatedAt?: string;
  isCod?: boolean;
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  status,
  createdAt,
  updatedAt,
  isCod = false,
}) => {
  const { t, i18n } = useTranslation('commerce');
  const locale = getIntlLocale(i18n.language);
  const isDeliveredOrDone = ['DELIVERED', 'CONFIRMED', 'COMPLETED'].includes(status);
  const isAllPreparingOrLater = [
    'PREPARING',
    'SHIPPING',
    'DELIVERED',
    'CONFIRMED',
    'COMPLETED',
  ].includes(status);

  const steps: TimelineStep[] = [
    {
      label: t('orders.timeline.orderPlaced'),
      time: new Date(createdAt).toLocaleString(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      done: true,
      active: status === 'PENDING_PAYMENT' && !isCod,
    },
    {
      label: isCod ? t('orders.timeline.codPayment') : t('orders.timeline.paid'),
      time: isCod
        ? isDeliveredOrDone
          ? t('orders.timeline.codCollected')
          : t('orders.timeline.codCollectOnDelivery')
        : status !== 'PENDING_PAYMENT' && status !== 'CANCELLED'
          ? updatedAt
            ? new Date(updatedAt).toLocaleString(locale, {
                dateStyle: 'short',
                timeStyle: 'short',
              })
            : t('orders.timeline.completedStep')
          : undefined,
      done: isCod
        ? isDeliveredOrDone
        : ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CONFIRMED', 'COMPLETED'].includes(status),
      active: !isCod && status === 'PAID',
    },
    {
      label: t('orders.timeline.preparing'),
      done: isAllPreparingOrLater,
      active: status === 'PREPARING',
    },
    {
      label: t('orders.timeline.shipping'),
      done: ['SHIPPING', 'DELIVERED', 'CONFIRMED', 'COMPLETED'].includes(status),
      active: status === 'SHIPPING',
    },
    {
      label: ['CONFIRMED', 'COMPLETED'].includes(status)
        ? t('orders.timeline.completed')
        : t('orders.timeline.delivered'),
      done: isDeliveredOrDone,
      active: isDeliveredOrDone,
    },
  ];

  if (status === 'CANCELLED') {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-sm flex items-center gap-3 text-rose-800">
        <Clock className="w-5 h-5 text-rose-600 shrink-0" />
        <div>
          <h4 className="font-bold text-sm">{t('orders.timeline.cancelledTitle')}</h4>
          <p className="text-xs text-rose-600 mt-0.5">
            {t('orders.timeline.cancelledDesc', {
              date: new Date(updatedAt || createdAt).toLocaleString(locale),
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
        <Package size={16} className="text-blue-600" />
        <span>{t('orders.timeline.statusTitle')}</span>
      </h3>
      <div className="relative">
        <div className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-slate-100" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {steps.map((st, i) => (
            <div
              key={i}
              className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 relative z-10"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition shrink-0 ${
                  st.done
                    ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-50'
                    : st.active
                      ? 'bg-amber-500 text-white shadow-sm ring-4 ring-amber-50'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {st.done ? <CheckCircle size={14} /> : i + 1}
              </div>
              <div>
                <p
                  className={`text-xs font-bold ${
                    st.active ? 'text-amber-700' : st.done ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </p>
                {st.time && <p className="text-[10px] text-slate-400 mt-0.5">{st.time}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;
