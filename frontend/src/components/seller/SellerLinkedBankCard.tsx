import { useState, type FormEvent, type ReactElement } from 'react';
import { Landmark as BankOutlined, Pencil as EditOutlined } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { updateSellerBankAccount } from '../../services/profile';
import Popup from '../Popup';
import { useToast } from '../ToastNotification';
import { useSellerSession } from './SellerSession';
import { sellerInputClass, sellerLabelClass } from './SellerResourceState';
import { Badge, Panel, SellerButton } from './SellerUI';
import useSellerAction from './useSellerAction';

interface BankFormState {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

function LinkedBankModal({
  initial,
  isEdit,
  onClose,
  onSaved,
}: {
  initial: BankFormState;
  isEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}): ReactElement {
  const { t } = useTranslation('seller');
  const toast = useToast();
  const action = useSellerAction();
  const [form, setForm] = useState<BankFormState>(initial);

  const close = (): void => {
    if (!action.pending) onClose();
  };

  function submit(event: FormEvent): void {
    event.preventDefault();
    void action.run(
      async () => {
        const bankName = form.bankName.trim();
        const accountNumber = form.accountNumber.replace(/[\s-]+/g, '').trim();
        const accountHolderName = form.accountHolderName.trim().toUpperCase();
        if (!bankName || !accountNumber || !accountHolderName) {
          throw new Error(t('finance.linkedBank.missingFieldsErr'));
        }
        if (!/^[A-Za-z0-9]{4,50}$/.test(accountNumber)) {
          throw new Error(t('finance.linkedBank.invalidAccountNumberErr'));
        }
        await updateSellerBankAccount({ bankName, accountNumber, accountHolderName });
      },
      () => {
        toast.success(t('finance.linkedBank.saveSuccess'));
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
          <BankOutlined className="text-blue-600" />
          {isEdit ? t('finance.linkedBank.editTitle') : t('finance.linkedBank.linkTitle')}
        </span>
      }
      size="md"
    >
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={action.pending} className="space-y-4 disabled:opacity-70">
          <label className={sellerLabelClass}>
            {t('finance.linkedBank.bankLabel')}
            <input
              className={sellerInputClass}
              required
              maxLength={120}
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder={t('finance.linkedBank.bankPlaceholder')}
            />
          </label>
          <label className={sellerLabelClass}>
            {t('finance.linkedBank.accountNumberLabel')}
            <input
              className={sellerInputClass}
              required
              maxLength={50}
              inputMode="text"
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder={t('finance.linkedBank.accountNumberPlaceholder')}
            />
          </label>
          <label className={sellerLabelClass}>
            {t('finance.linkedBank.accountHolderLabel')}
            <input
              className={`${sellerInputClass} uppercase`}
              required
              maxLength={150}
              value={form.accountHolderName}
              onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
              placeholder={t('finance.linkedBank.accountHolderPlaceholder')}
            />
          </label>
        </fieldset>
        {action.error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {action.error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <SellerButton secondary onClick={close} disabled={action.pending}>
            {t('finance.linkedBank.cancel')}
          </SellerButton>
          <SellerButton type="submit" disabled={action.pending}>
            {action.pending ? t('finance.linkedBank.saving') : t('finance.linkedBank.save')}
          </SellerButton>
        </div>
      </form>
    </Popup>
  );
}

export default function SellerLinkedBankCard({ onSaved }: { onSaved?: () => void }): ReactElement {
  const { t } = useTranslation('seller');
  const user = useSellerSession();
  const { refreshProfile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  const hasLinkedBank = Boolean(user.bankName && user.accountNumber && user.accountHolderName);

  function handleSaved(): void {
    void refreshProfile();
    onSaved?.();
  }

  return (
    <Panel
      title={t('finance.linkedBank.cardTitle')}
      subtitle={t('finance.linkedBank.cardSubtitle')}
      action={
        <SellerButton secondary onClick={() => setModalOpen(true)}>
          <EditOutlined className="size-3.5" aria-hidden="true" />
          {hasLinkedBank ? t('finance.linkedBank.editBtn') : t('finance.linkedBank.linkBtn')}
        </SellerButton>
      }
    >
      {hasLinkedBank ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <BankOutlined className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-0.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm text-slate-900">{user.bankName}</strong>
                <Badge tone="green">{t('finance.linkedBank.linkedBadge')}</Badge>
              </div>
              <p className="font-mono text-sm font-semibold text-slate-800">{user.accountNumber}</p>
              <p className="uppercase text-slate-500">{user.accountHolderName}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t('finance.linkedBank.autoFillHint')}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <BankOutlined className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-800">
                {t('finance.linkedBank.emptyTitle')}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{t('finance.linkedBank.emptyDesc')}</p>
            </div>
          </div>
          <SellerButton onClick={() => setModalOpen(true)}>
            {t('finance.linkedBank.linkBtn')}
          </SellerButton>
        </div>
      )}

      {modalOpen && (
        <LinkedBankModal
          initial={{
            bankName: user.bankName ?? '',
            accountNumber: user.accountNumber ?? '',
            accountHolderName: user.accountHolderName ?? '',
          }}
          isEdit={hasLinkedBank}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </Panel>
  );
}
