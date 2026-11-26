import BuyerPageHeader from '../../components/buyer/BuyerPageHeader';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProfileEditor from '../../components/profile/ProfileEditor';
import { useAuth } from '../../contexts/AuthContext';
import BuyerBidsPage from './BuyerBidsPage';

export default function BuyerProfilePage() {
  const { t } = useTranslation('buyer');
  const { user, token, isLoading, refreshProfile } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const showAuctionOffers = searchParams.get('tab') === 'auction-offers';
  if (!token)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (isLoading)
    return (
      <p role="status" className="p-10 text-center text-sm text-slate-600">
        {t('profile.loading')}
      </p>
    );
  if (!user)
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <p role="alert" className="text-sm text-slate-700">
          {t('profile.loadError')}
        </p>
        <button
          onClick={() => void refreshProfile()}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          {t('profile.retry')}
        </button>
      </div>
    );
  return (
    <div className="space-y-4">
      <BuyerPageHeader
        title={t('profile.title')}
        description={t('profile.subtitle')}
        actions={
          <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-primary">
            {t('profile.modeBadge')}
          </span>
        }
      />
      <nav
        aria-label={t('profile.tabsAria')}
        className="flex gap-2 overflow-x-auto rounded-xl border border-line bg-white p-1"
      >
        <Link
          to="/buyer/profile"
          aria-current={!showAuctionOffers ? 'page' : undefined}
          className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${!showAuctionOffers ? 'bg-blue-50 text-primary' : 'text-muted hover:bg-slate-50 hover:text-ink'}`}
        >
          {t('profile.tabPersonalInfo')}
        </Link>
        <Link
          to="/buyer/profile?tab=auction-offers"
          aria-current={showAuctionOffers ? 'page' : undefined}
          className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${showAuctionOffers ? 'bg-blue-50 text-primary' : 'text-muted hover:bg-slate-50 hover:text-ink'}`}
        >
          {t('profile.tabAuctionOffers')}
        </Link>
      </nav>
      {showAuctionOffers ? (
        <BuyerBidsPage key={user.id} purchasesOnly />
      ) : (
        <ProfileEditor key={user.id} profile={user} />
      )}
    </div>
  );
}
