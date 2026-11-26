import PageTransition from '../components/common/PageTransition';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const contentRef = useRef<HTMLElement>(null);

  // Only the page pane scrolls on desktop; sidebar navigation keeps its place.
  useLayoutEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [location.pathname]);

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
    <div className="buyer-workspace nexus-shell">
      <div className="buyer-workspace-inner mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-4 flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted">
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
        <div className="buyer-workspace-grid grid gap-5 lg:gap-6">
          {/* Left Column: Buyer Navigation Sidebar */}
          <aside className="buyer-sidebar nexus-panel">
            {/* User Profile Card (Blue & White Theme) */}
            <div className="shrink-0 border-b border-line p-4">
              <div className="flex items-center gap-3 mb-3">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="size-11 shrink-0 rounded-xl object-cover border border-blue-100"
                  />
                ) : (
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white font-semibold text-lg">
                    {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-ink">
                    {profile?.fullName || t('buyer:layout.defaultName')}
                  </h3>
                  <p className="truncate text-xs text-slate-500">
                    {profile?.email || t('buyer:layout.noEmail')}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-primary">
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
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="min-w-0 rounded-xl bg-blue-50/60 p-2.5">
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-0.5">
                    <Wallet size={12} className="text-blue-600" />
                    <span>{t('buyer:layout.walletBalance')}</span>
                  </div>
                  <span className="font-bold text-blue-700 text-xs truncate block">
                    {formatCurrency(Number(profile?.wallet?.balance ?? 0))}
                  </span>
                </div>
                <div className="min-w-0 rounded-xl bg-slate-50 p-2.5">
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 mb-0.5">
                    <Award size={12} className="text-blue-600" />
                    <span>{t('buyer:layout.reputationScore')}</span>
                  </div>
                  <span className="font-bold text-slate-800 text-xs truncate block">
                    {profile?.reputationScore ?? 100}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav aria-label={t('common:nav.buyerPortal')} className="buyer-sidebar-nav p-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-11 shrink-0 items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
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
              <div className="shrink-0 border-t border-line p-3">
                <button
                  type="button"
                  onClick={() => void handleGoToSellerCenter()}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-blue-100"
                >
                  <Store size={16} />
                  <span>{t('buyer:layout.switchToSeller')}</span>
                </button>
              </div>
            ) : (
              <div className="shrink-0 border-t border-line p-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-blue-100"
                >
                  <Store size={16} />
                  {t('buyer:layout.registerSeller')}
                </button>
              </div>
            )}
          </aside>

          {/* Right Column: Dynamic Content Outlet */}
          <section
            ref={contentRef}
            className="buyer-content min-w-0"
            tabIndex={0}
            aria-label={t('common:nav.buyerPortal')}
          >
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
