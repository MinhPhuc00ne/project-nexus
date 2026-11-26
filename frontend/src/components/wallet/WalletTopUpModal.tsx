import { useLayoutEffect, useRef, useState } from 'react';
import { Loader2, Building2, X, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import type { WalletDepositProvider } from '@/features/wallet/services/wallet.service';

interface WalletTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  topUpAmount: string;
  setTopUpAmount: (val: string) => void;
  selectedMethod: WalletDepositProvider;
  setSelectedMethod: (val: WalletDepositProvider) => void;
  onConfirm: () => void;
  submitting: boolean;
}

const quickAmounts = [200000, 500000, 1000000, 2000000];
const MAX_AMOUNT_DIGITS = 10;

function extractAmountDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, MAX_AMOUNT_DIGITS);
  return digits.replace(/^0+(?=\d)/, '');
}

function formatAmountWithDots(raw: string): string {
  const digits = extractAmountDigits(raw);
  if (!digits) return '';
  let result = '';
  for (let index = 0; index < digits.length; index += 1) {
    if (index > 0 && (digits.length - index) % 3 === 0) {
      result += '.';
    }
    result += digits[index];
  }
  return result;
}

export default function WalletTopUpModal({
  isOpen,
  onClose,
  topUpAmount,
  setTopUpAmount,
  selectedMethod,
  setSelectedMethod,
  onConfirm,
  submitting,
}: WalletTopUpModalProps) {
  const { t } = useTranslation('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigitOffsetRef = useRef<number | null>(null);
  const [composingValue, setComposingValue] = useState<string | null>(null);
  const formattedAmount = formatAmountWithDots(topUpAmount);
  const displayValue = composingValue ?? formattedAmount;

  useLayoutEffect(() => {
    const input = inputRef.current;
    const targetDigits = caretDigitOffsetRef.current;
    if (!input || targetDigits === null || composingValue !== null) return;
    caretDigitOffsetRef.current = null;

    let digitsSeen = 0;
    let nextCursor = formattedAmount.length;
    for (let i = 0; i < formattedAmount.length; i += 1) {
      if (digitsSeen >= targetDigits) {
        nextCursor = i;
        break;
      }
      if (formattedAmount[i] >= '0' && formattedAmount[i] <= '9') {
        digitsSeen += 1;
      }
    }
    input.setSelectionRange(nextCursor, nextCursor);
  }, [composingValue, formattedAmount]);

  if (!isOpen) return null;

  const topUpMethods = [
    {
      id: 'PAYOS',
      icon: Building2,
      label: t('walletTopUp.payosLabel'),
      desc: t('walletTopUp.payosDesc'),
    },
  ] satisfies Array<{
    id: WalletDepositProvider;
    icon: typeof Building2;
    label: string;
    desc: string;
  }>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-fade-in"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-topup-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <WalletCards size={19} />
            </span>
            <div>
              <h3 id="wallet-topup-title" className="text-sm font-bold text-slate-900">
                {t('walletTopUp.title')}
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">{t('walletTopUp.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('walletTopUp.cancel')}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div>
            <label
              htmlFor="wallet-topup-amount"
              className="mb-2 block text-xs font-semibold text-slate-700"
            >
              {t('walletTopUp.amountLabel')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  aria-pressed={topUpAmount === String(amt)}
                  onClick={() => setTopUpAmount(String(amt))}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                    topUpAmount === String(amt)
                      ? 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50/50'
                  }`}
                >
                  {formatCurrency(amt)}
                </button>
              ))}
            </div>

            <div className="relative mt-3">
              <input
                ref={inputRef}
                id="wallet-topup-amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={t('walletTopUp.otherAmountPlaceholder')}
                value={displayValue}
                onCompositionStart={(e) => {
                  setComposingValue(e.currentTarget.value);
                }}
                onCompositionEnd={(e) => {
                  const raw = e.currentTarget.value;
                  setComposingValue(null);
                  caretDigitOffsetRef.current = null;
                  setTopUpAmount(extractAmountDigits(raw));
                }}
                onChange={(e) => {
                  const raw = e.target.value;
                  if ((e.nativeEvent as InputEvent | undefined)?.isComposing) {
                    setComposingValue(raw);
                    return;
                  }
                  const cursor = e.target.selectionStart ?? raw.length;
                  if (cursor < raw.length) {
                    const digitsBeforeCursor = raw.slice(0, cursor).replace(/\D/g, '').length;
                    caretDigitOffsetRef.current = Math.min(digitsBeforeCursor, MAX_AMOUNT_DIGITS);
                  } else {
                    caretDigitOffsetRef.current = null;
                  }
                  setTopUpAmount(extractAmountDigits(raw));
                }}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-xs placeholder:font-normal focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 disabled:opacity-60"
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-semibold text-slate-700">
              {t('walletTopUp.methodTitle')}
            </legend>
            {topUpMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                aria-pressed={selectedMethod === method.id}
                onClick={() => setSelectedMethod(method.id)}
                disabled={submitting}
                className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${
                  selectedMethod === method.id
                    ? 'border-orange-400 bg-orange-50/80 ring-2 ring-orange-100'
                    : 'border-slate-200 hover:border-orange-200 hover:bg-slate-50'
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-orange-600 shadow-sm">
                  <method.icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-800">{method.label}</span>
                  <span className="mt-1 block text-[11px] text-slate-500">{method.desc}</span>
                </span>
                <span
                  className={`h-4 w-4 rounded-full border-2 ${
                    selectedMethod === method.id
                      ? 'border-orange-500 bg-orange-500 shadow-[inset_0_0_0_3px_white]'
                      : 'border-slate-300'
                  }`}
                />
              </button>
            ))}
          </fieldset>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {t('walletTopUp.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {submitting ? t('walletTopUp.submitting') : t('walletTopUp.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
