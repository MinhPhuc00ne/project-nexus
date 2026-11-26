import { ImageOff, PackageCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import { formatCurrency } from '../../i18n/formatters';
import i18n from '../../i18n/index';
import type {
  AuctionConsignmentItem,
  SellerAuctionConsignment,
} from '@/features/auction/services/auction.service';
import { formatAuctionImage } from '@/features/auction/services/auction.service';
import { canSubmitConsignment } from './sellerConsignmentHelpers';
import { Badge, EmptyState, Panel, SellerLink } from './SellerUI';

/**
 * Seller auction data displayed in the approved-lot and consignment panels.
 */
export interface SellerAuctionItemsPanelsProps {
  auctionId: string;
  auctionStatus: string;
  consignmentDeadline?: string | null;
  isConsignmentLocked?: boolean;
  approvedItems: AuctionConsignmentItem[];
  consignments: SellerAuctionConsignment[];
  liveItems?: AuctionConsignmentItem[];
}

const money = (value?: number | string | null): string => formatCurrency(Number(value ?? 0));

function statusTone(status: string): 'blue' | 'green' | 'amber' | 'gray' | 'red' {
  if (
    status === 'ACTIVE' ||
    status === 'EXTENDED' ||
    status === 'APPROVED' ||
    status === 'PAID' ||
    status === 'SETTLED'
  ) {
    return 'green';
  }
  if (
    status === 'SCHEDULED' ||
    status === 'PENDING_REVIEW' ||
    status === 'AWAITING_ACCEPTANCE' ||
    status === 'AWAITING_DEPOSIT' ||
    status === 'AWAITING_CHECKOUT'
  ) {
    return 'amber';
  }
  if (
    status === 'REJECTED' ||
    status === 'CANCELLED' ||
    status === 'FAILED' ||
    status === 'PAYMENT_DEFAULT' ||
    status === 'BUYER_WITHDRAWN' ||
    status === 'DECLINED' ||
    status === 'EXPIRED'
  ) {
    return 'red';
  }
  return 'gray';
}

function lotStatusLabel(status?: string): string {
  if (!status) return i18n.t('auctions.lotStatuses.NONE', { ns: 'seller' });
  return i18n.t(`auctions.lotStatuses.${status}`, { ns: 'seller', defaultValue: status });
}

function awardStatusLabel(status: string): string {
  return i18n.t(`auctions.awardStatuses.${status}`, {
    ns: 'seller',
    defaultValue: status.replace(/_/g, ' '),
  });
}

function formatDeadlineCountdown(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs)) return '';
  if (diffMs <= 0) return i18n.t('auctions.itemsPanels.overdue', { ns: 'seller' });
  const totalMinutes = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? i18n.t('auctions.itemsPanels.remainingHm', { ns: 'seller', hours, minutes })
    : i18n.t('auctions.itemsPanels.remainingM', { ns: 'seller', minutes });
}

/**
 * Renders approved lots and the seller's submitted consignment records.
 *
 * @param props - Auction eligibility state, approved items, and seller consignments.
 * @returns Approved lot and seller consignment panels.
 */
