import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../../i18n/formatters';
import type {
  AdminAuctionItem,
  ReviewAuctionItemInput,
} from '@/features/auction/services/auction.service';
import { Button } from '../shared/AdminUI';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm';

export default function ReviewAuctionItemForm({
  item,
  busy,
  onReview,
}: {
  item: AdminAuctionItem;
  busy: boolean;
  onReview: (itemId: string, data: ReviewAuctionItemInput) => Promise<void>;
}) {
  const { t, i18n } = useTranslation('admin');
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState('');
  const money = (value: number | string) => formatCurrency(Number(value), i18n.language);

  async function submit(
    event: FormEvent<HTMLFormElement>,
    action: 'APPROVE' | 'REJECT',
  ): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setError('');
    const values = new FormData(event.currentTarget);
    try {
      let payload: ReviewAuctionItemInput;
      if (action === 'REJECT') {
        const reason = String(values.get('reason') || '').trim();
        if (!reason) throw new Error(t('auctions.reviewForm.errRejectReason'));
        payload = { action, rejectionReason: reason };
      } else {
        const lot = String(values.get('lot') || '').trim();
        const lotNumber = lot ? Number(lot) : undefined;
        if (lotNumber !== undefined && (!Number.isSafeInteger(lotNumber) || lotNumber < 1))
          throw new Error(t('auctions.reviewForm.errLotNumber'));
        payload = lotNumber === undefined ? { action } : { action, lotNumber };
      }
      await onReview(item.id, payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('auctions.reviewForm.errProcess'));
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <p className="text-xs font-semibold text-slate-600">
        {t('auctions.reviewForm.sellerProposal')}
      </p>
      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">{t('auctions.reviewForm.startingPrice')}</dt>
          <dd className="mt-1 font-medium">{money(item.proposedStartingPrice)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('auctions.reviewForm.reservePrice')}</dt>
          <dd className="mt-1 font-medium">
            {Number(item.proposedReservePrice) > 0
              ? money(item.proposedReservePrice!)
              : t('auctions.common.none')}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('auctions.reviewForm.bidIncrement')}</dt>
          <dd className="mt-1 font-medium">{money(item.proposedBidIncrement)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">{t('auctions.reviewForm.lotNumber')}</dt>
          <dd className="mt-1 font-medium">
            {item.lotNumber ?? t('auctions.reviewForm.autoAssign')}
          </dd>
        </div>
      </dl>
      <form onSubmit={(event) => void submit(event, 'APPROVE')}>
        <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
          <label className="block text-xs">
            {t('auctions.reviewForm.lotNumber')}
            <input
              name="lot"
              type="number"
              min="1"
              step="1"
              defaultValue={item.lotNumber ?? ''}
              className={inputClass}
            />
          </label>
          <div className="flex gap-3">
            <Button type="submit">
              {busy ? t('auctions.reviewForm.processing') : t('auctions.reviewForm.approve')}
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                setRejecting(!rejecting);
                setError('');
              }}
            >
              {t('auctions.reviewForm.reject')}
            </Button>
          </div>
        </fieldset>
      </form>
      {rejecting && (
        <form
          onSubmit={(event) => void submit(event, 'REJECT')}
          className="rounded-lg bg-red-50 p-3"
        >
          <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
            <label className="block text-xs">
              {t('auctions.reviewForm.rejectReasonLabel')}
              <textarea autoFocus name="reason" required rows={3} className={inputClass} />
            </label>
            <div className="flex gap-3">
              <Button type="submit" variant="danger">
                {busy
                  ? t('auctions.reviewForm.processing')
                  : t('auctions.reviewForm.confirmReject')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setRejecting(false);
                  setError('');
                }}
              >
                {t('auctions.common.cancel')}
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
