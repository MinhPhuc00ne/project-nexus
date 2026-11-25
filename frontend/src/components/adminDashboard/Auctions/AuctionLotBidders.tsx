import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../../i18n/config';
import { formatCurrency } from '../../../i18n/formatters';
import type { AuctionBidItem } from '../../../services/auction.service';
import { Badge, EmptyState } from '../shared/AdminUI';

type Props = {
  id: string;
  bids: AuctionBidItem[];
  leadingBidderId: string | null;
};

const KNOWN_BID_STATUSES = ['ACCEPTED', 'SUPERSEDED', 'WINNING', 'REJECTED'] as const;

export default function AuctionLotBidders({ id, bids, leadingBidderId }: Props) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const rows = bids;
  const count = new Set(rows.map((bid) => bid.bidder.id)).size;

  return (
    <section
      id={id}
      aria-label={t('auctions.lotBidders.sectionAria')}
      className="space-y-3 rounded-xl border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-800">{t('auctions.lotBidders.heading')}</h3>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-600">
          {t('auctions.lotBidders.summary', { bidders: count, bids: rows.length })}
        </p>
      </div>
      <p className="text-xs text-slate-500">{t('auctions.lotBidders.captionHint')}</p>
      {!rows.length ? (
        <EmptyState text={t('auctions.lotBidders.empty')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{t('auctions.lotBidders.tableCaption')}</caption>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="p-3">
                  {t('auctions.lotBidders.columns.bidder')}
                </th>
                <th scope="col" className="p-3">
                  {t('auctions.lotBidders.columns.amount')}
                </th>
                <th scope="col" className="p-3">
                  {t('auctions.lotBidders.columns.time')}
                </th>
                <th scope="col" className="p-3">
                  {t('auctions.lotBidders.columns.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((bid, index) => {
                const leading =
                  index === 0 && bid.bidder.id === leadingBidderId && bid.status !== 'REJECTED';
                const statusLabel = (KNOWN_BID_STATUSES as readonly string[]).includes(bid.status)
                  ? t(`auctions.bidStates.${bid.status as (typeof KNOWN_BID_STATUSES)[number]}`)
                  : bid.status;
                return (
                  <tr key={bid.id} className={leading ? 'bg-blue-50/50' : undefined}>
                    <td className="min-w-36 p-3">
                      <p className="font-semibold text-slate-800">{bid.bidder.fullName}</p>
                      {leading && (
                        <span className="mt-1 block text-blue-600">
                          {t('auctions.lotBidders.leadingTag')}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 font-semibold text-primary">
                      {formatCurrency(Number(bid.bidAmount), i18n.language)}
                    </td>
                    <td className="whitespace-nowrap p-3 text-slate-500">
                      {new Date(bid.placedAt).toLocaleString(locale)}
                    </td>
                    <td className="whitespace-nowrap p-3">
                      <Badge
                        tone={
                          bid.status === 'REJECTED'
                            ? 'red'
                            : bid.status === 'SUPERSEDED'
                              ? 'gray'
                              : 'green'
                        }
                      >
                        {statusLabel}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
