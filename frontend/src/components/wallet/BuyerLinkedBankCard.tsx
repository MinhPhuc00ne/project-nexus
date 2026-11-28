import { useState, type FormEvent } from 'react';
import { Landmark, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/types';
import { useAuth } from '../../contexts/AuthContext';
import { updateMyProfile } from '@/features/account/services/profile';
import type { UserProfile } from '@/features/account/types/user.types';
import Popup from '../Popup';
import { useToast } from '../ToastNotification';

interface BankFormState {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  password: string;
}

const inputClass =
  'mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

/**
 * Displays the Buyer's saved payout bank account and allows linking or updating it.
 */
export default function BuyerLinkedBankCard({ profile }: { profile: UserProfile | null }) {
  const { t } = useTranslation('buyer');
  const { refreshProfile, setProfile } = useAuth();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<BankFormState>({
    bankName: profile?.bankName ?? '',
    accountNumber: profile?.accountNumber ?? '',
    accountHolderName: profile?.accountHolderName ?? '',
    password: '',
  });

  if (!profile) return null;

  const hasLinkedBank = Boolean(
    profile.bankName && profile.accountNumber && profile.accountHolderName,
  );
  const needsPassword = profile.role === Role.SELLER;

  const openModal = () => {
    setForm({
      bankName: profile.bankName ?? '',
      accountNumber: profile.accountNumber ?? '',
      accountHolderName: profile.accountHolderName ?? '',
      password: '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const bankName = form.bankName.trim();
    const accountNumber = form.accountNumber.replace(/[\s-]+/g, '').trim();
    const accountHolderName = form.accountHolderName.trim().toUpperCase();

    if (!bankName || !accountNumber || !accountHolderName) {
      setError(t('walletPage.linkedBank.missingFieldsErr'));
      return;
    }
    if (!/^[A-Za-z0-9]{4,50}$/.test(accountNumber)) {
      setError(t('walletPage.linkedBank.invalidAccountNumberErr'));
      return;
    }
    if (needsPassword && !form.password) {
      setError(t('walletPage.linkedBank.passwordRequiredErr'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updateMyProfile({ bankName, accountNumber, accountHolderName }, form.password);
      setProfile((current) =>
        current?.id === profile.id
          ? { ...current, bankName, accountNumber, accountHolderName }
          : current,
      );
      await refreshProfile();
      toast.success(t('walletPage.linkedBank.saveSuccess'));
      setModalOpen(false);
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : t('walletPage.linkedBank.saveError');
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Landmark size={17} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t('walletPage.linkedBank.title')}</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {t('walletPage.linkedBank.subtitle')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <Pencil size={13} />
          {hasLinkedBank ? t('walletPage.linkedBank.editBtn') : t('walletPage.linkedBank.linkBtn')}
        </button>
      </div>

      {hasLinkedBank ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs sm:grid-cols-3">
          <div>
            <p className="text-[11px] text-slate-500">{t('walletPage.bankName')}</p>
            <p className="mt-0.5 font-semibold text-slate-900">{profile.bankName}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">{t('walletPage.accountNumber')}</p>
            <p className="mt-0.5 font-mono font-semibold text-slate-900">{profile.accountNumber}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">{t('walletPage.accountHolderName')}</p>
            <p className="mt-0.5 font-semibold text-slate-900">{profile.accountHolderName}</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">{t('walletPage.linkedBank.emptyDesc')}</p>
      )}

      {modalOpen && (
        <Popup
          isOpen
          onClose={() => !submitting && setModalOpen(false)}
          closeOnEsc={!submitting}
          closeOnOverlay={!submitting}
          showCloseButton={!submitting}
          title={
            <span className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Landmark className="h-4 w-4 text-blue-600" />
              {hasLinkedBank
                ? t('walletPage.linkedBank.editTitle')
                : t('walletPage.linkedBank.linkTitle')}
            </span>
          }
          size="md"
        >
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <label className="block text-xs font-semibold text-slate-700">
              {t('walletPage.bankName')}
              <input
                type="text"
                required
                maxLength={120}
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder={t('walletPage.linkedBank.bankPlaceholder')}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              {t('walletPage.accountNumber')}
              <input
                type="text"
                required
                maxLength={50}
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                placeholder={t('walletPage.linkedBank.accountNumberPlaceholder')}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              {t('walletPage.accountHolderName')}
              <input
                type="text"
                required
                maxLength={150}
                value={form.accountHolderName}
                onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                placeholder={t('walletPage.linkedBank.accountHolderPlaceholder')}
                className={`${inputClass} uppercase`}
              />
            </label>
            {needsPassword && (
              <label className="block text-xs font-semibold text-slate-700">
                {t('walletPage.linkedBank.passwordLabel')}
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClass}
                />
              </label>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('walletPage.linkedBank.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? t('walletPage.linkedBank.saving') : t('walletPage.linkedBank.save')}
              </button>
            </div>
          </form>
        </Popup>
      )}
    </section>
  );
}
