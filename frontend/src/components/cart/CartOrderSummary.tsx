import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Check, X, Truck, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { formatCurrency } from '../../i18n/formatters';
import type { CartItem } from '@/features/cart/services/cart';

interface CartOrderSummaryProps {
  selectedItems: CartItem[];
  rawSubtotal: number;
  grandTotal: number;
  shippingFee: number | null;
  isQuotingShipping: boolean;
  shippingQuoteFailed: boolean;
  hasDeliveryAddress: boolean;
  appliedVoucher: { code: string; discount: number } | null;
  onApplyVoucher: (code: string) => void;
  onRemoveVoucher: () => void;
  onProceedCheckout: () => void;
}

export default function CartOrderSummary({
  selectedItems,
  rawSubtotal,
  grandTotal,
  shippingFee,
  isQuotingShipping,
  shippingQuoteFailed,
  hasDeliveryAddress,
  appliedVoucher,
  onApplyVoucher,
  onRemoveVoucher,
  onProceedCheckout,
}: CartOrderSummaryProps) {
  const { t } = useTranslation('commerce');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');
  const voucherInputId = useId();

  const selectedQuantity = selectedItems.reduce((sum, i) => sum + i.qty, 0);

  let shippingFeeDisplay: ReactNode;
  if (appliedVoucher?.code === 'FREESHIP') {
    shippingFeeDisplay = (
      <span className="font-semibold text-blue-600">{t('cart.freeShipping')}</span>
    );
  } else if (isQuotingShipping) {
    shippingFeeDisplay = (
      <span className="font-medium text-muted italic">{t('checkout.calculatingGhn')}</span>
    );
  } else if (shippingFee !== null) {
    shippingFeeDisplay = (
      <span className="font-semibold text-ink">{formatCurrency(shippingFee)}</span>
    );
  } else if (shippingQuoteFailed) {
    shippingFeeDisplay = (
      <span className="max-w-[55%] text-right font-medium text-primary">
        {t('cart.shippingQuoteFailed')}
      </span>
    );
  } else {
    shippingFeeDisplay = (
      <span className="max-w-[55%] text-right font-medium text-muted">
        {hasDeliveryAddress
          ? t('cart.selectItemsForShippingQuote')
          : t('cart.shippingAddressNeeded')}
      </span>
    );
  }

  const totalNote =
    shippingFee !== null || appliedVoucher?.code === 'FREESHIP'
      ? t('cart.shippingIncluded')
      : t('cart.ghnFeeExcluded');

  const handleSubmitVoucher = (e: FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    setVoucherError('');
    if (!code) {
      setVoucherError(t('cart.voucherEmptyError'));
      return;
    }
    if (code === 'NEXUS500K' || code === 'FREESHIP') {
      onApplyVoucher(code);
      setVoucherCode('');
    } else {
      setVoucherError(t('cart.voucherInvalidError'));
    }
  };

  return (
    <aside className="cart-summary min-w-0 space-y-4" aria-label={t('cart.orderSummaryTitle')}>
      <div className="nexus-panel p-5">
        <label
          htmlFor={voucherInputId}
          className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"
        >
          <Tag size={17} className="text-primary" />
          {t('cart.voucherTitle')}
        </label>

        <form onSubmit={handleSubmitVoucher} className="flex gap-2 mb-2">
          <input
            id={voucherInputId}
            type="text"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
            placeholder={t('cart.voucherPlaceholder')}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-slate-50/60 px-3 text-sm font-medium uppercase placeholder:normal-case focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
          <Button type="submit" variant="secondary" className="min-h-11">
            {t('cart.applyVoucher')}
          </Button>
        </form>

        {voucherError && (
          <p role="alert" className="mt-2 text-xs text-rose-600">
            {voucherError}
          </p>
        )}
        {appliedVoucher && (
          <div className="flex items-center justify-between text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 mt-2">
            <span className="font-semibold flex items-center gap-1">
              <Check size={13} /> {appliedVoucher.code} (-
              {formatCurrency(Number(appliedVoucher.discount))})
            </span>
            <button
              type="button"
              onClick={onRemoveVoucher}
              aria-label={t('cart.removeVoucher')}
              className="ml-2 grid size-8 shrink-0 place-items-center rounded-lg text-blue-700 hover:bg-blue-100"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>

      <div className="nexus-panel space-y-5 p-5 sm:p-6">
        <h2 className="border-b border-line pb-4 text-lg font-semibold text-ink">
          {t('cart.orderSummaryTitle')}
        </h2>

        <div className="space-y-3 text-sm text-muted">
          <div className="flex justify-between gap-3">
            <span>{t('cart.subtotalSelected', { count: selectedQuantity })}</span>
            <span className="font-semibold text-ink">{formatCurrency(Number(rawSubtotal))}</span>
          </div>

          {appliedVoucher && (
            <div className="flex justify-between gap-3 text-blue-600">
              <span>{t('cart.voucherDiscount')}</span>
              <span className="font-semibold">
                -{formatCurrency(Number(appliedVoucher.discount))}
              </span>
            </div>
          )}

          <div className="flex justify-between gap-3">
            <span>{t('cart.ghnShippingFee')}</span>
            {shippingFeeDisplay}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-line pt-4">
          <span className="text-sm font-semibold text-ink">{t('checkout.total')}:</span>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums text-ink">
              {formatCurrency(Number(grandTotal))}
            </div>
            <span className="mt-1 block text-xs text-muted">{totalNote}</span>
          </div>
        </div>

        <Button
          type="button"
          disabled={selectedItems.length === 0}
          onClick={onProceedCheckout}
          size="lg"
          className="w-full"
        >
          {t('cart.proceedCheckoutCount', { count: selectedQuantity })}
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Truck size={14} className="text-blue-600" /> {t('cart.ghnInspection')}
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-blue-600" /> {t('cart.escrow100')}
          </span>
        </div>
      </div>
    </aside>
  );
}
