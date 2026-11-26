import PageTransition from '../components/common/PageTransition';
import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/types';
import {
  LayoutDashboard,
  User,
  Package,
  MapPin,
  Wallet,
  Heart,
  Gavel,
  ShieldAlert,
  Store,
  ChevronRight,
  Award,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UpgradeSellerModal } from '../components/headers/UpgradeSellerModal';
import { formatCurrency } from '../i18n/formatters';

interface NavItem {
  to: string;
  key:
    | 'nav.dashboard'
    | 'nav.profile'
    | 'nav.orders'
    | 'nav.addresses'
    | 'nav.wallet'
    | 'nav.wishlist'
    | 'nav.bids'
    | 'nav.reputation'
    | 'nav.notifications'
    | 'nav.disputes';
  icon: React.ReactNode;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/buyer', key: 'nav.dashboard', icon: <LayoutDashboard size={17} />, end: true },
  { to: '/buyer/profile', key: 'nav.profile', icon: <User size={17} /> },
  { to: '/buyer/orders', key: 'nav.orders', icon: <Package size={17} /> },
  { to: '/buyer/addresses', key: 'nav.addresses', icon: <MapPin size={17} /> },
  { to: '/buyer/wallet', key: 'nav.wallet', icon: <Wallet size={17} /> },
  { to: '/buyer/wishlist', key: 'nav.wishlist', icon: <Heart size={17} /> },
  { to: '/buyer/bids', key: 'nav.bids', icon: <Gavel size={17} /> },
  { to: '/buyer/reputation', key: 'nav.reputation', icon: <Award size={17} /> },
  { to: '/buyer/notifications', key: 'nav.notifications', icon: <Bell size={17} /> },
  { to: '/buyer/disputes', key: 'nav.disputes', icon: <ShieldAlert size={17} /> },
];

export default function BuyerLayout() {
  const { t } = useTranslation(['buyer', 'common']);
  const { user: profile, switchActiveMode } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const hasSellerRole = profile?.role === Role.SELLER;

  // Khi đang ở khu vực Buyer (/buyer/*), đồng bộ chế độ hoạt động là BUYER
  useEffect(() => {
    if (profile && profile.role === Role.SELLER && profile.currentMode === 'SELLER') {
      void switchActiveMode('BUYER').catch(() => undefined);
    }
  }, [profile, switchActiveMode]);

  const handleGoToSellerCenter = async () => {
    await switchActiveMode('SELLER');
    navigate('/seller');
  };

  return (
    <div className="nexus-shell min-h-[calc(100vh-140px)] py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-5 flex items-center gap-2 text-xs text-slate-500">
          <NavLink to="/" className="hover:text-blue-600 transition-colors font-medium">
            {t('common:nav.home')}
          </NavLink>
          <ChevronRight size={13} />
          <span className="font-semibold text-[var(--color-navy)]">
            {t('common:nav.buyerPortal')}
          </span>
          {location.pathname !== '/buyer' && (
            <>
              <ChevronRight size={13} />
              <span className="text-slate-700 font-medium">
                {(() => {
                  const found = navItems.find((item) => item.to === location.pathname);
                  return found ? t(`buyer:${found.key}`) : t('common:actions.viewDetails');
                })()}
              </span>
            </>
          )}
        </nav>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Buyer Navigation Sidebar */}
          <aside className="lg:sticky lg:top-40 lg:col-span-4 xl:col-span-3 space-y-4">
            {/* User Profile Card (Blue & White Theme) */}
            <div className="nexus-panel p-5">
              <div className="flex items-center gap-3.5 mb-4">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="h-12 w-12 rounded-lg object-cover border border-blue-200"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-navy)] text-white font-bold text-lg">
                    {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-900">
                    {profile?.fullName || t('buyer:layout.defaultName')}
                  </h3>
                  <p className="truncate text-xs text-slate-500">
                    {profile?.email || t('buyer:layout.noEmail')}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-600 text-white">
                      {t('buyer:layout.roleBadge')}
                    </span>
                    {hasSellerRole && (
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                        {t('buyer:layout.hasShop')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Balance & Reputation Boxes */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                <div className="rounded-md bg-blue-50/60 p-2.5 border border-blue-100">
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-0.5">
                    <Wallet size={12} className="text-blue-600" />
                    <span>{t('buyer:layout.walletBalance')}</span>
                  </div>
                  <span className="font-bold text-blue-700 text-xs truncate block">
                    {formatCurrency(Number(profile?.wallet?.balance ?? 0))}
                  </span>
                </div>
                <div className="rounded-md bg-slate-50 p-2.5 border border-slate-200/80">
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-0.5">
                    <Award size={12} className="text-blue-600" />
                    <span>{t('buyer:layout.reputationScore')}</span>
                  </div>
                  <span className="font-bold text-slate-800 text-xs truncate block">
                    {profile?.reputationScore ?? 100} ({profile?.trustLevel ?? 'STANDARD'})
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="nexus-panel space-y-1 p-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-primary shadow-[inset_3px_0_0_var(--color-primary)]'
                        : 'text-muted hover:bg-slate-50 hover:text-ink'
                    }`
                  }
                >
                  {item.icon}
                  <span className="flex-1">{t(`buyer:${item.key}`)}</span>
                </NavLink>
              ))}
            </nav>

            {/* Switch to Seller or Upgrade to Seller Card (Blue & White) */}
            {hasSellerRole ? (
              <div className="rounded-lg border border-blue-200 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 text-[var(--color-navy)] font-bold text-xs mb-1">
                  <Store size={15} className="text-blue-600" />
                  <span>{t('buyer:layout.sellerCenterTitle')}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  {t('buyer:layout.sellerCenterDesc')}
                </p>
                <button
                  type="button"
                  onClick={() => void handleGoToSellerCenter()}
                  className="w-full py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{t('buyer:layout.switchToSeller')}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
                <div className="flex items-center gap-2 text-[var(--color-navy)] font-bold text-xs mb-1">
                  <Store size={15} className="text-blue-600" />
                  <span>{t('buyer:layout.openShopTitle')}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  {t('buyer:layout.openShopDesc')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer"
                >
                  {t('buyer:layout.registerSeller')}
                </button>
              </div>
            )}
          </aside>

          {/* Right Column: Dynamic Content Outlet */}
          <section className="lg:col-span-8 xl:col-span-9 min-h-[500px]">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </section>
        </div>
      </div>

      {/* Upgrade Seller Modal */}
      <UpgradeSellerModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        profile={profile}
      />
    </div>
  );
}
