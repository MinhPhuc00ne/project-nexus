import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../i18n/formatters';
import { HomeCountdown } from './HomeCountdown';
import { HomeAuctionCard } from './HomeAuctionCard';
import { formatAuctionImage, type AuctionEntity } from '../../services/auction.service';

export interface HomeLiveAuctionProps {
  auctions?: AuctionEntity[];
}

export function HomeLiveAuction({ auctions }: HomeLiveAuctionProps) {
  if (!auctions || auctions.length === 0) return null;
  return <HomeLiveAuctionContent auctions={auctions} />;
}

function HomeLiveAuctionContent({ auctions }: { auctions: AuctionEntity[] }) {
  const { t } = useTranslation('guest');

  const featuredAuction = auctions[0];
  const isLive = featuredAuction.status === 'ACTIVE' || featuredAuction.status === 'EXTENDED';
  const isUpcoming =
    !isLive &&
    (featuredAuction.status === 'SCHEDULED' ||
      (featuredAuction.startTime
        ? new Date(featuredAuction.startTime).getTime() > Date.now()
        : false));

  const featuredTitle =
    featuredAuction.title ||
    featuredAuction.product?.title ||
    featuredAuction.items?.[0]?.title ||
    t('home.liveAuction.defaultTitle');

  const resolveRealImage = (auc: AuctionEntity): string => {
    if (auc.imageUrl && auc.imageUrl.trim().length > 0) {
      return formatAuctionImage(auc.imageUrl);
    }
    if (auc.items && auc.items.length > 0) {
      for (const item of auc.items) {
        if (item.images && item.images.length > 0) {
          const valid = item.images.find((u) => typeof u === 'string' && u.trim().length > 0);
          if (valid) return formatAuctionImage(valid);
        }
      }
    }
    if (auc.product && Array.isArray(auc.product.images) && auc.product.images.length > 0) {
      for (const img of auc.product.images) {
        if (img?.imageUrl && img.imageUrl.trim().length > 0) {
          return formatAuctionImage(img.imageUrl);
        }
      }
    }
    return '';
  };

  const featuredImage = resolveRealImage(featuredAuction);

  const itemsCount = featuredAuction.items?.length || 0;

  const featuredPrice = Number(
    featuredAuction.currentHighestBid || featuredAuction.startingPrice || 0,
  );

  const depositVal = Math.round(Number(featuredAuction.startingPrice || 0) * 0.1);

  const targetUrl = `/auction/${featuredAuction.id}`;

  const targetDateStr = isUpcoming ? featuredAuction.startTime : featuredAuction.endTime;

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!targetDateStr) return 0;
    return Math.max(0, Math.floor((new Date(targetDateStr).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!targetDateStr) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(targetDateStr).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDateStr]);

  const h = String(Math.floor(timeLeft / 3600)).padStart(2, '0');
  const m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, '0');
  const s = String(timeLeft % 60).padStart(2, '0');

  return (
    <section className="mt-5 rounded-[18px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 text-sky-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
            {t('home.liveAuction.exclusiveFeature')}
          </span>
        </div>

        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
          {t('home.liveAuction.viewersCount')}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-[15px] font-extrabold uppercase tracking-[0.04em] text-slate-800">
          {t('home.liveAuction.heading')}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{t('home.liveAuction.subheading')}</p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative aspect-video overflow-hidden rounded-[18px] border border-slate-300 bg-slate-950">
          {featuredImage ? (
            <img
              src={featuredImage}
              alt={featuredTitle}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80';
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-xs text-slate-400">
              {t('home.liveAuction.noImage')}
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span
              className={`rounded px-2.5 py-1 text-[10px] font-bold text-white shadow-xs ${
                isUpcoming ? 'bg-amber-500' : 'bg-red-500'
              }`}
            >
              {isUpcoming ? t('home.liveAuction.upcomingBadge') : t('home.liveAuction.liveBadge')}
            </span>
            {itemsCount > 1 && (
              <span className="rounded bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs">
                {t('home.liveAuction.lotsCount', { count: itemsCount })}
              </span>
            )}
            <span className="rounded border border-sky-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-sky-600">
              {t('home.liveAuction.realInspection')}
            </span>
          </div>
          <span className="absolute right-3 top-3 rounded bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700">
            {t('home.liveAuction.depositBadge')}
          </span>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/70 bg-white/90 p-2 backdrop-blur-sm">
            <span className="text-[10px] font-medium text-slate-600">
              {t('home.liveAuction.viewMode')}
            </span>
            <div className="flex gap-2">
              <Link
                to={targetUrl}
                className="rounded border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                {t('home.liveAuction.enterRoom')}
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-[18px] border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {featuredAuction.items?.[0]?.lotNumber
                ? t('home.liveAuction.lotNumber', { num: featuredAuction.items[0].lotNumber })
                : featuredAuction.id
                  ? `LOT #${featuredAuction.id.slice(0, 8).toUpperCase()}`
                  : t('home.liveAuction.specialLot')}
            </span>

            <span className="rounded bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-500">
              Seller KYC: Verified
            </span>
          </div>

          <h3 className="mt-4 text-[22px] font-extrabold text-slate-800 line-clamp-2">
            {featuredTitle}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {isUpcoming ? t('home.liveAuction.upcomingDesc') : t('home.liveAuction.liveDesc')}
          </p>

          <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {isUpcoming
                  ? t('home.liveAuction.startingPrice')
                  : t('home.liveAuction.currentPrice')}
              </p>
              <p className="mt-2 text-[24px] font-extrabold text-sky-600">
                {formatCurrency(featuredPrice)}
              </p>
              <p className="text-[11px] text-slate-400">
                {t('home.liveAuction.depositAmount', { amount: formatCurrency(depositVal) })}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {isUpcoming ? t('home.liveAuction.startsIn') : t('home.liveAuction.endsIn')}
              </p>
              <div className="mt-2 flex justify-end">
                <HomeCountdown values={[h, m, s]} />
              </div>
              <p className="mt-2 text-[11px] text-red-500">
                {isUpcoming ? t('home.liveAuction.statusScheduled') : 'Anti-Sniping: Active'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <Link
              to={targetUrl}
              className={`flex-1 rounded-xl px-5 py-3 text-center text-sm font-bold text-white shadow-lg transition ${
                isUpcoming
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                  : 'bg-[#1a8bff] hover:bg-[#1277eb] shadow-sky-200'
              }`}
            >
              {isUpcoming
                ? t('home.liveAuction.viewAndSchedule')
                : t('home.liveAuction.placeBidNow')}
            </Link>

            <Link
              to={targetUrl}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              {t('home.liveAuction.roomDetails')}
            </Link>
          </div>
        </div>
      </div>

      {auctions.length > 1 && (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {auctions.slice(1, 4).map((auction) => (
            <HomeAuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      )}
    </section>
  );
}
