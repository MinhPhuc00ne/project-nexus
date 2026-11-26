import React from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Truck, ShieldCheck, Banknote } from 'lucide-react';
import type { CheckoutPaymentMethodType } from '@/features/orders/services/orders';

interface CheckoutPaymentMethodProps {
  paymentMethod: CheckoutPaymentMethodType;
  onSelectPaymentMethod: (m: CheckoutPaymentMethodType) => void;
  onShowNotice?: (msg: string) => void;
}

export const CheckoutPaymentMethod: React.FC<CheckoutPaymentMethodProps> = ({
  paymentMethod,
  onSelectPaymentMethod,
}) => {
  const { t } = useTranslation('commerce');
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-ink">{t('checkout.paymentMethod')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Lựa chọn 1: Thanh toán ngay qua PayOS */}
          <button
            type="button"
            onClick={() => onSelectPaymentMethod('PAYOS')}
            className={`cursor-pointer rounded-xl border p-3.5 text-left transition ${
              paymentMethod === 'PAYOS'
                ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-blue-600" />
                <span className="text-xs font-semibold text-ink">
                  {t('checkout.payosOptionTitle')}
                </span>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                PayOS VietQR
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              {t('checkout.payosOptionDesc')}
            </p>
          </button>

          {/* Lựa chọn 2: Thanh toán sau khi nhận hàng (COD) */}
          <button
            type="button"
            onClick={() => onSelectPaymentMethod('COD')}
            className={`cursor-pointer rounded-xl border p-3.5 text-left transition ${
              paymentMethod === 'COD'
                ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote
                  size={18}
                  className={paymentMethod === 'COD' ? 'text-blue-600' : 'text-slate-600'}
                />
                <span className="text-xs font-semibold text-ink">
                  {t('checkout.codOptionTitle')}
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  paymentMethod === 'COD'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t('checkout.codOptionBadge')}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              {t('checkout.codOptionDesc')}
            </p>
          </button>
        </div>
      </div>

      {/* Thông tin bảo chứng theo phương thức đã chọn */}
      {paymentMethod === 'COD' ? (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950">
          <Truck size={20} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <h4 className="mb-0.5 font-semibold text-blue-900">{t('checkout.codBannerTitle')}</h4>
            <p className="text-[11px] leading-relaxed text-blue-800">
              {t('checkout.codBannerDesc')}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-900">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <h4 className="mb-0.5 font-semibold">{t('checkout.escrowBannerTitle')}</h4>
            <p className="text-[11px] leading-relaxed text-blue-700">
              {t('checkout.escrowBannerDesc')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPaymentMethod;
