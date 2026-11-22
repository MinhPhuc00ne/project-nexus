import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AlertCircle, Gavel, LoaderCircle, Radio, RefreshCw } from 'lucide-react';
import { WS_AUCTION_EVENTS } from '@nexus/types';
import { AuctionShowcaseHUD } from '../../components/auction/showcase/AuctionShowcaseHUD';
import { getIntlLocale } from '../../i18n/config';
import {
  createAuctionSocket,
  getAuctionIntroShowcaseApi,
  getStaffAuctionOverviewApi,
} from '../../services/auction.service';
import type {
  AuctionIntroShowcaseResponse,
  StaffAuctionOverviewResponse,
} from '../../types/auction-api.types';

type StaffAuctionSession = StaffAuctionOverviewResponse['auctions'][number];

const LIVE_STATUSES = new Set(['ACTIVE', 'EXTENDED']);

function formatSessionTime(value: string, t: TFunction<'staff'>, locale: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? t('auctionSupport.noTime')
    : new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function getStatusLabel(status: string, t: TFunction<'staff'>): string {
  if (status === 'ACTIVE' || status === 'EXTENDED') return t('auctionSupport.statusLive');
  if (status === 'SCHEDULED') return t('auctionSupport.statusScheduled');
  if (status === 'ENDED') return t('auctionSupport.statusEnded');
  return status;
}

export default function StaffAuctionSupportPanel() {
  const { t, i18n } = useTranslation('staff');
  const locale = getIntlLocale(i18n.language);
  const [auctions, setAuctions] = useState<StaffAuctionSession[]>([]);
  const [activeIntro, setActiveIntro] = useState<AuctionIntroShowcaseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [introLoadingId, setIntroLoadingId] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const lifecycleGenerationRef = useRef(0);
  const introRequestsRef = useRef(new Map<string, number>());
  const activeIntroRef = useRef<AuctionIntroShowcaseResponse | null>(null);

  const loadIntro = useCallback(
    async (auctionId: string) => {
      const generation = lifecycleGenerationRef.current;
      if (introRequestsRef.current.get(auctionId) === generation) return;
      introRequestsRef.current.set(auctionId, generation);
      setIntroLoadingId(auctionId);

      try {
        const response = await getAuctionIntroShowcaseApi(auctionId);
        if (!mountedRef.current || lifecycleGenerationRef.current !== generation) return;

        if (response.isIntroActive) {
          activeIntroRef.current = response;
          setActiveIntro(response);
          setError('');
        } else if (activeIntroRef.current?.auctionId === auctionId) {
          activeIntroRef.current = null;
          setActiveIntro(null);
        }
      } catch (cause: unknown) {
        if (mountedRef.current && lifecycleGenerationRef.current === generation) {
          setError(cause instanceof Error ? cause.message : t('auctionSupport.loadIntroErr'));
        }
      } finally {
        if (introRequestsRef.current.get(auctionId) === generation) {
          introRequestsRef.current.delete(auctionId);
        }
        if (mountedRef.current && lifecycleGenerationRef.current === generation) {
          setIntroLoadingId(null);
        }
      }
    },
    [t],
  );

  const refreshOverview = useCallback(async () => {
    const generation = lifecycleGenerationRef.current;
    setRefreshing(true);
    setError('');

    try {
      const response = await getStaffAuctionOverviewApi();
      if (!mountedRef.current || lifecycleGenerationRef.current !== generation) return;

      const sessions = response.auctions ?? [];
      setAuctions(sessions);

      const liveSessions = sessions.filter((session) => LIVE_STATUSES.has(session.status));
      await Promise.all(liveSessions.map((session) => loadIntro(session.id)));
    } catch (cause: unknown) {
      if (mountedRef.current && lifecycleGenerationRef.current === generation) {
        setError(cause instanceof Error ? cause.message : t('auctionSupport.loadOverviewErr'));
      }
    } finally {
      if (mountedRef.current && lifecycleGenerationRef.current === generation) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [loadIntro, t]);

  useEffect(() => {
    lifecycleGenerationRef.current += 1;
    mountedRef.current = true;
    const connection = createAuctionSocket();
    const handleAuctionStarted = (payload: { auctionId: string }) => {
      if (payload?.auctionId) void loadIntro(payload.auctionId);
    };

    connection.onAuctionStarted(handleAuctionStarted);
    void refreshOverview();

    return () => {
      mountedRef.current = false;
      lifecycleGenerationRef.current += 1;
      introRequestsRef.current.clear();
      connection.socket.off(WS_AUCTION_EVENTS.SERVER.AUCTION_STARTED, handleAuctionStarted);
      connection.disconnect();
    };
  }, [loadIntro, refreshOverview]);

  const closeIntro = () => {
    activeIntroRef.current = null;
    setActiveIntro(null);
  };

  const sortedAuctions = [...auctions].sort((left, right) => {
    const leftLive = LIVE_STATUSES.has(left.status) ? 0 : 1;
    const rightLive = LIVE_STATUSES.has(right.status) ? 0 : 1;
    return leftLive - rightLive || left.startTime.localeCompare(right.startTime);
  });

  return (
    <section className="mt-5 space-y-4" aria-label={t('auctionSupport.sectionAria')}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Gavel size={18} className="text-blue-600" />
            {t('auctionSupport.headerTitle')}
          </div>
          <p className="mt-1 text-sm text-slate-500">{t('auctionSupport.headerDesc')}</p>
        </div>
        <button
          type="button"
          onClick={() => void refreshOverview()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {t('auctionSupport.refresh')}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">{t('auctionSupport.listTitle')}</h2>
          <span className="text-xs text-slate-500">
            {t('auctionSupport.count', { count: auctions.length })}
          </span>
        </div>

        {loading ? (
          <div role="status" className="flex items-center gap-2 px-5 py-10 text-sm text-slate-500">
            <LoaderCircle size={17} className="animate-spin" /> {t('auctionSupport.loading')}
          </div>
        ) : sortedAuctions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            {t('auctionSupport.empty')}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sortedAuctions.map((auction) => {
              const isLive = LIVE_STATUSES.has(auction.status);
              const isLoadingIntro = introLoadingId === auction.id;

              return (
                <li
                  key={auction.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-800">{auction.title}</p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${
                          isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isLive && <Radio size={12} />}
                        {getStatusLabel(auction.status, t)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {t('auctionSupport.startsAt', {
                        date: formatSessionTime(auction.startTime, t, locale),
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadIntro(auction.id)}
                    disabled={!isLive || isLoadingIntro}
                    className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    title={
                      isLive ? t('auctionSupport.liveTitle') : t('auctionSupport.notLiveTitle')
                    }
                  >
                    {isLoadingIntro
                      ? t('auctionSupport.loadingBtn')
                      : t('auctionSupport.watchIntroBtn')}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {activeIntro && (
        <AuctionShowcaseHUD
          auctionTitle={activeIntro.title}
          auctionDescription={activeIntro.description ?? undefined}
          items={activeIntro.items}
          playbackMode="live"
          initialElapsedMs={activeIntro.elapsedMs}
          onComplete={closeIntro}
          onCancel={closeIntro}
        />
      )}
    </section>
  );
}
