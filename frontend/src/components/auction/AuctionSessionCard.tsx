import { ArrowUpRight, Clock3, Gavel, Layers, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { HomeCountdown } from '../home/HomeCountdown';
import {
  formatAuctionImage,
  type AuctionEntity,
} from '@/features/auction/services/auction.service';

export default function AuctionSessionCard({ auction }: { auction: AuctionEntity }) {
  const { t, i18n } = useTranslation('auction');
  const live = ['ACTIVE', 'EXTENDED'].includes(auction.status);
  const upcoming = auction.status === 'SCHEDULED';
  const title = auction.title || auction.product?.title || t('sessions.defaultTitle');
  const image =
    auction.imageUrl?.trim() ||
    auction.items?.flatMap((item) => item.images ?? []).find((value) => value?.trim()) ||
    auction.product?.images?.find((value) => value.imageUrl?.trim())?.imageUrl;
  const price = Number(auction.currentHighestBid) || Number(auction.startingPrice) || 0;
  const target = `/auction/${encodeURIComponent(auction.id)}`;
  const date = upcoming ? auction.startTime : auction.endTime;
  const hasTime = Number.isFinite(Date.parse(date)) && Date.parse(date) > Date.now();
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-[box-shadow,translate,border-color] duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-navy/10 motion-safe:hover:-translate-y-1 motion-reduce:transition-none">
      <Link
        to={target}
        aria-label={title}
        className="relative block aspect-[4/3] max-h-[360px] overflow-hidden bg-navy focus-visible:outline-4 focus-visible:outline-primary"
      >
        {image ? (
          <img
            src={formatAuctionImage(image)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Gavel className="absolute inset-0 m-auto size-16 text-white/20" aria-hidden="true" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/85 via-transparent to-black/10" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm ${live ? 'bg-emerald-300 text-emerald-950' : 'bg-white/95 text-navy'}`}
          >
            {live && <Radio size={12} aria-hidden="true" />}
            {t(`status.${auction.status}`)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-navy/60 px-2.5 py-1.5 text-[11px] text-white backdrop-blur-md">
            <Gavel size={12} aria-hidden="true" />
            {t('sessions.bids', { count: auction.totalBidsCount ?? 0 })}
          </span>
        </div>
        <div className="absolute inset-x-5 bottom-4 flex items-center justify-between gap-3 text-white">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">
            NEXUS AUCTION
          </span>
          {!!auction.items?.length && (
            <span className="inline-flex items-center gap-1.5 text-xs">
              <Layers size={14} aria-hidden="true" />
              {t('sessions.lots', { count: auction.items.length })}
            </span>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <Link to={target} className="mb-4 focus-visible:outline-primary">
          <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 tracking-tight text-ink transition-colors group-hover:text-primary">
            {title}
          </h3>
        </Link>
        <div className="mb-4 border-b border-line pb-4">
          <p className="mb-1 text-[11px] text-muted">
            {t(
              Number(auction.currentHighestBid) > 0
                ? 'sessions.currentPrice'
                : 'sessions.startingPrice',
            )}
          </p>
          <p className="text-xl font-semibold tracking-tight text-primary">
            {formatCurrency(price, i18n.language)}
          </p>
        </div>
        <div className="mb-5 flex min-h-12 flex-wrap items-center justify-between gap-2 text-muted">
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <Clock3 size={13} aria-hidden="true" />
            {t(upcoming ? 'sessions.opensIn' : live ? 'sessions.endsIn' : 'sessions.closed')}
          </span>
          {(live || upcoming) && hasTime && <HomeCountdown endsAt={date} />}
        </div>
        <Link
          to={target}
          className={`mt-auto flex min-h-11 items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${live ? 'bg-navy text-white hover:bg-primary' : 'bg-slate-100 text-ink hover:bg-blue-50 hover:text-primary'}`}
        >
          {t(live ? 'sessions.enter' : 'sessions.details')}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
