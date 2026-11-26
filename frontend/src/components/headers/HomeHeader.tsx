import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/types';
import {
  Store,
  Smartphone,
  Globe,
  MessageSquare,
  Bell,
  HelpCircle,
  ChevronDown,
  User,
  Check,
  Search,
  ShoppingCart,
  ShoppingBag,
  X,
  CheckCircle2,
} from 'lucide-react';
import { getCartItems } from '../../services/cart';
import { useAuth } from '../../contexts/AuthContext';
import { SUPPORTED_LANGUAGES, normalizeLanguage } from '../../i18n/config';
import { getNotificationUnreadCount } from '../../services/notifications';
import {
  notificationUnreadCountQueryKey,
  subscribeNotificationsToQueryCache,
} from '../../lib/socketManager';
import { queryClient } from '../../lib/queryClient';
import type { CartItem as StoredCartItem, NotificationItem } from '../../types';
import NotificationDropdown from './NotificationDropdown';
import CartDropdownPanel from './CartDropdownPanel';
import UserDropdownMenu from './UserDropdownMenu';
import UpgradeSellerModal from './UpgradeSellerModal';

export type { NotificationItem };

export interface CartItem {
  id: string | number;
  name: string;
  price: string;
  qty?: number;
  img?: string;
}

export interface HomeHeaderProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string | null;
  isLoggedIn?: boolean;
  cartCount?: number;
  logoPath?: string;
  trendingKeywords?: string[];
  notifications?: NotificationItem[];
  cartItems?: CartItem[];
  onSearch?: (query: string, floor: string) => void;
  onKeywordClick?: (keyword: string) => void;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
  onLogoutClick?: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  userName,
  userEmail,
  userAvatar,
  isLoggedIn,
  cartCount = 0,
  logoPath = '/images/logo.png',
  trendingKeywords = [],
  notifications = [],
  cartItems = [],
  onSearch,
  onKeywordClick,
  onLoginClick,
  onRegisterClick,
  onLogoutClick,
}) => {
  const {
    user: profile,
    storedUser,
    isAuthenticated: authIsLoggedIn,
    switchActiveMode,
    refreshProfile,
  } = useAuth();
  const [storedCart, setStoredCart] = useState<StoredCartItem[]>(() => getCartItems());
  const { data: unreadData } = useQuery({
    queryKey: notificationUnreadCountQueryKey,
    queryFn: getNotificationUnreadCount,
    enabled: authIsLoggedIn,
  });
  const realUnreadCount = authIsLoggedIn ? (unreadData?.unreadCount ?? 0) : 0;

  useEffect(() => {
    if (!authIsLoggedIn) return;
    return subscribeNotificationsToQueryCache();
  }, [authIsLoggedIn]);

  useEffect(() => {
    const syncCart = () => setStoredCart(getCartItems());
    window.addEventListener('nexus:cart-change', syncCart);
    window.addEventListener('storage', syncCart);
    return () => {
      window.removeEventListener('nexus:cart-change', syncCart);
      window.removeEventListener('storage', syncCart);
    };
  }, []);

  const effectiveCartCount =
    cartCount > 0 ? cartCount : storedCart.reduce((acc, c) => acc + c.qty, 0);
  const effectiveCartItems =
    cartItems.length > 0
      ? cartItems
      : storedCart.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.formattedPrice,
          img: i.img,
          qty: i.qty,
          selections: i.selections,
        }));

  const { t, i18n } = useTranslation('common');
  const currentLang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const effectiveLoggedIn = isLoggedIn ?? authIsLoggedIn;
  const displayUserName =
    userName ||
    profile?.fullName ||
    storedUser?.fullName ||
    storedUser?.email ||
    t('header.accountFallback');
  const displayUserEmail = userEmail ?? profile?.email ?? storedUser?.email;
  const displayUserAvatar =
    userAvatar !== undefined ? userAvatar : (profile?.avatarUrl ?? storedUser?.avatarUrl);

  const [isTogglingSeller, setIsTogglingSeller] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleSeller = async () => {
    if (!effectiveLoggedIn) {
      if (onLoginClick) onLoginClick();
      else window.location.assign('/login');
      return;
    }
    if (profile?.role !== Role.SELLER && profile?.role !== Role.ADMIN) {
      handleOpenUpgradeModal();
      return;
    }
    setIsTogglingSeller(true);
    try {
      await switchActiveMode('SELLER');
      showToast(t('header.sellerModeActivated'));
      if (profile.role === Role.SELLER) window.location.assign('/seller');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('header.modeSwitchFailed'));
    } finally {
      setIsTogglingSeller(false);
    }
  };

  const handleOpenUpgradeModal = () => {
    if (!effectiveLoggedIn) {
      if (onLoginClick) onLoginClick();
      else window.location.assign('/login');
      return;
    }
    if (profile?.role === Role.SELLER) {
      void switchActiveMode('SELLER')
        .then(() => {
          window.location.assign('/seller/settings');
        })
        .catch((err: unknown) => {
          showToast(err instanceof Error ? err.message : t('header.cannotSwitchSellerMode'));
        });
      return;
    }
    setShowUpgradeModal(true);
  };

  const [showLangMenu, setShowLangMenu] = useState(false);

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAppQrModal, setShowAppQrModal] = useState(false);

  const [selectedFloorKey, setSelectedFloorKey] = useState<
    'all' | 'liveAuction' | 'buyNow' | 'tech' | 'collectibles'
  >('all');
  const [showFloorMenu, setShowFloorMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showCartPanel, setShowCartPanel] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  const languages = SUPPORTED_LANGUAGES.map((item) => ({
    code: item.code,
    label: item.label,
    flag: item.code === 'vi' ? '🇻🇳' : '🇺🇸',
  }));

  const floorKeys = ['all', 'liveAuction', 'buyNow', 'tech', 'collectibles'] as const;
  const selectedFloor = t(`header.floors.${selectedFloorKey}`);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;

      if (langRef.current && !langRef.current.contains(target)) {
        setShowLangMenu(false);
      }

      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifMenu(false);
      }

      if (userRef.current && !userRef.current.contains(target)) {
        setShowUserMenu(false);
      }

      if (floorRef.current && !floorRef.current.contains(target)) {
        setShowFloorMenu(false);
      }

      if (cartRef.current && !cartRef.current.contains(target)) {
        setShowCartPanel(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (onSearch) {
      onSearch(searchQuery, selectedFloor);
    }
  };

  return (
    <header className="home-header sticky top-0 z-[1000] w-full bg-white font-sans shadow-sm">
      <div className="h-9 border-b border-slate-200 bg-slate-50 text-[12px] sm:text-[13px] text-slate-500 flex items-center">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-2 sm:px-4 py-1 gap-2">
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleSeller}
              disabled={isTogglingSeller}
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-1.5 py-1 font-medium transition-colors hover:bg-orange-50 hover:text-[#f24e1e] cursor-pointer whitespace-nowrap"
              title={
                profile?.role === 'SELLER' || profile?.role === 'ADMIN'
                  ? t('header.toggleSellerTitle')
                  : t('header.becomeSellerTitle')
              }
            >
              <Store size={14} className="shrink-0" />
              <span className="hidden lg:inline">{t('header.sellerChannel')}</span>
              <span className="lg:hidden">{t('header.sellerShort')}</span>
              {(profile?.role === 'SELLER' || profile?.role === 'ADMIN') && (
                <span
                  className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded font-bold ${
                    profile.isSellerActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isTogglingSeller
                    ? '...'
                    : profile.isSellerActive
                      ? t('header.on')
                      : t('header.off')}
                </span>
              )}
            </button>

            <span className="text-xs text-slate-300">|</span>

            <button
              type="button"
              onClick={handleOpenUpgradeModal}
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-1.5 py-1 font-medium transition-colors hover:bg-orange-50 hover:text-[#f24e1e] cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag size={14} className="shrink-0" />
              <span className="hidden lg:inline">
                {profile?.role === 'SELLER' ? t('header.sellerProfile') : t('header.becomeSeller')}
              </span>
              <span className="lg:hidden">Seller</span>
            </button>

            <span className="text-xs text-slate-300">|</span>

            <div
              className="relative inline-flex cursor-pointer items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-1.5 py-1 font-medium transition-colors hover:bg-orange-50 hover:text-[#f24e1e] whitespace-nowrap"
              onMouseEnter={() => setShowAppQrModal(true)}
              onMouseLeave={() => setShowAppQrModal(false)}
            >
              <Smartphone size={14} className="shrink-0" />
              <span className="hidden lg:inline">{t('header.downloadApp')}</span>
              <span className="lg:hidden">{t('header.downloadAppShort')}</span>

              {showAppQrModal && (
                <div className="absolute left-0 top-full z-[1010] mt-2">
                  <div className="animate-home-popover-enter motion-reduce:animate-none w-[200px] rounded-[10px] border border-slate-200 bg-white p-3.5 text-center shadow-[0_16px_40px_rgb(20_34_62_/_14%)]">
                    <div className="mx-auto flex h-[130px] w-[130px] items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="h-10 w-10 rounded bg-[#1c3973]" />
                        <div className="h-10 w-10 rounded bg-[#1c3973]" />
                        <div className="h-10 w-10 rounded bg-[#1c3973]" />
                      </div>
                    </div>

                    <p className="my-2 text-[11px] text-slate-500">
                      {t('header.scanQrToDownload')}
                    </p>

                    <div className="flex justify-center gap-1.5">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        App Store
                      </span>

                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        Google Play
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <span className="text-xs text-slate-300">|</span>

            <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span className="text-xs text-slate-500 hidden xl:inline">{t('header.connect')}</span>

              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center text-slate-500 transition-colors hover:text-[#1c3973]"
                title="Facebook"
              >
                <Globe size={14} />
              </a>

              <a
                href="#chat"
                className="flex items-center justify-center text-slate-500 transition-colors hover:text-[#1c3973]"
                title="Chat"
              >
                <MessageSquare size={14} />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e] cursor-pointer whitespace-nowrap"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                title={t('nav.notifications')}
              >
                <div className="relative inline-flex">
                  <Bell size={14} />

                  {(realUnreadCount > 0 || notifications.some((n) => n.unread)) && (
                    <span className="absolute -right-1.5 -top-1 h-3.5 min-w-[14px] px-0.5 text-[9px] font-bold text-white bg-[#f24e1e] rounded-full flex items-center justify-center">
                      {realUnreadCount > 99 ? '99+' : realUnreadCount > 0 ? realUnreadCount : ''}
                    </span>
                  )}
                </div>

                <span className="hidden lg:inline">{t('nav.notifications')}</span>
              </button>

              <NotificationDropdown
                isOpen={showNotifMenu}
                onClose={() => setShowNotifMenu(false)}
                onCountChange={(cnt) =>
                  queryClient.setQueryData(notificationUnreadCountQueryKey, { unreadCount: cnt })
                }
              />
            </div>

            <span className="text-xs text-slate-300">|</span>

            <a
              href="#help"
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e] whitespace-nowrap"
              title={t('header.helpCenter')}
            >
              <HelpCircle size={14} className="shrink-0" />
              <span className="hidden lg:inline">{t('header.helpCenter')}</span>
            </a>

            <span className="text-xs text-slate-300">|</span>

            <div className="relative" ref={langRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e] whitespace-nowrap"
                onClick={() => setShowLangMenu(!showLangMenu)}
                title={t('language.label')}
              >
                <Globe size={14} className="shrink-0" />

                <span className="hidden md:inline">
                  {languages.find((l) => l.code === currentLang)?.label}
                </span>
                <span className="md:hidden uppercase text-[11px] font-semibold">{currentLang}</span>

                <ChevronDown
                  size={13}
                  className={`transition-transform shrink-0 ${showLangMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showLangMenu && (
                <div className="animate-home-popover-enter motion-reduce:animate-none absolute right-0 top-[calc(100%+6px)] z-[1100] w-[155px] overflow-hidden rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgb(20_34_62_/_14%)]">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[13px] transition-colors hover:bg-slate-100 ${
                        currentLang === lang.code
                          ? 'font-semibold text-[#1c3973]'
                          : 'text-slate-800'
                      }`}
                      onClick={() => {
                        void i18n.changeLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                    >
                      <span>
                        {lang.flag} {lang.label}
                      </span>

                      {currentLang === lang.code && <Check size={14} className="text-[#1c3973]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-xs text-slate-300">|</span>

            {effectiveLoggedIn ? (
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e] whitespace-nowrap cursor-pointer"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  {displayUserAvatar ? (
                    <img
                      src={displayUserAvatar}
                      alt={displayUserName}
                      referrerPolicy="no-referrer"
                      className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px] rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="flex h-[20px] w-[20px] sm:h-[22px] sm:w-[22px] items-center justify-center rounded-full bg-[#1c3973] text-white shrink-0">
                      <User size={13} />
                    </div>
                  )}

                  <span className="font-semibold text-slate-800 max-w-[65px] sm:max-w-[85px] lg:max-w-[130px] truncate">
                    {displayUserName}
                  </span>

                  <ChevronDown
                    size={13}
                    className={`transition-transform shrink-0 ${showUserMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                <UserDropdownMenu
                  isOpen={showUserMenu}
                  onClose={() => setShowUserMenu(false)}
                  profile={profile}
                  displayUserName={displayUserName}
                  displayUserEmail={displayUserEmail}
                  displayUserAvatar={displayUserAvatar}
                  onLogoutClick={onLogoutClick}
                />
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md px-1 sm:px-1.5 py-1 text-[12px] sm:text-[13px] font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
                  onClick={onLoginClick}
                >
                  {t('nav.login')}
                </button>

                <span className="text-xs text-slate-300">|</span>

                <button
                  type="button"
                  className="inline-flex items-center rounded-md px-1 sm:px-1.5 py-1 text-[12px] sm:text-[13px] font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
                  onClick={onRegisterClick}
                >
                  {t('nav.register')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white py-2 sm:py-3.5 pb-2 sm:pb-2.5">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-2.5 sm:gap-4 md:gap-6 px-2 sm:px-4">
          <a
            href="/"
            className="flex shrink-0 cursor-pointer items-center transition-transform hover:scale-[1.02]"
            title="NEXUS Platform"
          >
            <img
              src={logoPath}
              alt="NEXUS Logo"
              className="block h-[38px] sm:h-[46px] md:h-[54px] w-auto object-contain"
              onError={(e) => {
                const image = e.currentTarget;
                image.onerror = null;
                image.src = '/images/NEXUS.png';
              }}
            />
          </a>

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <form
              className="flex items-center rounded-full border-2 border-[#f24e1e] bg-white py-0.5 pl-3.5 pr-0.5 shadow-[0_2px_6px_rgba(242,78,30,0.08)] transition-[border-color,box-shadow] duration-[160ms] ease-linear focus-within:border-[#1c3973] focus-within:shadow-[0_4px_16px_rgb(28_57_115_/_18%)] motion-reduce:transition-none"
              onSubmit={handleSearchSubmit}
            >
              <div className="relative shrink-0" ref={floorRef}>
                <button
                  type="button"
                  className="flex items-center gap-1.5 whitespace-nowrap border-0 bg-transparent px-2.5 py-2 text-[13px] font-bold text-slate-800"
                  onClick={() => setShowFloorMenu(!showFloorMenu)}
                >
                  <span>{selectedFloor}</span>

                  <ChevronDown
                    size={14}
                    className={`transition-transform ${showFloorMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showFloorMenu && (
                  <div className="animate-home-popover-enter motion-reduce:animate-none absolute left-[-12px] top-[calc(100%+12px)] z-[1200] w-[200px] rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgb(20_34_62_/_14%)]">
                    {floorKeys.map((floorKey) => (
                      <button
                        key={floorKey}
                        type="button"
                        className={`w-full rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-slate-100 ${
                          selectedFloorKey === floorKey
                            ? 'bg-orange-50 font-bold text-[#f24e1e]'
                            : 'text-slate-800'
                        }`}
                        onClick={() => {
                          setSelectedFloorKey(floorKey);
                          setShowFloorMenu(false);
                        }}
                      >
                        {t(`header.floors.${floorKey}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mx-1.5 h-6 w-px shrink-0 bg-slate-300" />

              <div className="relative flex min-w-0 flex-1 items-center">
                <input
                  type="text"
                  className="w-full border-0 bg-transparent px-1.5 py-2 pr-8 text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
                  placeholder={t('header.searchFullPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-2 flex items-center justify-center rounded-full border-0 bg-transparent p-0.5 text-slate-400 hover:text-slate-800"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                aria-label="Search"
                className="flex h-[38px] w-[58px] shrink-0 items-center justify-center rounded-full border-0 bg-gradient-to-br from-[#ff6b35] to-[#ee4d2d] text-white transition-transform hover:scale-[1.04] hover:shadow-[0_4px_12px_rgba(238,77,45,0.35)]"
              >
                <Search size={18} />
              </button>
            </form>

            {trendingKeywords.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pl-2 text-xs">
                <span className="shrink-0 text-slate-400">{t('header.trending')}</span>

                <div className="flex items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {trendingKeywords.map((kw, idx) => (
                    <a
                      key={idx}
                      href={`#search?q=${kw}`}
                      className="whitespace-nowrap text-slate-500 no-underline transition-colors hover:text-[#f24e1e]"
                      onClick={(e) => {
                        e.preventDefault();

                        setSearchQuery(kw);

                        if (onKeywordClick) {
                          onKeywordClick(kw);
                        }

                        if (onSearch) {
                          onSearch(kw, selectedFloor);
                        }
                      }}
                    >
                      {kw}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative shrink-0" ref={cartRef}>
            <button
              type="button"
              className="flex items-center gap-1.5 sm:gap-2.5 rounded-full border border-[#d6e4ff] bg-[#f0f5ff] px-2.5 sm:px-3.5 py-1.5 sm:py-2 transition-all hover:-translate-y-px hover:border-[#adc6ff] hover:bg-[#e6f0ff] cursor-pointer"
              onClick={() => setShowCartPanel(!showCartPanel)}
            >
              <div className="relative flex items-center">
                <ShoppingCart size={20} className="text-[#f24e1e]" />
                {effectiveCartCount > 0 && (
                  <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f24e1e] px-1 text-[10px] font-bold text-white">
                    {effectiveCartCount > 99 ? '99+' : effectiveCartCount}
                  </span>
                )}
              </div>

              <span className="text-xs sm:text-sm font-bold text-[#1c3973] whitespace-nowrap">
                {t('nav.cart')}
              </span>
            </button>

            <CartDropdownPanel
              isOpen={showCartPanel}
              cartItems={effectiveCartItems}
              onClose={() => setShowCartPanel(false)}
            />
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl transition-all">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <UpgradeSellerModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        profile={profile}
        onSuccess={(msg) => {
          showToast(msg);
          void refreshProfile();
        }}
      />
    </header>
  );
};

export default HomeHeader;
