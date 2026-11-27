import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuctionStatus } from '@nexus/types';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gavel,
  Layers,
  Pause,
  Play,
  Radio,
} from 'lucide-react';
import {
  formatAuctionImage,
  getAuctionsApi,
  type AuctionEntity,
} from '@/features/auction/services/auction.service';
import { getIntlLocale } from '@/i18n/config';

const BANNER_INTERVAL_MS = 5000;
const bannerStatuses = [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED, AuctionStatus.SCHEDULED];

function AuctionSlide({ auction }: { auction: AuctionEntity }) {
  const { t, i18n } = useTranslation('auth');
  const live = auction.status !== AuctionStatus.SCHEDULED;
  const image =
    auction.imageUrl?.trim() ||
    auction.items?.flatMap((item) => item.images ?? []).find((url) => url?.trim()) ||
    auction.product?.images?.find((item) => item.imageUrl?.trim())?.imageUrl;
  const startTime = new Date(auction.startTime);
  const startsAt = Number.isFinite(startTime.getTime())
    ? new Intl.DateTimeFormat(getIntlLocale(i18n.language), {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(startTime)
    : t('auctionBanner.schedulePending');

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-navy p-6 text-white sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-blue-500/20 blur-3xl" />
      <Gavel
        className="pointer-events-none absolute right-10 top-20 size-44 -rotate-12 text-white/10 sm:size-56"
        aria-hidden="true"
      />
      {image && (
        <img
          src={formatAuctionImage(image)}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy via-navy/65 to-navy/20" />
      <div className="relative flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${live ? 'bg-emerald-300 text-emerald-950' : 'bg-white text-navy'}`}
        >
          {live ? (
            <Radio size={14} aria-hidden="true" />
          ) : (
            <CalendarDays size={14} aria-hidden="true" />
          )}
          {t(live ? 'auctionBanner.live' : 'auctionBanner.upcoming')}
        </span>
        <span className="text-[10px] font-bold tracking-[0.18em] text-white/80">NEXUS AUCTION</span>
      </div>
      <div className="relative mt-8 min-[1025px]:mt-4">
        <h3 className="line-clamp-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
          {auction.title || auction.product?.title || t('auctionBanner.defaultTitle')}
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-3 text-xs font-medium text-slate-200">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={15} aria-hidden="true" />
            {startsAt}
          </span>
          {!!auction.items?.length && (
            <span className="inline-flex items-center gap-2">
              <Layers size={15} aria-hidden="true" />
              {t('auctionBanner.lots', { count: auction.items.length })}
            </span>
          )}
        </div>
        <Link
          to={`/auction/${encodeURIComponent(auction.id)}`}
          className="mt-4 inline-flex min-h-11 items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-navy transition-colors hover:bg-blue-100"
        >
          {t(live ? 'auctionBanner.viewLive' : 'auctionBanner.viewSession')}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function AuctionBannerFallback({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation('auth');
  let state: 'empty' | 'loading' | 'error' = 'empty';
  if (loading) state = 'loading';
  else if (error) state = 'error';
  return (
    <div
      className="relative flex min-h-[380px] flex-col items-start justify-center overflow-hidden bg-navy p-7 text-white sm:min-h-[420px] sm:p-8 min-[1025px]:h-full min-[1025px]:min-h-0 min-[1025px]:p-6"
      aria-busy={loading}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-blue-500/25 blur-3xl" />
      <Gavel size={44} className="relative mb-5 text-blue-300" aria-hidden="true" />
      <p className="relative mb-3 text-[10px] font-bold tracking-[0.2em] text-blue-200">
        NEXUS AUCTION
      </p>
      <h3 className="relative max-w-sm text-2xl font-bold leading-tight sm:text-3xl">
        {t(`auctionBanner.${state}Title`)}
      </h3>
      <p
        className="relative mt-4 max-w-sm text-sm leading-relaxed text-slate-300"
        role={loading ? 'status' : undefined}
      >
        {t(`auctionBanner.${state}Description`)}
      </p>
      {!loading && (
        <Link
          to="/auction"
          className="relative mt-7 inline-flex min-h-11 items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-navy hover:bg-blue-100"
        >
          {t('auctionBanner.explore')}
          <ArrowUpRight size={17} />
        </Link>
      )}
      {error && (
        <button
          type="button"
          onClick={() => onRetry()}
          className="relative mt-4 text-sm font-semibold text-blue-200 underline underline-offset-4"
        >
          {t('auctionBanner.retry')}
        </button>
      )}
    </div>
  );
}

export default function AuthHeroSection() {
  const { t } = useTranslation('auth');
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const query = useQuery({
    queryKey: ['auth', 'auction-banner'],
    queryFn: async () => {
      const pages = await Promise.all(
        bannerStatuses.map((status) => getAuctionsApi({ status, limit: 4 })),
      );
      return [
        ...new Map(
          pages
            .flatMap((page) => page.items)
            .filter((auction) => bannerStatuses.includes(auction.status))
            .map((auction) => [auction.id, auction]),
        ).values(),
      ];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const auctions = query.data ?? [];
  const currentIndex = activeIndex % (auctions.length || 1);
  const autoPlaying = !paused && !hovered && !focused && !reducedMotion && !hidden;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(preference.matches);
    const updateVisibility = () => setHidden(document.hidden);
    updateMotion();
    preference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      preference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!autoPlaying || auctions.length < 2) return;
    const timer = window.setInterval(
      () => setActiveIndex((index) => (index + 1) % auctions.length),
      BANNER_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [autoPlaying, auctions.length]);

  function move(direction: number) {
    setPaused(true);
    setActiveIndex((currentIndex + direction + auctions.length) % auctions.length);
  }

  return (
    <section
      className="order-2 min-w-0 max-[1024px]:mx-auto max-[1024px]:w-full max-[1024px]:max-w-lg min-[1025px]:order-1 min-[1025px]:col-span-7 min-[1025px]:flex min-[1025px]:min-h-0 min-[1025px]:flex-col min-[1025px]:[contain:size]"
      aria-labelledby="login-auctions-heading"
    >
      <div className="mb-4 shrink-0">
        <span className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" />
          NEXUS AUCTIONS
        </span>
        <h2
          id="login-auctions-heading"
          className="text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl"
        >
          {t('auctionBanner.title')}
          <br />
          <span className="text-primary">{t('auctionBanner.titleAccent')}</span>
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
          {t('auctionBanner.subtitle')}
        </p>
      </div>
      <div
        className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-panel min-[1025px]:flex-1"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
        }}
        role="region"
        aria-roledescription={t('auctionBanner.carousel')}
        aria-label={t('auctionBanner.label')}
      >
        {auctions.length > 0 ? (
          <>
            <div className="min-h-0 overflow-hidden min-[1025px]:flex-1" aria-live="off">
              <div
                className="flex transition-transform duration-500 ease-in-out motion-reduce:transition-none min-[1025px]:h-full"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {auctions.map((auction, index) => (
                  <article
                    key={auction.id}
                    className="w-full shrink-0 min-[1025px]:h-full"
                    inert={index !== currentIndex}
                    aria-hidden={index !== currentIndex}
                    aria-roledescription={t('auctionBanner.slide')}
                    aria-label={t('auctionBanner.slidePosition', {
                      current: index + 1,
                      total: auctions.length,
                    })}
                  >
                    <AuctionSlide auction={auction} />
                  </article>
                ))}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-1" aria-label={t('auctionBanner.pagination')}>
                {auctions.map((auction, index) => (
                  <button
                    key={auction.id}
                    type="button"
                    onClick={() => {
                      setActiveIndex(index);
                      setPaused(true);
                    }}
                    aria-label={t('auctionBanner.goToSlide', { number: index + 1 })}
                    aria-current={index === currentIndex ? 'true' : undefined}
                    className="group flex min-h-8 min-w-4 items-center justify-center"
                  >
                    <span
                      className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${index === currentIndex ? 'w-4 bg-primary' : 'w-1.5 bg-slate-300 group-hover:bg-primary'}`}
                    />
                  </button>
                ))}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <span className="mr-2 text-xs font-semibold tabular-nums text-muted">
                  {currentIndex + 1} / {auctions.length}
                </span>
                {auctions.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(-1)}
                      aria-label={t('auctionBanner.previous')}
                      className="grid size-9 place-items-center rounded-full text-ink hover:bg-blue-50"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaused(!paused);
                        setFocused(false);
                      }}
                      disabled={reducedMotion}
                      aria-label={t(
                        paused || reducedMotion ? 'auctionBanner.play' : 'auctionBanner.pause',
                      )}
                      aria-pressed={paused || reducedMotion}
                      className="grid size-9 place-items-center rounded-full text-ink hover:bg-blue-50 disabled:opacity-40"
                    >
                      {paused || reducedMotion ? <Play size={15} /> : <Pause size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => move(1)}
                      aria-label={t('auctionBanner.next')}
                      className="grid size-9 place-items-center rounded-full text-ink hover:bg-blue-50"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <AuctionBannerFallback
            loading={query.isPending}
            error={query.isError}
            onRetry={() => void query.refetch()}
          />
        )}
      </div>
      <p className="mt-3 flex shrink-0 items-center gap-2 text-xs leading-relaxed text-muted">
        <Gavel size={14} className="shrink-0 text-primary" aria-hidden="true" />
        {t('auctionBanner.footer')}
      </p>
    </section>
  );
}
