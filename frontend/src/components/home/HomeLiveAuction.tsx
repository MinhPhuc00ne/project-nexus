import { ArrowRight, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { AuctionEntity } from '@/features/auction/services/auction.service';
import AuctionSessionCard from '../auction/AuctionSessionCard';

export interface HomeLiveAuctionProps {
  auctions?: AuctionEntity[];
}

export function HomeLiveAuction({ auctions = [] }: HomeLiveAuctionProps) {
  const { t } = useTranslation('auction');
  if (!auctions.length) return null;
  return (
    <section className="mt-10 rounded-[28px] border border-line bg-gradient-to-br from-blue-50/80 via-white to-slate-100/70 p-4 sm:p-7">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <Radio size={14} aria-hidden="true" />
            LIVE AUCTION
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {t(
              auctions.every((auction) => auction.status === 'SCHEDULED')
                ? 'sessions.upcomingTitle'
                : 'sessions.homeTitle',
            )}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            {t('sessions.homeDescription')}
          </p>
        </div>
        <Link
          to="/auction"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-primary"
        >
          {t('sessions.viewAll')}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className={`grid gap-5 sm:grid-cols-2 ${auctions.length > 2 ? 'xl:grid-cols-3' : ''}`}>
        {auctions.slice(0, 3).map((auction) => (
          <AuctionSessionCard key={auction.id} auction={auction} />
        ))}
      </div>
    </section>
  );
}
