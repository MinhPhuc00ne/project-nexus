import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Gavel, MessageSquare, RefreshCw, Trophy } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import AuctionLotCard from '../../components/adminDashboard/Auctions/AuctionLotCard';
import { useAdminAuctionLots } from '../../components/adminDashboard/Auctions/useAdminAuctionLots';
import {
  AUCTION_STATUS_KEYS,
  isKnownAuctionStatus,
} from '../../components/adminDashboard/Auctions/auctionStatuses';
import AuctionAwardsPanel from '../../components/adminDashboard/Auctions/AuctionAwardsPanel';
import AuctionComplaintsPanel from '../../components/adminDashboard/Auctions/AuctionComplaintsPanel';
import { useAuth } from '../../contexts/AuthContext';
import { getIntlLocale } from '../../i18n/config';
import {
  Badge,
  Button,
  EmptyState,
  Panel,
  SearchInput,
} from '../../components/adminDashboard/shared/AdminUI';

export default function AdminAuctionLotsPage() {
  const { auctionId = '' } = useParams();
  const { token } = useAuth();
  return <AuctionLotsWorkspace key={`${auctionId}:${token}`} auctionId={auctionId} />;
}

function AuctionLotsWorkspace({ auctionId }: { auctionId: string }) {
  const { t, i18n } = useTranslation('admin');
  const locale = getIntlLocale(i18n.language);
  const {
    data,
    loading,
    error,
    actionError,
    notice,
    connected,
    realtimeError,
    refreshKey,
    operationsConnected,
    pendingId,
    clockOffset,
    endLot,
    refresh,
  } = useAdminAuctionLots(auctionId);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab =
    requestedTab === 'settlement'
      ? 'awards'
      : requestedTab === 'awards' || requestedTab === 'complaints'
        ? requestedTab
        : 'lots';
  const awardLotId = searchParams.get('lotId') ?? '';
  const changeTab = (value: 'lots' | 'awards' | 'complaints', lotId = '') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    if (value === 'awards' && lotId) next.set('lotId', lotId);
    else next.delete('lotId');
    setSearchParams(next);
  };
  const [status, setStatus] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lots = data?.lots ?? [];
  const visible = lots.filter(
    (lot) =>
      (!status || lot.lotStatus === status) &&
      `${lot.title} ${lot.lotNumber ?? ''} ${lot.seller?.fullName ?? ''}`
        .toLocaleLowerCase(locale)
        .includes(search.trim().toLocaleLowerCase(locale)),
  );
  const liveCount = lots.filter((lot) => ['ACTIVE', 'EXTENDED'].includes(lot.lotStatus)).length;
  const introRemaining = data?.isIntroActive
    ? Math.max(
        0,
        Math.ceil(
          (new Date(data.startTime).getTime() + (data.introDurationMs ?? 0) - now - clockOffset) /
            1000,
        ),
      )
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/auctions"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft size={16} /> {t('auctions.lotsPage.backToAuctions')}
        </Link>
        {tab !== 'awards' && (
          <Button disabled={!!pendingId} onClick={() => changeTab('awards')}>
            <Trophy size={16} /> {t('auctions.lotsPage.awardsShortcut')} <ArrowRight size={15} />
          </Button>
        )}
      </div>
      <Panel
        title={data?.title ?? t('auctions.lotsPage.fallbackTitle')}
        subtitle={t('auctions.lotsPage.subtitle')}
        icon={<Gavel size={20} />}
        action={
          <Button variant="secondary" disabled={loading || !!pendingId} onClick={refresh}>
            <RefreshCw size={15} /> {t('auctions.common.refresh')}
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {data && (
            <Badge>
              {isKnownAuctionStatus(data.status)
                ? t(`auctions.statuses.${data.status}`)
                : data.status}
            </Badge>
          )}
          <Badge tone={connected ? 'green' : 'amber'}>
            {connected
              ? t('auctions.lotsPage.liveConnected')
              : t('auctions.lotsPage.liveDisconnected')}
          </Badge>
        </div>
        {data && (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(
              [
                ['totalLots', lots.length],
                ['liveLots', liveCount],
                [
                  'endedLots',
                  lots.filter((lot) => ['ENDED', 'SETTLED'].includes(lot.lotStatus)).length,
                ],
                ['failedLots', lots.filter((lot) => lot.lotStatus === 'FAILED').length],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">{t(`auctions.lotsPage.stats.${key}`)}</p>
                <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <nav
        aria-label={t('auctions.lotsPage.navAria')}
        className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1.5"
      >
        {(
          [
            ['lots', Gavel],
            ['awards', Trophy],
            ['complaints', MessageSquare],
          ] as const
        ).map(([value, Icon]) => (
          <button
            type="button"
            key={value}
            aria-current={tab === value ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${tab === value ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-primary'}`}
            disabled={!!pendingId}
            onClick={() => changeTab(value)}
          >
            <Icon size={16} aria-hidden="true" />
            {t(`auctions.lotsPage.tabs.${value}`)}
          </button>
        ))}
      </nav>
      {introRemaining > 0 && (
        <p role="status" className="rounded-xl bg-blue-50 p-4 text-sm text-primary">
          {t('auctions.lotsPage.introNotice', { seconds: introRemaining })}
        </p>
      )}
      {realtimeError && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          {realtimeError}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {actionError}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {loading && !data && (
        <p role="status" className="py-12 text-center text-sm text-slate-500">
          {t('auctions.lotsPage.loading')}
        </p>
      )}
      {data && tab === 'awards' && (
        <AuctionAwardsPanel
          key={tab}
          auctionId={auctionId}
          refreshKey={refreshKey}
          realtimeConnected={operationsConnected}
          lotId={awardLotId}
          onLotChange={(lotId) => changeTab(tab, lotId)}
        />
      )}
      {data && tab === 'complaints' && (
        <AuctionComplaintsPanel
          auctionId={auctionId}
          refreshKey={refreshKey}
          realtimeConnected={operationsConnected}
        />
      )}
      {data && tab === 'lots' && (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-56 flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={t('auctions.lotsPage.searchPlaceholder')}
              />
            </div>
            <select
              aria-label={t('auctions.lotsPage.filterAria')}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
            >
              <option value="">{t('auctions.lotsPage.allLotStatuses')}</option>
              {AUCTION_STATUS_KEYS.map((value) => (
                <option key={value} value={value}>
                  {t(`auctions.statuses.${value}`)}
                </option>
              ))}
            </select>
          </div>
          {!lots.length ? (
            <EmptyState text={t('auctions.lotsPage.emptyNoLots')} />
          ) : !visible.length ? (
            <EmptyState text={t('auctions.lotsPage.emptyNoMatch')} />
          ) : (
            <div className="grid items-start gap-5 xl:grid-cols-2">
              {visible.map((lot) => (
                <AuctionLotCard
                  key={lot.id}
                  lot={lot}
                  now={now + clockOffset}
                  confirming={confirmingId === lot.id}
                  busy={!!pendingId}
                  refreshing={loading || !!error}
                  onConfirm={() => setConfirmingId(lot.id)}
                  onCancel={() => setConfirmingId(null)}
                  onEnd={() => {
                    void endLot(lot.id).then((success) => {
                      if (success) setConfirmingId(null);
                    });
                  }}
                  onRefresh={refresh}
                  onViewAwards={() => changeTab('awards', lot.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
