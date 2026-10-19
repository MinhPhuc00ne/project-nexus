import React, { useState, useRef, useEffect } from 'react';
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
import { toggleSellerMode } from '../../services/users';
import { getCartItems } from '../../services/cart';
import { useAuth } from '../../contexts/AuthContext';
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
    setProfile,
    refreshProfile,
  } = useAuth();
  const [storedCart, setStoredCart] = useState<StoredCartItem[]>(() => getCartItems());

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
        }));

  const effectiveLoggedIn = isLoggedIn ?? authIsLoggedIn;
  const displayUserName =
    userName || profile?.fullName || storedUser?.fullName || storedUser?.email || 'Tài khoản';
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
      const nextActive = profile.role === Role.SELLER ? true : !profile.isSellerActive;
      const res = await toggleSellerMode(nextActive);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isSellerActive: res.isSellerActive,
              currentMode: res.currentMode,
            }
          : null,
      );
      showToast(res.message);
      if (profile.role === Role.SELLER) window.location.assign('/seller');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Chuyển đổi chế độ thất bại.');
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
      showToast('Tài khoản của bạn đã là Người bán (Seller) rồi!');
      return;
    }
    setShowUpgradeModal(true);
  };

  const [currentLang, setCurrentLang] = useState<'vi' | 'en' | 'jp'>('vi');
  const [showLangMenu, setShowLangMenu] = useState(false);

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAppQrModal, setShowAppQrModal] = useState(false);

  const [selectedFloor, setSelectedFloor] = useState('Tất Cả Sàn');
  const [showFloorMenu, setShowFloorMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showCartPanel, setShowCartPanel] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'jp', label: '日本語', flag: '🇯🇵' },
  ];

  const floors = [
    'Tất Cả Sàn',
    'Sàn Đấu Giá Live',
    'Sàn Mua Ngay',
    'Thiết Bị Công Nghệ',
    'Đồ Cổ & Độc Bản',
  ];

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
      <div className="hidden h-9 border-b border-slate-200 bg-slate-50 text-[13px] text-slate-500 lg:flex">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleSeller}
              disabled={isTogglingSeller}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium transition-colors hover:bg-orange-50 hover:text-[#f24e1e] cursor-pointer"
              title={
                profile?.role === 'SELLER' || profile?.role === 'ADMIN'
                  ? 'Bấm để Bật/Tắt chế độ Người bán'
                  : 'Đăng ký trở thành Người bán'
              }
            >
              <Store size={14} />
              <span>Kênh Người Bán</span>
              {(profile?.role === 'SELLER' || profile?.role === 'ADMIN') && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    profile.isSellerActive
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isTogglingSeller ? '...' : profile.isSellerActive ? 'BẬT' : 'TẮT'}
                </span>
              )}
            </button>

            <span className="text-xs text-slate-200">|</span>

            <button
              type="button"
              onClick={handleOpenUpgradeModal}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium transition-colors hover:bg-orange-50 hover:text-[#f24e1e] cursor-pointer"
            >
              <ShoppingBag size={14} />
              <span>{profile?.role === 'SELLER' ? 'Hồ sơ Người Bán' : 'Trở thành Seller'}</span>
            </button>

            <span className="text-xs text-slate-200">|</span>

            <div
              className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 font-medium transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
              onMouseEnter={() => setShowAppQrModal(true)}
              onMouseLeave={() => setShowAppQrModal(false)}
            >
              <Smartphone size={14} />
              <span>Tải Ứng Dụng</span>

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

                    <p className="my-2 text-[11px] text-slate-500">Quét mã QR để tải App NEXUS</p>

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

            <span className="text-xs text-slate-200">|</span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">Kết nối:</span>

              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center text-slate-500 transition-colors hover:text-[#1c3973]"
                title="Globe"
              >
                <Globe size={15} />
              </a>

              <a
                href="#chat"
                className="flex items-center justify-center text-slate-500 transition-colors hover:text-[#1c3973]"
                title="Chat"
              >
                <MessageSquare size={15} />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
              >
                <div className="relative inline-flex">
                  <Bell size={14} />

                  {notifications.some((n) => n.unread) && (
                    <span className="absolute -right-1 -top-0.5 h-[7px] w-[7px] animate-pulse rounded-full border border-slate-50 bg-[#f24e1e]" />
                  )}
                </div>

                <span>Thông Báo</span>
              </button>

              <NotificationDropdown isOpen={showNotifMenu} notifications={notifications} />
            </div>

            <span className="text-xs text-slate-200">|</span>

            <a
              href="#help"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
            >
              <HelpCircle size={14} />
              <span>Trợ Giúp</span>
            </a>

            <span className="text-xs text-slate-200">|</span>

            <div className="relative" ref={langRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
                onClick={() => setShowLangMenu(!showLangMenu)}
              >
                <Globe size={14} />

                <span>{languages.find((l) => l.code === currentLang)?.label}</span>

                <ChevronDown
                  size={13}
                  className={`transition-transform ${showLangMenu ? 'rotate-180' : ''}`}
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
                        setCurrentLang(lang.code as 'vi' | 'en' | 'jp');
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

            <span className="text-xs text-slate-200">|</span>

            {effectiveLoggedIn ? (
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  {displayUserAvatar ? (
                    <img
                      src={displayUserAvatar}
                      alt={displayUserName}
                      referrerPolicy="no-referrer"
                      className="h-[22px] w-[22px] rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#1c3973] text-white">
                      <User size={13} />
                    </div>
                  )}

                  <span className="font-semibold text-slate-800">{displayUserName}</span>

                  <ChevronDown
                    size={13}
                    className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
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
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md px-1.5 py-1 text-[13px] font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
                  onClick={onLoginClick}
                >
                  Đăng Nhập
                </button>

                <span className="text-xs text-slate-200">|</span>

                <button
                  type="button"
                  className="inline-flex items-center rounded-md px-1.5 py-1 text-[13px] font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
                  onClick={onRegisterClick}
                >
                  Đăng Ký
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white py-3.5 pb-2.5">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-6 px-4">
          <a
            href="/"
            className="flex shrink-0 cursor-pointer items-center transition-transform hover:scale-[1.02]"
            title="NEXUS Platform"
          >
            <img
              src={logoPath}
              alt="NEXUS Logo"
              className="block h-[54px] w-auto object-contain"
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
                    {floors.map((floor, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`w-full rounded-md border-0 bg-transparent px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-slate-100 ${
                          selectedFloor === floor
                            ? 'bg-orange-50 font-bold text-[#f24e1e]'
                            : 'text-slate-800'
                        }`}
                        onClick={() => {
                          setSelectedFloor(floor);
                          setShowFloorMenu(false);
                        }}
                      >
                        {floor}
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
                  placeholder="Tìm kiếm hơn 50.000+ sản phẩm công nghệ, gear, nghệ thuật hoặc phiên đấu..."
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

            <div className="hidden items-center gap-2 overflow-hidden pl-2 text-xs lg:flex">
              <span className="shrink-0 text-slate-400">Xu hướng:</span>

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
          </div>

          <div className="relative shrink-0" ref={cartRef}>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full border border-[#d6e4ff] bg-[#f0f5ff] px-3.5 py-2 transition-all hover:-translate-y-px hover:border-[#adc6ff] hover:bg-[#e6f0ff]"
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

              <span className="text-sm font-bold text-[#1c3973]">Giỏ Hàng</span>
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
