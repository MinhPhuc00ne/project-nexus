import type { ReactElement } from 'react';
import { LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import type { SellerAuctionConsignment } from '../../services/auction.service';
import { Badge, EmptyState, Panel, SellerButton } from './SellerUI';

export interface SellerConsignmentHistoryPanelProps {
  consignments: SellerAuctionConsignment[];
  isLoading: boolean;
  onRefresh: () => void;
}

/**
 * Renders the appraisal workflow explanation and list of seller submitted consignment items.
 *
 * @param props - Component configuration including consignment items and refresh callbacks.
 * @returns Rendered consignment history and guidance aside section.
 */
export default function SellerConsignmentHistoryPanel({
  consignments,
  isLoading,
  onRefresh,
}: SellerConsignmentHistoryPanelProps): ReactElement {
  const { t } = useTranslation('seller');
  const statusPresentation = (
    status: SellerAuctionConsignment['status'],
  ): { label: string; tone: 'amber' | 'green' | 'red' } => {
    if (status === 'APPROVED')
      return { label: t('auctions.consignmentStatuses.APPROVED'), tone: 'green' };
    if (status === 'REJECTED')
      return { label: t('auctions.consignmentStatuses.REJECTED'), tone: 'red' };
    return { label: t('auctions.consignmentStatuses.PENDING_REVIEW'), tone: 'amber' };
  };
  return (
    <aside className="space-y-5">
      <Panel
        title={t('auctions.consignment.historyProcessTitle')}
        subtitle={t('auctions.consignment.historyProcessSubtitle')}
      >
        <ol className="space-y-4 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              1
            </span>
            {t('auctions.consignment.step1')}
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              2
            </span>
            {t('auctions.consignment.step2')}
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
              3
            </span>
            {t('auctions.consignment.step3')}
          </li>
        </ol>
      </Panel>

      <Panel
        title={t('auctions.consignment.submittedTitle')}
        subtitle={t('auctions.consignment.submittedSubtitle')}
        action={
          <SellerButton secondary onClick={onRefresh} disabled={isLoading}>
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            {t('auctions.consignment.refresh')}
          </SellerButton>
        }
      >
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <LoaderCircle className="animate-spin" size={18} />
            {t('auctions.consignment.loadingHistory')}
          </div>
        ) : consignments.length === 0 ? (
          <EmptyState
            title={t('auctions.consignment.emptyHistoryTitle')}
            description={t('auctions.consignment.emptyHistoryDesc')}
          />
        ) : (
          <div className="space-y-3">
            {consignments.map((item) => {
              const display = statusPresentation(item.status);
              return (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.auction.title}</p>
                    </div>
                    <Badge tone={display.tone}>{display.label}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-blue-700">
                    {formatCurrency(item.proposedStartingPrice)}
                  </p>
                  {item.status === 'REJECTED' && item.rejectionReason && (
                    <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs leading-5 text-rose-700">
                      {t('auctions.consignment.reasonPrefix', { reason: item.rejectionReason })}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        <ShieldCheck className="mb-2 text-blue-600" size={22} aria-hidden="true" />
        {t('auctions.consignment.historyTip')}
      </div>
    </aside>
  );
}
