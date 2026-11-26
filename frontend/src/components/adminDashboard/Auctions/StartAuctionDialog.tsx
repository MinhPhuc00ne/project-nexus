import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AdminAuctionEntity } from '@/features/auction/services/auction.service';
import Popup from '../../Popup';
import { Button } from '../shared/AdminUI';
import { minEndDateTime } from '../../../utils/date-time';

export default function StartAuctionDialog({
  auction,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  auction: AdminAuctionEntity;
  pending: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (endTime: string) => Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [endTime, setEndTime] = useState(() => {
    const date = new Date(auction.endTime);
    if (!Number.isFinite(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const earliest = Math.max(
    Date.now() + 60_000,
    Date.parse(auction.startTime),
    auction.consignmentDeadline ? Date.parse(auction.consignmentDeadline) : 0,
  );
  return (
    <Popup
      isOpen
      title={t('auctions.start.title')}
      size="md"
      onClose={() => {
        if (!pending) onClose();
      }}
      closeOnEsc={!pending}
      closeOnOverlay={!pending}
      showCloseButton={!pending}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending) void onConfirm(endTime);
        }}
      >
        <p className="text-sm font-semibold text-ink">{auction.title}</p>
        <p className="text-sm leading-6 text-slate-500">{t('auctions.start.hint')}</p>
        <label className="block text-sm font-medium text-ink">
          {t('auctions.start.endLabel')}
          <input
            type="datetime-local"
            required
            disabled={pending}
            value={endTime}
            min={minEndDateTime(new Date(earliest).toISOString())}
            onChange={(event) => setEndTime(event.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-slate-50 px-3 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <p className="text-xs leading-5 text-slate-500">{t('auctions.start.bannerHint')}</p>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
            {t('auctions.common.cancel')}
          </Button>
          <Button type="submit" disabled={pending || !endTime}>
            {t(pending ? 'management.starting' : 'auctions.start.confirm')}
          </Button>
        </div>
      </form>
    </Popup>
  );
}
