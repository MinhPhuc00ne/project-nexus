import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../../i18n/config';
import {
  listAdminAuctionComplaintsApi,
  resolveAdminAuctionComplaintApi,
} from '@/features/auction/services/auction.service';
import {
  AUCTION_COMPLAINT_STATES,
  type AuctionComplaintState,
} from '../../../types/admin-auction-operations.types';
import { Badge, Button, EmptyState, Panel } from '../shared/AdminUI';
import { useAuctionOperationResource } from './useAuctionOperationResource';

export default function AuctionComplaintsPanel({
  auctionId,
  refreshKey,
  realtimeConnected,
}: {
  auctionId: string;
  refreshKey: number;
  realtimeConnected: boolean;
}) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const [status, setStatus] = useState<AuctionComplaintState | ''>('');
  const [selection, setSelection] = useState<{
    id: string;
    decision: 'ACCEPTED' | 'REJECTED';
  } | null>(null);
  const load = useCallback(
    () => listAdminAuctionComplaintsApi(auctionId, status),
    [auctionId, status],
  );
  const resource = useAuctionOperationResource(load, refreshKey, realtimeConnected);
  return (
    <Panel
      title={t('auctions.complaintsPanel.title')}
      subtitle={t('auctions.complaintsPanel.subtitle')}
      action={
        <Button
          variant="secondary"
          disabled={resource.loading || resource.pending}
          onClick={resource.refresh}
        >
          {t('auctions.common.refresh')}
        </Button>
      }
    >
      <select
        aria-label={t('auctions.complaintsPanel.filterAria')}
        value={status}
        disabled={resource.pending}
        onChange={(event) => {
          setStatus(event.target.value as AuctionComplaintState | '');
          setSelection(null);
        }}
        className="mb-4 rounded-lg border border-slate-200 p-3 text-xs"
      >
        <option value="">{t('auctions.complaintsPanel.allStatuses')}</option>
        {AUCTION_COMPLAINT_STATES.map((value) => (
          <option key={value} value={value}>
            {t(`auctions.complaintStates.${value}`)}
          </option>
        ))}
      </select>
      {resource.loading && (
        <p role="status" className="mb-3 text-sm text-slate-500">
          {t('auctions.complaintsPanel.loading')}
        </p>
      )}
      {(resource.error || resource.actionError) && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {resource.error || resource.actionError}
        </p>
      )}
      {resource.notice && (
        <p role="status" className="mb-3 text-sm text-emerald-700">
          {resource.notice}
        </p>
      )}
      {!resource.loading && !resource.error && !resource.rows.length && (
        <EmptyState text={t('auctions.complaintsPanel.empty')} />
      )}
      <div className="space-y-4">
        {resource.rows.map((complaint) => (
          <article key={complaint.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-semibold">{complaint.reporter.fullName}</h3>
                <p className="text-xs text-slate-500">
                  {complaint.reporter.email} ·{' '}
                  {new Date(complaint.createdAt).toLocaleString(locale)}
                </p>
              </div>
              <Badge
                tone={
                  complaint.status === 'OPEN'
                    ? 'amber'
                    : complaint.status === 'ACCEPTED'
                      ? 'green'
                      : 'red'
                }
              >
                {t(`auctions.complaintStates.${complaint.status}`)}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {complaint.auctionItem
                ? `${t('auctions.common.lotPrefix', { number: complaint.auctionItem.lotNumber ?? '—' })} · ${complaint.auctionItem.title}`
                : t('auctions.complaintsPanel.generalComplaint')}
            </p>
            <p className="whitespace-pre-wrap break-words text-sm">{complaint.reason}</p>
            {!!complaint.evidenceUrls.length && (
              <div className="flex flex-wrap gap-3">
                {complaint.evidenceUrls.map(
                  (url, index) =>
                    /^https?:\/\//i.test(url) && (
                      <a
                        key={`${url}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        {t('auctions.complaintsPanel.evidence', { index: index + 1 })}
                      </a>
                    ),
                )}
              </div>
            )}
            {complaint.adminNote && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm">
                {t('auctions.complaintsPanel.adminNote', { note: complaint.adminNote })}
              </p>
            )}
            {complaint.handledBy && (
              <p className="text-xs text-slate-500">
                {t('auctions.complaintsPanel.handledBy', { name: complaint.handledBy.fullName })}
                {complaint.handledAt
                  ? ` · ${new Date(complaint.handledAt).toLocaleString(locale)}`
                  : ''}
              </p>
            )}
            {complaint.status === 'OPEN' && (
              <div className="flex gap-2">
                <Button
                  disabled={resource.pending || resource.loading || !!resource.error}
                  onClick={() => setSelection({ id: complaint.id, decision: 'ACCEPTED' })}
                >
                  {t('auctions.complaintsPanel.acceptBtn')}
                </Button>
                <Button
                  variant="danger"
                  disabled={resource.pending || resource.loading || !!resource.error}
                  onClick={() => setSelection({ id: complaint.id, decision: 'REJECTED' })}
                >
                  {t('auctions.complaintsPanel.rejectBtn')}
                </Button>
              </div>
            )}
            {complaint.status === 'OPEN' && selection?.id === complaint.id && (
              <form
                className="space-y-3 rounded-lg bg-slate-50 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (resource.loading || resource.error) return;
                  const note = String(new FormData(event.currentTarget).get('adminNote') ?? '');
                  void resource
                    .run(() =>
                      resolveAdminAuctionComplaintApi(complaint.id, selection.decision, note),
                    )
                    .then((success) => {
                      if (success) setSelection(null);
                    });
                }}
              >
                <p className="text-sm font-semibold">
                  {selection.decision === 'ACCEPTED'
                    ? t('auctions.complaintsPanel.confirmAccept')
                    : t('auctions.complaintsPanel.confirmReject')}
                </p>
                <label className="block text-xs">
                  {t('auctions.complaintsPanel.noteLabel')}
                  <textarea
                    name="adminNote"
                    rows={3}
                    maxLength={1000}
                    disabled={resource.pending}
                    className="mt-1 w-full rounded-lg border border-slate-200 p-3"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={resource.pending || resource.loading || !!resource.error}
                  >
                    {resource.pending
                      ? t('auctions.reviewForm.processing')
                      : t('auctions.complaintsPanel.confirmBtn')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={resource.pending}
                    onClick={() => setSelection(null)}
                  >
                    {t('auctions.common.cancel')}
                  </Button>
                </div>
              </form>
            )}
          </article>
        ))}
      </div>
    </Panel>
  );
}
