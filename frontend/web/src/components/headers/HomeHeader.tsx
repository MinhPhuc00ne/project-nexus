import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  ShoppingBag,
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
  X,
  Package,
  Gavel,
  Heart,
  LogOut,
} from 'lucide-react';
import './HomeHeader.css';

export interface NotificationItem {
  id: string | number;
  title: string;
  desc?: string;
  time?: string;
  unread?: boolean;
}

export interface CartItem {
  id: string | number;
  name: string;
  price: string;
  qty?: number;
  img?: string;
}

export interface HomeHeaderProps {
  userName?: string;
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
  userName = 'Tài khoản',
  isLoggedIn = false,
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
  // Language
  const [currentLang, setCurrentLang] = useState<'vi' | 'en' | 'jp'>('vi');
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Dropdown menus
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAppQrModal, setShowAppQrModal] = useState(false);

  // Search
  const [selectedFloor, setSelectedFloor] = useState('Tất Cả Sàn');
  const [showFloorMenu, setShowFloorMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cart
  const [showCartPanel, setShowCartPanel] = useState(false);

  // Refs
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

  // Close dropdowns when clicking outside
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
      {/* =========================================================
          1. TOP UTILITY BAR
      ========================================================= */}
      <div className="hidden h-9 border-b border-slate-200 bg-slate-50 text-[13px] text-slate-500 lg:flex">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4">
          {/* LEFT */}
          <div className="flex items-center gap-2.5">
            <a
              href="#seller-center"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
            >
              <Store size={14} />
              <span>Kênh Người Bán</span>
            </a>

            <span className="text-xs text-slate-200">|</span>

            <a
              href="#become-seller"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
            >
              <ShoppingBag size={14} />
              <span>Trở thành Seller</span>
            </a>

            <span className="text-xs text-slate-200">|</span>

            {/* Download App */}
            <div
              className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 font-medium transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
              onMouseEnter={() => setShowAppQrModal(true)}
              onMouseLeave={() => setShowAppQrModal(false)}
            >
              <Smartphone size={14} />
              <span>Tải Ứng Dụng</span>

              {showAppQrModal && (
                <div className="absolute left-0 top-full z-[1010] mt-2">
                  <div className="home-header-popover w-[200px] rounded-[10px] border border-slate-200 bg-white p-3.5 text-center shadow-xl">
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

            {/* Social */}
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

          {/* RIGHT */}
          <div className="flex items-center gap-2.5">
            {/* Notifications */}
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

              {showNotifMenu && (
                <div className="home-header-popover absolute right-0 top-[calc(100%+6px)] z-[1100] w-[360px] overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h4 className="m-0 text-sm font-bold text-slate-800">Thông báo</h4>
                  </div>

                  <div className="max-h-[280px] overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`flex gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 ${
                            item.unread ? 'bg-orange-50/60' : ''
                          }`}
                        >
                          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[#1c3973]">
                            <Bell size={16} />
                          </div>

                          <div>
                            <h5 className="mb-1 text-[13px] font-semibold text-slate-800">
                              {item.title}
                            </h5>

                            {item.desc && (
                              <p className="mb-1 text-xs leading-[1.4] text-slate-500">
                                {item.desc}
                              </p>
                            )}

                            {item.time && (
                              <span className="text-[11px] text-slate-400">{item.time}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-5 text-center text-[13px] text-slate-400">
                        Không có thông báo mới
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <span className="text-xs text-slate-200">|</span>

            {/* Help */}
            <a
              href="#help"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
            >
              <HelpCircle size={14} />
              <span>Trợ Giúp</span>
            </a>

            <span className="text-xs text-slate-200">|</span>

            {/* Language */}
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
                <div className="home-header-popover absolute right-0 top-[calc(100%+6px)] z-[1100] w-[155px] overflow-hidden rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-xl">
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

            {/* Account */}
            {isLoggedIn ? (
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-500 transition-colors hover:bg-orange-50 hover:text-[#f24e1e]"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#1c3973] text-white">
                    <User size={13} />
                  </div>

                  <span className="font-semibold text-slate-800">{userName}</span>

                  <ChevronDown
                    size={13}
                    className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showUserMenu && (
                  <div className="home-header-popover absolute right-0 top-[calc(100%+6px)] z-[1100] w-[240px] overflow-hidden rounded-[10px] border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="mb-1.5 flex items-center gap-3 rounded-md bg-slate-50 p-2.5">
                      <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#1c3973] text-white">
                        <User size={20} />
                      </div>

                      <div>
                        <p className="m-0 text-sm font-bold text-slate-800">{userName}</p>
                      </div>
                    </div>

                    <div className="my-1.5 h-px bg-slate-200" />

                    <a
                      href="#profile"
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-slate-100"
                    >
                      <User size={15} />
                      <span>Hồ sơ cá nhân</span>
                    </a>

                    <a
                      href="#orders"
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-slate-100"
                    >
                      <Package size={15} />
                      <span>Đơn hàng của tôi</span>
                    </a>

                    <a
                      href="#auctions"
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-slate-100"
                    >
                      <Gavel size={15} />
                      <span>Phiên đấu giá đang tham gia</span>
                    </a>

                    <a
                      href="#favorites"
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-slate-800 transition-colors hover:bg-slate-100"
                    >
                      <Heart size={15} />
                      <span>Sản phẩm yêu thích</span>
                    </a>

                    <div className="my-1.5 h-px bg-slate-200" />

                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] text-red-500 transition-colors hover:bg-red-50"
                      onClick={() => {
                        setShowUserMenu(false);

                        if (onLogoutClick) {
                          onLogoutClick();
                        }
                      }}
                    >
                      <LogOut size={15} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
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

      {/* =========================================================
          2. MAIN HEADER
      ========================================================= */}
      <div className="bg-white py-3.5 pb-2.5">
        <div className="mx-auto flex w-full max-w-[1280px] items-center gap-6 px-4">
          {/* LOGO */}
          <div
            className="flex shrink-0 cursor-pointer items-center transition-transform hover:scale-[1.02]"
            title="NEXUS Platform"
          >
            <img
              src={logoPath}
              alt="NEXUS Logo"
              className="block h-[54px] w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/nexus-logo.svg';
              }}
            />
          </div>

          {/* SEARCH */}
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <form
              className="home-header-search flex items-center rounded-full border-2 border-[#f24e1e] bg-white py-0.5 pl-3.5 pr-0.5 shadow-[0_2px_6px_rgba(242,78,30,0.08)] transition-shadow"
              onSubmit={handleSearchSubmit}
            >
              {/* FLOOR */}
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
                  <div className="home-header-popover absolute left-[-12px] top-[calc(100%+12px)] z-[1200] w-[200px] rounded-[10px] border border-slate-200 bg-white p-1.5 shadow-xl">
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

              {/* INPUT */}
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

              {/* SEARCH BUTTON */}
              <button
                type="submit"
                aria-label="Search"
                className="flex h-[38px] w-[58px] shrink-0 items-center justify-center rounded-full border-0 bg-gradient-to-br from-[#ff6b35] to-[#ee4d2d] text-white transition-transform hover:scale-[1.04] hover:shadow-[0_4px_12px_rgba(238,77,45,0.35)]"
              >
                <Search size={18} />
              </button>
            </form>

            {/* TRENDING */}
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

          {/* CART */}
          <div className="relative shrink-0" ref={cartRef}>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full border border-[#d6e4ff] bg-[#f0f5ff] px-3.5 py-2 transition-all hover:-translate-y-px hover:border-[#adc6ff] hover:bg-[#e6f0ff]"
              onClick={() => setShowCartPanel(!showCartPanel)}
            >
              <div className="relative flex items-center">
                <ShoppingCart size={20} className="text-[#f24e1e]" />
                {cartCount > 0 && (
                  <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f24e1e] px-1 text-[10px] font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>

              <span className="text-sm font-bold text-[#1c3973]">Giỏ Hàng</span>
            </button>

            {/* CART PANEL */}
            {showCartPanel && (
              <div className="home-header-popover absolute right-0 top-[calc(100%+6px)] z-[1100] w-[380px] overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 className="m-0 text-sm font-bold text-slate-800">Giỏ Hàng</h4>

                  <span className="text-xs text-slate-500">{cartItems.length} sản phẩm</span>
                </div>

                <div>
                  {cartItems.length > 0 ? (
                    cartItems.map((item) => (
                      <div key={item.id} className="flex gap-3 border-b border-slate-100 px-4 py-3">
                        {item.img && (
                          <img
                            src={item.img}
                            alt={item.name}
                            className="h-[52px] w-[52px] shrink-0 rounded-md border border-slate-200 object-cover"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <h5 className="mb-1 line-clamp-2 text-[13px] font-semibold text-slate-800">
                            {item.name}
                          </h5>

                          <span className="text-[13px] font-bold text-[#f24e1e]">{item.price}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-[13px] text-slate-400">
                      Chưa có sản phẩm trong giỏ hàng
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
