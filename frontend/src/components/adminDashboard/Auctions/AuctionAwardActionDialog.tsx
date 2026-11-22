import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../../i18n/config';
import { formatCurrency } from '../../../i18n/formatters';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import {
  canConfirmAwardAction,
  type AdminAuctionAward,
  type AwardAction,
} from '../../../types/admin-auction-operations.types';

type Props = {
  award: AdminAuctionAward;
  action: AwardAction;
  pending: boolean;
  blocked: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (note: string) => void;
};

export default function AuctionAwardActionDialog({
  award,
  action,
  pending,
  blocked,
  error,
  onClose,
  onConfirm,
}: Props) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const paymentDefault = action === 'payment-default';
  const eligible = canConfirmAwardAction(award, action);
  return (
    <Popup
      isOpen
      size="lg"
      title={
        paymentDefault
          ? t('auctions.awardDialog.titleDefault')
          : t('auctions.awardDialog.titleWithdraw')
      }
      onClose={() => {
        if (!pending) onClose();
      }}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
      showCloseButton={!pending}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || blocked || !eligible) return;
          onConfirm(String(new FormData(event.currentTarget).get('note') ?? ''));
        }}
      >
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-semibold">
            {award.auctionItem?.lotNumber
              ? `${t('auctions.common.lotPrefix', { number: award.auctionItem.lotNumber })} · `
              : ''}
            {award.auctionItem?.title ?? t('auctions.awardsPanel.fallbackItemTitle')}
          </p>
          <p className="mt-1">
            {t('auctions.awardDialog.buyer', { name: award.buyer?.fullName ?? '—' })}
          </p>
          <p className="mt-1">
            {t('auctions.awardDialog.deposit', {
              amount: formatCurrency(Number(award.depositAmount), i18n.language),
            })}
          </p>
          <p className="mt-1">
            {t('auctions.awardDialog.deadline', {
              time: new Date(award.expiresAt).toLocaleString(locale),
            })}
          </p>
        </div>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {paymentDefault
            ? t('auctions.awardDialog.warningDefault')
            : t('auctions.awardDialog.warningWithdraw')}
        </p>
        <label className="block text-sm font-medium">
          {t('auctions.awardDialog.noteLabel')}
          <textarea
            name="note"
            maxLength={1000}
            rows={3}
            disabled={pending}
            placeholder={t('auctions.awardDialog.notePlaceholder')}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal"
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" required disabled={pending} className="mt-1" />
          {t('auctions.awardDialog.confirmCheckbox')}
        </label>
        {!eligible && (
          <p role="alert" className="text-sm text-red-700">
            {t('auctions.awardDialog.ineligible')}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
            {t('auctions.common.cancel')}
          </Button>
          <Button type="submit" variant="danger" disabled={pending || blocked || !eligible}>
            {pending
              ? t('auctions.reviewForm.processing')
              : paymentDefault
                ? t('auctions.awardDialog.titleDefault')
                : t('auctions.awardDialog.confirmWithdrawBtn')}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
