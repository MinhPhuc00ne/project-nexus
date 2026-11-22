import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Check, ArrowRight, Truck, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import type { CartItem } from '../../services/cart';

interface CartOrderSummaryProps {
  selectedItems: CartItem[];
  rawSubtotal: number;
  grandTotal: number;
  appliedVoucher: { code: string; discount: number } | null;
  onApplyVoucher: (code: string) => void;
  onRemoveVoucher: () => void;
  onProceedCheckout: () => void;
}

export default function CartOrderSummary({
  selectedItems,
  rawSubtotal,
  grandTotal,
  appliedVoucher,
  onApplyVoucher,
  onRemoveVoucher,
  onProceedCheckout,
}: CartOrderSummaryProps) {
  const { t } = useTranslation('commerce');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherError, setVoucherError] = useState('');

  const selectedQuantity = selectedItems.reduce((sum, i) => sum + i.qty, 0);

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
    <div className="lg:col-span-4 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Tag size={15} className="text-[#f24e1e]" />
          {t('cart.voucherTitle')}
        </h3>

        <form onSubmit={handleSubmitVoucher} className="flex gap-2 mb-2">
          <input
            type="text"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
            placeholder={t('cart.voucherPlaceholder')}
            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#f24e1e] uppercase font-semibold"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            {t('cart.applyVoucher')}
          </button>
        </form>

        {voucherError && <p className="text-[11px] text-red-500">{voucherError}</p>}
        {appliedVoucher && (
          <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 mt-2">
            <span className="font-bold flex items-center gap-1">
              <Check size={13} /> {appliedVoucher.code} (-
              {formatCurrency(Number(appliedVoucher.discount))})
            </span>
            <button
              type="button"
              onClick={onRemoveVoucher}
              className="text-slate-400 hover:text-red-500 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
          {t('cart.orderSummaryTitle')}
        </h3>

        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>{t('cart.subtotalSelected', { count: selectedQuantity })}</span>
            <span className="font-semibold text-slate-800">
              {formatCurrency(Number(rawSubtotal))}
            </span>
          </div>

          {appliedVoucher && (
            <div className="flex justify-between text-emerald-600">
              <span>{t('cart.voucherDiscount')}</span>
              <span className="font-bold">-{formatCurrency(Number(appliedVoucher.discount))}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>{t('cart.ghnShippingFee')}</span>
            {appliedVoucher?.code === 'FREESHIP' ? (
              <span className="font-semibold text-emerald-600">{t('cart.freeShipping')}</span>
            ) : (
              <span className="font-medium text-slate-500 italic">
                {t('cart.calculatedAtCheckout')}
              </span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
          <span className="text-sm font-bold text-slate-900">{t('checkout.total')}:</span>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-[#f24e1e]">
              {formatCurrency(Number(grandTotal))}
            </div>
            <span className="text-[10px] text-slate-400 block">
              {appliedVoucher?.code === 'FREESHIP'
                ? t('cart.vatAndEscrowIncluded')
                : t('cart.ghnFeeExcluded')}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={selectedItems.length === 0}
          onClick={onProceedCheckout}
          className={`w-full py-4 rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
            selectedItems.length === 0
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-[#f24e1e] hover:bg-[#d63b0e] text-white hover:shadow-lg'
          }`}
        >
          {t('cart.proceedCheckoutCount', { count: selectedQuantity })}
          <ArrowRight size={16} />
        </button>

        <div className="flex items-center justify-center gap-4 text-xs text-slate-500 pt-2">
          <span className="flex items-center gap-1">
            <Truck size={14} className="text-blue-600" /> {t('cart.ghnInspection')}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" /> {t('cart.escrow100')}
          </span>
        </div>
      </div>
    </div>
  );
}