export default function SellerAuctionItemsPanels({
  auctionId,
  auctionStatus,
  consignmentDeadline,
  isConsignmentLocked,
  approvedItems,
  consignments,
  liveItems,
}: SellerAuctionItemsPanelsProps) {
  const { t, i18n: i18nInstance } = useTranslation('seller');
  const locale = getIntlLocale(i18nInstance.language);
  const displayItems = liveItems ?? approvedItems;
  const canSubmit = canSubmitConsignment({
    status: auctionStatus,
    consignmentDeadline,
    isConsignmentLocked,
  });
  return (
    <>
      <Panel
        title={t('auctions.itemsPanels.approvedTitle')}
        subtitle={t('auctions.itemsPanels.approvedSubtitle')}
      >
        {displayItems.length === 0 ? (
          <EmptyState
            title={t('auctions.itemsPanels.emptyApprovedTitle')}
            description={t('auctions.itemsPanels.emptyApprovedDesc')}
            action={
              canSubmit && (
                <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auctionId)}`}>
                  <PackageCheck size={15} aria-hidden="true" />
                  {t('auctions.itemsPanels.submitToSession')}
                </SellerLink>
              )
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {displayItems.map((item) => (
              <article key={item.id} className="flex gap-3 rounded-lg border border-slate-200 p-3">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-50">
                  {item.images?.[0] ? (
                    <img
                      src={formatAuctionImage(item.images[0])}
                      alt={item.title}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageOff size={22} className="text-slate-300" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-slate-800">{item.title}</h3>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {item.isExtended && (
                        <Badge tone="amber">{t('auctions.itemsPanels.extendBadge')}</Badge>
                      )}
                      {item.lotNumber && (
                        <Badge tone="blue">
                          {t('auctions.itemsPanels.lotBadge', { lot: item.lotNumber })}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('auctions.itemsPanels.pricingMeta', {
                      start: money(item.startingPrice),
                      increment: money(item.bidIncrement),
                    })}
                  </p>
                  {item.endTime && (
                    <p className="mt-1 text-xs text-slate-500">
                      {t('auctions.itemsPanels.lotEndTime', {
                        date: new Date(item.endTime).toLocaleString(locale),
                      })}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-semibold text-slate-700">
                    {item.lotStatus === 'ACTIVE' || item.lotStatus === 'EXTENDED'
                      ? t('auctions.itemsPanels.lotActiveSummary', {
                          status: lotStatusLabel(item.lotStatus),
                          price: money(item.currentHighestBid || item.startingPrice),
                          bids: item.totalBidsCount ?? 0,
                        })
                      : item.lotStatus === 'ENDED' || item.lotStatus === 'SETTLED'
                        ? t('auctions.itemsPanels.lotEndedSummary', {
                            status: lotStatusLabel(item.lotStatus),
                            price: money(item.currentHighestBid || item.startingPrice),
                          })
                        : t('auctions.itemsPanels.lotStatusSummary', {
                            status: lotStatusLabel(item.lotStatus),
                          })}
                  </p>
                  {item.staffNote && (
                    <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
                      {t('auctions.itemsPanels.staffNote', { note: item.staffNote })}
                    </p>
                  )}
                  {item.activeAward && (
                    <div className="mt-2 space-y-1 rounded-md bg-amber-50 p-2.5 text-xs text-amber-900">
                      <p className="font-semibold">
                        {item.activeAward.tier === 'SECOND_CHANCE'
                          ? t('auctions.itemsPanels.secondChanceBuyer')
                          : t('auctions.itemsPanels.primaryWinner')}
                        :{' '}
                        {item.activeAward.buyer?.fullName ??
                          t('auctions.itemsPanels.processingWinner')}
                      </p>
                      <p>
                        {t('auctions.itemsPanels.depositBreakdown', {
                          deposit: money(item.activeAward.depositAmount),
                          remaining: money(
                            item.activeAward.remainingProductAmount ??
                              Math.max(
                                0,
                                Number(item.activeAward.offerAmount || 0) -
                                  Number(item.activeAward.depositAmount || 0),
                              ),
                          ),
                        })}
                      </p>
                      {item.activeAward.expiresAt && (
                        <p>
                          {t('auctions.itemsPanels.deadline24h', {
                            date: new Date(item.activeAward.expiresAt).toLocaleString(locale),
                            countdown: formatDeadlineCountdown(item.activeAward.expiresAt),
                          })}
                        </p>
                      )}
                      <Badge tone={statusTone(item.activeAward.status)}>
                        {awardStatusLabel(item.activeAward.status)}
                      </Badge>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
      <Panel
        title={t('auctions.itemsPanels.consignmentsTitle')}
        subtitle={t('auctions.itemsPanels.consignmentsSubtitle')}
      >
        {consignments.length === 0 ? (
          <EmptyState
            title={t('auctions.itemsPanels.emptyConsignmentsTitle')}
            description={t('auctions.itemsPanels.emptyConsignmentsDesc')}
            action={
              canSubmit && (
                <SellerLink to={`/seller/auctions/new?auctionId=${encodeURIComponent(auctionId)}`}>
                  <PackageCheck size={15} aria-hidden="true" />
                  {t('auctions.itemsPanels.addProduct')}
                </SellerLink>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {consignments.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('auctions.itemsPanels.proposedPriceAndTime', {
                      price: money(item.proposedStartingPrice),
                      date: new Date(item.createdAt).toLocaleString(locale),
                    })}
                  </p>
                  {item.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">
                      {t('auctions.itemsPanels.rejectionReason', { reason: item.rejectionReason })}
                    </p>
                  )}
                </div>
                <Badge tone={statusTone(item.status)}>
                  {t(`auctions.consignmentStatuses.${item.status}`, {
                    defaultValue: item.status.replace(/_/g, ' '),
                  })}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
