import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, QrCode, Clock, Banknote, CreditCard, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import {
  checkPaymentStatusApi,
  type BuyerOrder,
  type PayosPaymentInfo,
} from '@/features/orders/services/orders';
import PayosQrModal from './PayosQrModal';

export interface CheckoutSuccessCardProps {
  orders: BuyerOrder[];
  isCod: boolean;
  payosPayment: PayosPaymentInfo | null;
  grandTotal: number;
  showToast: (msg: string) => void;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  onPaymentCompleted?: () => void;
}

export const CheckoutSuccessCard: React.FC<CheckoutSuccessCardProps> = ({
  orders,
  isCod,
  payosPayment,
  grandTotal,
  showToast,
  primaryAction,
  secondaryAction,
  onPaymentCompleted,
}) => {
  const { t } = useTranslation('commerce');
  const [isPaid, setIsPaid] = useState(false);
  const targetOrderId = payosPayment?.orderId || orders[0]?.id;

  useEffect(() => {
    if (!targetOrderId || isCod || isPaid || !payosPayment) return;
    let isCancelled = false;

    const checkStatus = async () => {
      try {
        const res = await checkPaymentStatusApi(targetOrderId);
        if (!isCancelled && res.paid) {
          setIsPaid(true);
          showToast(t('checkout.payosSuccessToast'));
          if (onPaymentCompleted) onPaymentCompleted();
        }
      } catch {
        // Polling failure can be ignored silently to retry on next tick
      }
    };

    const intervalId = window.setInterval(() => {
      void checkStatus();
    }, 2500);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [targetOrderId, isCod, isPaid, payosPayment, showToast, onPaymentCompleted, t]);

  const orderCodes = orders
    .map((o) => o.orderNumber)
    .filter(Boolean)
    .join(', ');

  const renderIcon = () => {
    if (isPaid) {
      return (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
          <CheckCircle2 size={36} className="text-emerald-600" />
        </div>
      );
    }
    if (isCod) {
      return (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
          <Truck size={34} />
        </div>
      );
    }
    if (payosPayment) {
      return (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner">
          <QrCode size={34} />
        </div>
      );
    }
    return (
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-inner">
        <Clock size={34} />
      </div>
    );
  };

  const renderHeader = () => {
    if (isPaid) {
      return (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            {t('checkout.paidTitle')}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {orderCodes
              ? t('checkout.paidDescWithCode', { codes: orderCodes })
              : t('checkout.paidDescDefault')}
          </p>
        </div>
      );
    }
    if (isCod) {
      return (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            {t('checkout.codTitle')}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {orderCodes
              ? t('checkout.codDescWithCode', { codes: orderCodes })
              : t('checkout.codDescDefault')}
          </p>
        </div>
      );
    }
    if (payosPayment) {
      return (
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
            {t('checkout.qrCreatedTitle')}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {orderCodes
              ? t('checkout.qrCreatedDescWithCode', { codes: orderCodes })
              : t('checkout.qrCreatedDescDefault')}
          </p>
        </div>
      );
    }
    return (
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
          {t('checkout.orderCreatedTitle')}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {orderCodes
            ? t('checkout.orderCreatedDescWithCode', { codes: orderCodes })
            : t('checkout.orderCreatedDescDefault')}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-center text-slate-800">
      {renderIcon()}
      {renderHeader()}

      {isCod ? (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-left text-xs sm:p-5">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
            <div className="flex items-center gap-2">
              <Banknote className="text-emerald-700" size={20} />
              <span className="font-bold text-emerald-950">{t('checkout.codAmountDue')}</span>
            </div>
            <span className="text-base font-black text-[#f24e1e] sm:text-lg">
              {formatCurrency(Number(grandTotal || 0))}
            </span>
          </div>

          <div className="space-y-2 pt-1 text-[11px] leading-relaxed text-emerald-900">
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-700">•</span>
              <span>
                <strong>{t('checkout.codBulletMethod')}</strong> {t('checkout.codBulletMethodDesc')}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-700">•</span>
              <span>
                <strong>{t('checkout.codBulletPrepare')}</strong>{' '}
                {t('checkout.codBulletPrepareDesc')}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-emerald-700">•</span>
              <span>
                <strong>{t('checkout.codBulletInspect')}</strong>{' '}
                {t('checkout.codBulletInspectDesc')}
              </span>
            </div>
          </div>
        </div>
      ) : isPaid ? (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-left text-xs">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="text-emerald-700" size={20} />
              <span className="font-bold text-emerald-950">{t('checkout.payosMethod247')}</span>
            </div>
            <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-0.5 text-[11px] font-extrabold text-emerald-800">
              {t('checkout.paidBadge')}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">{t('checkout.amountPaid')}</span>
            <span className="text-base font-black text-emerald-700">
              {formatCurrency(Number(grandTotal || 0))}
            </span>
          </div>
          <div className="space-y-1.5 pt-1 text-[11px] leading-relaxed text-emerald-900">
            <p>• {t('checkout.paidBulletEscrow')}</p>
            <p>• {t('checkout.paidBulletShipping')}</p>
          </div>
        </div>
      ) : payosPayment ? (
        <PayosQrModal payment={payosPayment} onCopySuccess={showToast} />
      ) : (
        <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-5 text-left text-xs">
          <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="text-blue-700" size={20} />
              <span className="font-bold text-blue-950">{t('checkout.payosMethodLabel')}</span>
            </div>
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              {t('checkout.pendingPaymentBadge')}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">{t('checkout.orderTotalAmount')}</span>
            <span className="text-base font-extrabold text-[#f24e1e]">
              {formatCurrency(Number(grandTotal || 0))}
            </span>
          </div>
          <p className="pt-1 text-[11px] leading-relaxed text-blue-900">
            {t('checkout.pendingPaymentNote')}
          </p>
        </div>
      )}

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};

export default CheckoutSuccessCard;
