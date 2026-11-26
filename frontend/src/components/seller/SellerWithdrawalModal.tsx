import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Landmark as BankOutlined } from 'lucide-react';
import { ShieldCheck as SafetyCertificateOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Popup from '../Popup';
import { useToast } from '../ToastNotification';
import { createSellerWithdrawal } from '@/features/wallet/services/sellerFinance';
import { SellerButton } from './SellerUI';
import { useSellerSession } from './SellerSession';
import { financeMoney } from './financeFormat';
import useSellerAction from './useSellerAction';
import { sellerInputClass, sellerLabelClass } from './SellerResourceState';

export default function SellerWithdrawalModal({
  balance,
  suspended,
  onClose,
  onSaved,
}: {
  balance: number;
  suspended: boolean;
  onClose: () => void;
  onSaved: () => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const dirtyBankFields = useRef({
    bankName: false,
    accountNumber: false,
    accountHolderName: false,
  });
  const [form, setForm] = useState({
    amount: '',
    bankName: user.bankName ?? '',
    accountNumber: user.accountNumber ?? '',
    accountHolderName: user.accountHolderName ?? '',
    note: '',
  });
  useEffect(() => {
    setForm((current) => ({
      ...current,
      bankName: dirtyBankFields.current.bankName ? current.bankName : (user.bankName ?? ''),
      accountNumber: dirtyBankFields.current.accountNumber
        ? current.accountNumber
        : (user.accountNumber ?? ''),
      accountHolderName: dirtyBankFields.current.accountHolderName
        ? current.accountHolderName
        : (user.accountHolderName ?? ''),
    }));
  }, [user.accountHolderName, user.accountNumber, user.bankName]);
  const action = useSellerAction();
  const toast = useToast();
  const close = (): void => {
    if (!action.pending) onClose();
  };
  function submit(event: FormEvent): void {
    event.preventDefault();
    void action.run(
      async () => {
        if (suspended) throw new Error(t('finance.withdrawalModal.suspendedErr'));
        const amount = Number(form.amount);
        if (!Number.isSafeInteger(amount) || amount < 50000)
          throw new Error(t('finance.withdrawalModal.minAmountErr'));
        if (amount > balance) throw new Error(t('finance.withdrawalModal.exceedBalanceErr'));
        const bankName = form.bankName.trim();
        const accountNumber = form.accountNumber.trim();
        const accountHolderName = form.accountHolderName.trim().toUpperCase();
        if (!bankName || !accountNumber || !accountHolderName)
          throw new Error(t('finance.withdrawalModal.missingBankErr'));
        return createSellerWithdrawal({
          amount,
          bankName,
          accountNumber,
          accountHolderName,
          ...(form.note.trim() ? { note: form.note.trim() } : {}),
        });
      },
      (result) => {
        toast.success(result.message);
        onSaved();
        onClose();
      },
    );
  }
  return (
    <Popup
      isOpen
      onClose={close}
      closeOnEsc={!action.pending}
      closeOnOverlay={!action.pending}
      showCloseButton={!action.pending}
      title={
        <span className="flex items-center gap-2">
          <BankOutlined className="text-blue-600" /> {t('finance.withdrawalModal.title')}
        </span>
      }
      size="md"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs text-blue-600">{t('finance.withdrawalModal.availableBalance')}</p>
          <strong className="mt-1 block text-2xl text-blue-800">{financeMoney(balance)}</strong>
        </div>
        <fieldset disabled={action.pending || suspended} className="space-y-4 disabled:opacity-70">
          <label className={sellerLabelClass}>
            {t('finance.withdrawalModal.amountLabel')}
            <input
              className={sellerInputClass}
              type="number"
              min={50000}
              max={balance}
              step={1}
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder={t('finance.withdrawalModal.amountPlaceholder')}
            />
          </label>
          <label className={sellerLabelClass}>
            {t('finance.withdrawalModal.bankLabel')}
            <input
              className={sellerInputClass}
              required
              maxLength={120}
              value={form.bankName}
              onChange={(e) => {
                dirtyBankFields.current.bankName = true;
                setForm({ ...form, bankName: e.target.value });
              }}
              placeholder={t('finance.withdrawalModal.bankPlaceholder')}
            />
          </label>
          <label className={sellerLabelClass}>
            {t('finance.withdrawalModal.accountNumberLabel')}
            <input
              className={sellerInputClass}
              required
              maxLength={50}
              inputMode="numeric"
              value={form.accountNumber}
              onChange={(e) => {
                dirtyBankFields.current.accountNumber = true;
                setForm({ ...form, accountNumber: e.target.value });
              }}
            />
          </label>
          <label className={sellerLabelClass}>
            {t('finance.withdrawalModal.accountHolderLabel')}
            <input
              className={`${sellerInputClass} uppercase`}
              required
              maxLength={150}
              value={form.accountHolderName}
              onChange={(e) => {
                dirtyBankFields.current.accountHolderName = true;
                setForm({ ...form, accountHolderName: e.target.value });
              }}
              placeholder={t('finance.withdrawalModal.accountHolderPlaceholder')}
            />
          </label>
          <label className={sellerLabelClass}>
            {t('finance.withdrawalModal.noteLabel')}
            <textarea
              className={sellerInputClass}
              rows={2}
              maxLength={500}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
        </fieldset>
        <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-500">
          <SafetyCertificateOutlined className="mt-1 text-blue-600" />
          {t('finance.withdrawalModal.escrowNotice')}
        </p>
        {(action.error || suspended) && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {action.error || t('finance.withdrawalModal.suspendedShort')}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <SellerButton secondary onClick={close} disabled={action.pending}>
            {t('finance.withdrawalModal.cancel')}
          </SellerButton>
          <SellerButton type="submit" disabled={action.pending || suspended || balance < 50000}>
            {action.pending
              ? t('finance.withdrawalModal.submitting')
              : t('finance.withdrawalModal.submit')}
          </SellerButton>
        </div>
      </form>
    </Popup>
  );
}
