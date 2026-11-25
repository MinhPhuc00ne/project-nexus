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
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#1c3973]">{t('profile.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('profile.subtitle')}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {t('profile.modeBadge')}
        </span>
      </div>
      <nav
        aria-label={t('profile.tabsAria')}
        className="flex gap-2 border-b border-slate-200 overflow-x-auto"
      >
        <Link
          to="/buyer/profile"
          aria-current={!showAuctionOffers ? 'page' : undefined}
          className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 ${!showAuctionOffers ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-blue-700'}`}
        >
          {t('profile.tabPersonalInfo')}
        </Link>
        <Link
          to="/buyer/profile?tab=auction-offers"
          aria-current={showAuctionOffers ? 'page' : undefined}
          className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 ${showAuctionOffers ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-blue-700'}`}
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
