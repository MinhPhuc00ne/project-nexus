import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Gavel, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AuctionStatus } from '@nexus/types';
import { getAuctionsApi } from '@/features/auction/services/auction.service';
import AuctionSessionCard from '../../components/auction/AuctionSessionCard';

const statuses = [
  '',
  AuctionStatus.ACTIVE,
  AuctionStatus.EXTENDED,
  AuctionStatus.SCHEDULED,
  AuctionStatus.ENDED,
] as const;

export default function AuctionListPage() {
  const { t } = useTranslation('auction');
  const [params, setParams] = useSearchParams();
  const status = statuses.find((entry) => entry === params.get('status')) || '';
  const rawPage = Number(params.get('page'));
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const search = params.get('q') || '';
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  const query = useQuery({
    queryKey: ['auction-sessions', status, page, search],
    queryFn: () =>
      getAuctionsApi({ page, limit: 9, status: status || undefined, search: search || undefined }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  function change(values: Record<string, string>) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });
  }
  useEffect(() => {
    if (query.data && page > Math.max(1, query.data.pagination.totalPages)) {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('page', String(Math.max(1, query.data.pagination.totalPages)));
          return next;
        },
        { replace: true },
      );
    }
  }, [query.data, page, setParams]);
  function submit(event: FormEvent) {
    event.preventDefault();
    change({ q: draft.trim(), page: '' });
  }
  return (
    <main className="storefront-container py-6 sm:py-9">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-primary"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        {t('sessions.home')}
      </Link>
      <header className="relative mb-7 overflow-hidden rounded-3xl bg-navy p-6 text-white sm:p-9">
        <Gavel
          className="pointer-events-none absolute -right-5 -top-5 size-52 -rotate-12 text-white/5"
          aria-hidden="true"
        />
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-blue-200">
          NEXUS AUCTION HOUSE
        </p>
        <h1 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">
          {t('sessions.title')}
        </h1>
        <p className="relative mt-3 max-w-xl text-sm leading-6 text-slate-300">
          {t('sessions.description')}
        </p>
      </header>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div
          role="group"
          aria-label={t('sessions.filter')}
          className="flex max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-white p-1.5"
        >
          {statuses.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === status}
              onClick={() => change({ status: value, page: '' })}
              className={`min-h-10 rounded-xl px-3 text-xs font-semibold transition-colors ${value === status ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-slate-50 hover:text-ink'}`}
            >
              {value ? t(`status.${value}`) : t('sessions.all')}
            </button>
          ))}
        </div>
        <form
          onSubmit={submit}
          className="flex w-full items-center gap-2 rounded-xl border border-line bg-white px-3 sm:w-72"
        >
          <input
            aria-label={t('sessions.search')}
            placeholder={t('sessions.search')}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button
            type="submit"
            aria-label={t('sessions.search')}
            className="rounded-lg p-2 text-primary hover:bg-blue-50"
          >
            <Search size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
      {query.isPending ? (
        <div role="status" aria-label={t('sessions.loading')} className="storefront-auction-grid">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-[460px] rounded-3xl border border-line bg-slate-200/60 motion-safe:animate-pulse"
            />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="nexus-panel py-14 text-center">
          <p className="mb-4 text-sm text-slate-600">{t('sessions.error')}</p>
          <button
            onClick={() => void query.refetch()}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            {t('sessions.retry')}
          </button>
        </div>
      ) : !query.data?.items.length ? (
        <div className="nexus-panel px-5 py-16 text-center">
          <Gavel className="mx-auto mb-4 size-10 text-slate-300" aria-hidden="true" />
          <h2 className="font-semibold text-ink">{t('sessions.empty')}</h2>
          <p className="mt-2 text-sm text-muted">{t('sessions.emptyHint')}</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted">
            {t('sessions.results', { count: query.data.pagination.total })}
          </p>
          <div className="storefront-auction-grid">
            {query.data.items.map((auction) => (
              <AuctionSessionCard key={auction.id} auction={auction} />
            ))}
          </div>
          <nav
            aria-label={t('sessions.pagination')}
            className="mt-8 flex items-center justify-between gap-3 text-sm"
          >
            <button
              disabled={page <= 1}
              onClick={() => change({ page: String(page - 1) })}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 disabled:opacity-40"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t('sessions.prev')}
            </button>
            <span className="text-xs text-muted">
              {t('sessions.pageOf', { page, total: Math.max(1, query.data.pagination.totalPages) })}
            </span>
            <button
              disabled={page >= query.data.pagination.totalPages}
              onClick={() => change({ page: String(page + 1) })}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 disabled:opacity-40"
            >
              {t('sessions.next')}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
