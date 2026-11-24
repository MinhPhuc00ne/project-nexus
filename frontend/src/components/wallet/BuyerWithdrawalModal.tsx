import { useState, type FormEvent } from 'react';
import { Landmark, ShieldCheck, X, WalletCards } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import type { UserProfile } from '../../types/user.types';
import type { BuyerWithdrawalInput } from '../../services/wallet.service';

interface BuyerWithdrawalModalProps {
  balance: number;
  profile: UserProfile | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (input: BuyerWithdrawalInput) => void;
}

const inputClass =
  'mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';

export default function BuyerWithdrawalModal({
  balance,
  profile,
  submitting,
  onClose,
  onSubmit,
}: BuyerWithdrawalModalProps) {
  const { t, i18n } = useTranslation('buyer');
  const hasSavedBankInfo = Boolean(
    profile?.bankName && profile.accountNumber && profile.accountHolderName,
  );
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState(profile?.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState(profile?.accountNumber ?? '');
  const [accountHolderName, setAccountHolderName] = useState(
    profile?.accountHolderName ?? profile?.fullName?.toUpperCase() ?? '',
  );
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const quickAmounts = [100000, 500000, 1000000];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const withdrawAmount = Number(amount);
    if (!Number.isSafeInteger(withdrawAmount) || withdrawAmount <= 0) {
      setFormError(t('walletPage.invalidWithdrawalAmount'));
      return;
    }
    if (withdrawAmount > balance) {
      setFormError(t('walletPage.insufficientWithdrawalBalance'));
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      setFormError(t('walletPage.missingBankDetails'));
      return;
    }
    setFormError('');
    onSubmit({
      amount: withdrawAmount,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountHolderName: accountHolderName.trim().toUpperCase(),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-withdrawal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="-m-5 mb-0 flex items-start justify-between border-b border-slate-100 bg-slate-50/80 p-5 sm:-m-6 sm:mb-0 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <WalletCards size={19} />
            </span>
            <div>
              <h2 id="buyer-withdrawal-title" className="text-sm font-bold text-slate-900">
                {t('walletPage.withdrawalTitle')}
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                {t('walletPage.withdrawalSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('walletPage.cancel')}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-3.5">
          <div>
            <span className="text-[11px] font-medium text-blue-700">
              {t('walletPage.availableBalance')}
            </span>
            <strong className="mt-1 block text-lg leading-tight text-blue-950">
              {formatCurrency(balance, i18n.language)}
            </strong>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-blue-600">
            <Landmark size={17} />
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-slate-700">
            {t('walletPage.withdrawalAmount')}
            <input
              className={`${inputClass} text-base font-semibold`}
              type="number"
              min="1"
              max={balance}
              step="1"
              inputMode="numeric"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={submitting}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((quickAmount) => (
              <button
                key={quickAmount}
                type="button"
                disabled={submitting || quickAmount > balance}
                onClick={() => setAmount(String(quickAmount))}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                  amount === String(quickAmount)
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50/50'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {formatCurrency(quickAmount, i18n.language)}
              </button>
            ))}
            {balance > 0 && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setAmount(String(balance))}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold transition ${
                  amount === String(balance)
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50/50'
                }`}
              >
                {t('walletPage.withdrawAll')}
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700">
              {t('walletPage.bankName')}
              <input
                className={inputClass}
                maxLength={120}
                required
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                disabled={submitting || hasSavedBankInfo}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              {t('walletPage.accountNumber')}
              <input
                className={inputClass}
                maxLength={50}
                inputMode="numeric"
                required
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                disabled={submitting || hasSavedBankInfo}
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-700">
            {t('walletPage.accountHolderName')}
            <input
              className={`${inputClass} uppercase`}
              maxLength={150}
              required
              value={accountHolderName}
              onChange={(event) => setAccountHolderName(event.target.value)}
              disabled={submitting || hasSavedBankInfo}
            />
          </label>

          {hasSavedBankInfo ? (
            <p className="text-[11px] text-slate-500">{t('walletPage.savedBankInfoNotice')}</p>
          ) : (
            <p className="text-[11px] text-slate-500">{t('walletPage.bankInfoSaveNotice')}</p>
          )}

          <label className="block text-xs font-semibold text-slate-700">
            {t('walletPage.withdrawalNote')}
            <textarea
              className={`${inputClass} resize-y`}
              rows={2}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={submitting}
            />
          </label>

          <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-blue-600" />
            {t('walletPage.withdrawalHoldNotice')}
          </p>

          {formError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('walletPage.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting || balance <= 0}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-50"
            >
              {submitting ? t('walletPage.submittingWithdrawal') : t('walletPage.submitWithdrawal')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
