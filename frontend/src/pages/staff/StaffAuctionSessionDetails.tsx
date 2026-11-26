import type { Dispatch, SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { CheckCircle2, LoaderCircle, Save } from 'lucide-react';
import type {
  AdminAuctionAward,
  AdminAuctionComplaint,
} from '@/features/admin/types/admin-auction-operations.types';
import type {
  AdminAuctionItem,
  StaffAuctionOverviewResponse,
} from '@/features/auction/types/auction-api.types';
import { canEndStaffAuctionLot } from './auctionSupport.helpers';

type StaffAuctionSession = StaffAuctionOverviewResponse['auctions'][number];
type SessionSupportDetails = {
  items: AdminAuctionItem[];
  awards: AdminAuctionAward[];
  complaints: AdminAuctionComplaint[];
};

type StaffAuctionSessionDetailsProps = {
  selectedAuction: StaffAuctionSession;
  onCloseDetails: () => void;
  selectedSupportDetails?: SessionSupportDetails;
  detailsLoadingId: string | null;
  detailsError: string;
  noteDrafts: Record<string, string>;
  setNoteDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  actionId: string | null;
  savingNoteId: string | null;
  noteSavedId: string | null;
  t: TFunction<'staff'>;
  locale: string;
  formatSessionTime: (value: string, t: TFunction<'staff'>, locale: string) => string;
  formatAuctionAmount: (value: number | string | null | undefined, locale: string) => string;
  reviewConsignment: (item: AdminAuctionItem, decision: 'APPROVE' | 'REJECT') => Promise<void>;
  saveStaffNote: (item: AdminAuctionItem) => Promise<void>;
  endLot: (auctionId: string, itemId: string) => Promise<void>;
};

export default function StaffAuctionSessionDetails({
  selectedAuction,
  onCloseDetails,
  selectedSupportDetails,
  detailsLoadingId,
  detailsError,
  noteDrafts,
  setNoteDrafts,
  actionId,
  savingNoteId,
  noteSavedId,
  t,
  locale,
  formatSessionTime,
  formatAuctionAmount,
  reviewConsignment,
  saveStaffNote,
  endLot,
}: StaffAuctionSessionDetailsProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="font-bold text-slate-900">{t('auctionSupport.detailsTitle')}</h3>
          <p className="mt-1 text-xs text-slate-500">{selectedAuction.title}</p>
        </div>
        <button
          type="button"
          onClick={onCloseDetails}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {t('auctionSupport.closeDetails')}
        </button>
      </div>

      {detailsLoadingId === selectedAuction.id ? (
        <p role="status" className="px-5 py-8 text-sm text-slate-500">
          {t('auctionSupport.loadingDetails')}
        </p>
      ) : detailsError ? (
        <div role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {detailsError}
        </div>
      ) : selectedSupportDetails ? (
        <div className="grid gap-5 p-5 xl:grid-cols-3">
          <section className="space-y-3" aria-label={t('auctionSupport.itemsTitle')}>
            <h4 className="text-sm font-bold text-slate-800">
              {t('auctionSupport.itemsTitle')} ({selectedSupportDetails.items.length})
            </h4>
            {selectedSupportDetails.items.length === 0 ? (
              <p className="text-xs text-slate-500">{t('auctionSupport.noItems')}</p>
            ) : (
              selectedSupportDetails.items.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('auctionSupport.sellerLabel')}: {item.seller.fullName} · {item.status}
                    {item.lotNumber ? ` · ${t('auctionSupport.lotLabel')} ${item.lotNumber}` : ''}
                  </p>
                  {item.status === 'PENDING_REVIEW' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionId === item.id}
                        onClick={() => void reviewConsignment(item, 'APPROVE')}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {t('auctionSupport.approveItem')}
                      </button>
                      <button
                        type="button"
                        disabled={actionId === item.id}
                        onClick={() => void reviewConsignment(item, 'REJECT')}
                        className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        {t('auctionSupport.rejectItem')}
                      </button>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-slate-600">
                    {t('auctionSupport.startingPrice')}:{' '}
                    {formatAuctionAmount(item.startingPrice ?? item.proposedStartingPrice, locale)}
                  </p>
                  <label className="mt-3 block text-xs font-medium text-slate-600">
                    {t('auctionSupport.noteLabel')}
                    <textarea
                      value={noteDrafts[item.id] ?? ''}
                      maxLength={2000}
                      rows={3}
                      onChange={(event) =>
                        setNoteDrafts((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                    />
                  </label>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={savingNoteId === item.id}
                      onClick={() => void saveStaffNote(item)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      <Save size={13} />
                      {savingNoteId === item.id
                        ? t('auctionSupport.savingNote')
                        : t('auctionSupport.saveNote')}
                    </button>
                    {noteSavedId === item.id && (
                      <span role="status" className="text-xs text-emerald-700">
                        {t('auctionSupport.noteSaved')}
                      </span>
                    )}
                  </div>
                  {canEndStaffAuctionLot(item.lotStatus ?? '') && (
                    <button
                      type="button"
                      disabled={actionId === item.id}
                      onClick={() => void endLot(selectedAuction.id, item.id)}
                      className="mt-3 inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {actionId === item.id ? (
                        <LoaderCircle size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      {t('auctionSupport.endLot')}
                    </button>
                  )}
                </article>
              ))
            )}
          </section>

          <section className="space-y-3" aria-label={t('auctionSupport.awardsTitle')}>
            <h4 className="text-sm font-bold text-slate-800">
              {t('auctionSupport.awardsTitle')} ({selectedSupportDetails.awards.length})
            </h4>
            {selectedSupportDetails.awards.length === 0 ? (
              <p className="text-xs text-slate-500">{t('auctionSupport.noAwards')}</p>
            ) : (
              <ul className="space-y-2">
                {selectedSupportDetails.awards.map((award) => (
                  <li key={award.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                    <p className="font-semibold text-slate-800">
                      {award.auctionItem?.title ?? t('auctionSupport.unknownItem')} · {award.status}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {t('auctionSupport.buyerLabel')}: {award.buyer?.fullName ?? '—'}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {t('auctionSupport.offerAmount')}:{' '}
                      {formatAuctionAmount(award.offerAmount, locale)} ·{' '}
                      {t('auctionSupport.depositAmount')}:{' '}
                      {formatAuctionAmount(award.depositAmount, locale)}
                    </p>
                    <p className="mt-1 break-all text-slate-500">
                      {t('auctionSupport.expiresAt')}:{' '}
                      {formatSessionTime(award.expiresAt, t, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3" aria-label={t('auctionSupport.complaintsTitle')}>
            <h4 className="text-sm font-bold text-slate-800">
              {t('auctionSupport.complaintsTitle')} ({selectedSupportDetails.complaints.length})
            </h4>
            {selectedSupportDetails.complaints.length === 0 ? (
              <p className="text-xs text-slate-500">{t('auctionSupport.noComplaints')}</p>
            ) : (
              <ul className="space-y-2">
                {selectedSupportDetails.complaints.map((complaint) => (
                  <li key={complaint.id} className="rounded-xl border border-slate-200 p-3 text-xs">
                    <p className="font-semibold text-slate-800">
                      {complaint.auctionItem?.title ?? t('auctionSupport.unknownItem')} ·{' '}
                      {complaint.status}
                    </p>
                    <p className="mt-1 text-slate-600">
                      {t('auctionSupport.reporterLabel')}: {complaint.reporter.fullName}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-slate-700">{complaint.reason}</p>
                    <p className="mt-2 text-slate-500">
                      {formatSessionTime(complaint.createdAt, t, locale)}
                    </p>
                    {complaint.evidenceUrls.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {complaint.evidenceUrls.map((url) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-blue-600 hover:underline"
                            >
                              {t('auctionSupport.viewEvidence')}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
