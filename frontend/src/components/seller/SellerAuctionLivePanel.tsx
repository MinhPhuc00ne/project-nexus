import { useEffect, useState, type ReactElement } from 'react';
import { Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import { formatCurrency } from '../../i18n/formatters';
import type {
  AuctionConsignmentItem,
  AuctionEntity,
  AuctionIntroShowcaseResponse,
} from '@/features/auction/services/auction.service';
import { formatAuctionImage } from '@/features/auction/services/auction.service';
import { AuctionShowcaseHUD } from '../auction/showcase/AuctionShowcaseHUD';
import { Badge, Panel, SellerButton } from './SellerUI';

/**
 * Properties for the seller-facing auction overview and live showcase.
 */
export interface SellerAuctionLivePanelProps {
  auction: AuctionEntity;
  approvedItems: AuctionConsignmentItem[];
  liveLotIndex: number;
  onLiveLotChange: (index: number) => void;
  showcase: AuctionIntroShowcaseResponse | null;
}

const money = (value?: number | string | null): string => formatCurrency(Number(value ?? 0));

function statusTone(status: AuctionEntity['status']): 'blue' | 'green' | 'amber' | 'gray' | 'red' {
  if (status === 'ACTIVE' || status === 'EXTENDED') return 'green';
  if (status === 'SCHEDULED') return 'amber';
  if (status === 'CANCELLED' || status === 'FAILED') return 'red';
  return 'gray';
}

/**
 * Renders auction overview, the live seller feed, and synchronized introduction controls.
 *
 * @param props - Current auction, approved lots, selected lot, and intro payload.
 * @returns Auction detail overview and live monitoring panels.
 */
export default function SellerAuctionLivePanel({
  auction,
  approvedItems,
  liveLotIndex,
  onLiveLotChange,
  showcase,
}: SellerAuctionLivePanelProps): ReactElement {
  const { t, i18n } = useTranslation('seller');
  const locale = getIntlLocale(i18n.language);
  const auctionStatusLabel = (status: AuctionEntity['status']): string =>
    t(`auctions.entityStatuses.${status}`, { defaultValue: status });
  const [showLiveShowcase, setShowLiveShowcase] = useState(false);
  const isLive = auction.status === 'ACTIVE' || auction.status === 'EXTENDED';
  const activeLiveLot = approvedItems[liveLotIndex] ?? approvedItems[0];
  const activeLotHighestBid =
    activeLiveLot !== undefined
      ? Number(activeLiveLot.currentHighestBid || activeLiveLot.startingPrice || 0)
      : Number(auction.currentHighestBid || auction.startingPrice || 0);
  const activeLotBidsCount = activeLiveLot?.totalBidsCount ?? auction.totalBidsCount;
  const activeLotEndTime = activeLiveLot?.endTime ?? auction.endTime;
  const activeLotExtended = activeLiveLot?.isExtended ?? auction.isExtended;

  useEffect(() => {
    if (showcase?.isIntroActive) setShowLiveShowcase(true);
  }, [showcase]);

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.6fr)]">
          <div className="grid min-h-52 place-items-center overflow-hidden rounded-lg bg-slate-50">
            {auction.imageUrl ? (
              <img
                src={formatAuctionImage(auction.imageUrl)}
                alt={auction.title}
                className="h-full max-h-72 w-full object-contain p-3"
              />
            ) : (
              <Box className="h-14 w-14 text-blue-300" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(auction.status)}>{auctionStatusLabel(auction.status)}</Badge>
              {auction.isExtended && (
                <Badge tone="amber">{t('auctions.livePanel.extendedBadge')}</Badge>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{auction.title}</h2>
              {auction.description && (
                <p className="mt-2 text-sm leading-6 text-slate-600">{auction.description}</p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('auctions.livePanel.startsAt')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {new Date(auction.startTime).toLocaleString(locale)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{t('auctions.livePanel.endsAt')}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {new Date(auction.endTime).toLocaleString(locale)}
                </p>
              </div>
            </div>
            {isLive && <Badge tone="green">{t('auctions.livePanel.liveUpdatingBadge')}</Badge>}
          </div>
        </div>
      </section>
      {isLive && (
        <Panel
          title={t('auctions.livePanel.panelTitle')}
          subtitle={t('auctions.livePanel.panelSubtitle')}
          action={<Badge tone="red">{t('auctions.livePanel.liveTag')}</Badge>}
        >
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg">
            <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 text-white">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
                <strong className="truncate text-sm">
                  {t('auctions.livePanel.streamingPrefix', { title: auction.title })}
                </strong>
              </div>
              <span className="shrink-0 text-xs text-slate-300">
                {t('auctions.livePanel.bidsCount', { count: auction.totalBidsCount })}
              </span>
            </div>
            <div className="grid min-h-[330px] lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.9fr)]">
              <div className="grid min-h-[330px] place-items-center bg-[radial-gradient(circle_at_center,_#22345b,_#060d1f_70%)] p-5">
                {auction.videoUrl ? (
                  <video
                    key={auction.videoUrl}
                    src={formatAuctionImage(auction.videoUrl)}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="max-h-[430px] w-full rounded-lg bg-black object-contain"
                  />
                ) : activeLiveLot?.images?.[0] ? (
                  <img
                    src={formatAuctionImage(activeLiveLot.images[0])}
                    alt={activeLiveLot.title}
                    className="max-h-[390px] w-full object-contain"
                  />
                ) : (
                  <Box className="h-20 w-20 text-blue-300" aria-hidden="true" />
                )}
              </div>
              <aside className="space-y-4 bg-slate-900 p-5 text-white">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                      {activeLiveLot
                        ? t('auctions.livePanel.highestLotBid')
                        : t('auctions.livePanel.highestBid')}
                    </p>
                    {activeLotExtended && (
                      <Badge tone="amber">{t('auctions.livePanel.extendBadge')}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-3xl font-bold text-amber-300">
                    {money(activeLotHighestBid)}
                  </p>
                  <p className="mt-2 text-xs text-slate-300">
                    {t('auctions.livePanel.lotBidsAndEnd', {
                      count: activeLotBidsCount,
                      date: new Date(activeLotEndTime).toLocaleString(locale),
                    })}
                  </p>
                </div>
                <div className="border-t border-slate-700 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {t('auctions.livePanel.displayedItem')}
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {activeLiveLot?.title ?? t('auctions.livePanel.awaitingLot')}
                  </p>
                  {activeLiveLot && (
                    <p className="mt-1 text-xs text-slate-300">
                      {t('auctions.livePanel.lotMeta', {
                        lot: activeLiveLot.lotNumber ?? liveLotIndex + 1,
                        status: auctionStatusLabel(activeLiveLot.lotStatus ?? auction.status),
                        price: money(activeLiveLot.startingPrice),
                      })}
                    </p>
                  )}
                </div>
                {approvedItems.length > 1 && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-700 pt-4">
                    {approvedItems.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onLiveLotChange(index)}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${index === liveLotIndex ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                      >
                        {t('auctions.livePanel.lotTab', { lot: item.lotNumber ?? index + 1 })}
                      </button>
                    ))}
                  </div>
                )}
                {showcase?.isIntroActive && (
                  <SellerButton className="w-full" onClick={() => setShowLiveShowcase(true)}>
                    {t('auctions.livePanel.openSyncShowcase')}
                  </SellerButton>
                )}
              </aside>
            </div>
          </div>
        </Panel>
      )}
      {showLiveShowcase && showcase && (
        <AuctionShowcaseHUD
          auctionTitle={showcase.title}
          auctionDescription={showcase.description ?? undefined}
          items={showcase.items}
          playbackMode="live"
          initialElapsedMs={showcase.elapsedMs}
          onComplete={() => setShowLiveShowcase(false)}
          onCancel={() => setShowLiveShowcase(false)}
        />
      )}
    </>
  );
}
