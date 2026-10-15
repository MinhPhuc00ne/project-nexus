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
  Wallet,
  Award,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { clearAuthSession, getStoredUser, type AuthUser } from '../../services/auth';
import {
  getMe,
  toggleSellerMode,
  createSellerRequest,
  getMySellerRequests,
  type UserProfile,
  type SellerUpgradeRequest,
} from '../../services/users';
import Popup from '../popup/Popup';
import { getCartItems, type CartItem as StoredCartItem } from '../../services/cart';
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
  const [storedUser, setStoredUser] = useState<AuthUser | null>(() => getStoredUser());
  const [storedCart, setStoredCart] = useState<StoredCartItem[]>(() => getCartItems());

  useEffect(() => {
    const syncAuth = () => setStoredUser(getStoredUser());
    const syncCart = () => setStoredCart(getCartItems());
    window.addEventListener('nexus:auth-change', syncAuth);
    window.addEventListener('nexus:cart-change', syncCart);
    window.addEventListener('storage', syncAuth);
    window.addEventListener('storage', syncCart);
    return () => {
      window.removeEventListener('nexus:auth-change', syncAuth);
      window.removeEventListener('nexus:cart-change', syncCart);
      window.removeEventListener('storage', syncAuth);
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

  const effectiveLoggedIn = isLoggedIn ?? Boolean(storedUser);
  const displayUserName = userName || storedUser?.fullName || storedUser?.email || 'Tài khoản';
  const displayUserEmail = userEmail ?? storedUser?.email;
  const displayUserAvatar = userAvatar !== undefined ? userAvatar : storedUser?.avatarUrl;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isTogglingSeller, setIsTogglingSeller] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upgrade Seller Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeRequests, setUpgradeRequests] = useState<SellerUpgradeRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState('');

  // Form State
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [identityCardNumber, setIdentityCardNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchProfile = async () => {
    try {
      const data = await getMe();
      setProfile(data);
    } catch {
      // Ignored if not authenticated
    }
  };

  useEffect(() => {
    if (effectiveLoggedIn) {
      void fetchProfile();
    } else {
      setProfile(null);
    }
  }, [effectiveLoggedIn]);

  const handleToggleSeller = async () => {
    if (!effectiveLoggedIn) {
      if (onLoginClick) onLoginClick();
      else window.location.assign('/login');
      return;
    }
    if (profile?.role !== 'SELLER' && profile?.role !== 'ADMIN') {
      void handleOpenUpgradeModal();
      return;
    }
    setIsTogglingSeller(true);
    try {
      const nextActive = !profile.isSellerActive;
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
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Chuyển đổi chế độ thất bại.');
    } finally {
      setIsTogglingSeller(false);
    }
  };

  const handleOpenUpgradeModal = async () => {
    if (!effectiveLoggedIn) {
      if (onLoginClick) onLoginClick();
      else window.location.assign('/login');
      return;
    }
    if (profile?.role === 'SELLER') {
      showToast('Tài khoản của bạn đã là Người bán (Seller) rồi!');
      return;
    }
    setShowUpgradeModal(true);
    setIsLoadingRequests(true);
    setUpgradeError('');
    setUpgradeSuccess('');
    try {
      const res = await getMySellerRequests();
      setUpgradeRequests(res.requests || []);
      if (!phone && profile?.phoneNumber) setPhone(profile.phoneNumber);
      if (!businessEmail && profile?.email) setBusinessEmail(profile.email);
    } catch (err: unknown) {
      setUpgradeError(err instanceof Error ? err.message : 'Không thể tải lịch sử yêu cầu.');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleSubmitUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !phone.trim()) {
      setUpgradeError('Vui lòng nhập Tên gian hàng và Số điện thoại liên hệ.');
      return;
    }
    if (!proofFile) {
      setUpgradeError('Vui lòng tải lên tài liệu chứng minh (CCCD hoặc Giấy phép kinh doanh).');
      return;
    }
    setIsSubmittingUpgrade(true);
    setUpgradeError('');
    setUpgradeSuccess('');
    try {
      const formData = new FormData();
      formData.append('storeName', storeName.trim());
      formData.append('phone', phone.trim());
      if (storeDescription.trim()) formData.append('storeDescription', storeDescription.trim());
      if (businessEmail.trim()) formData.append('businessEmail', businessEmail.trim());
      if (identityCardNumber.trim())
        formData.append('identityCardNumber', identityCardNumber.trim());
      formData.append('file', proofFile);

      const res = await createSellerRequest(formData);
      setUpgradeSuccess(res.message || 'Gửi yêu cầu nâng cấp thành công!');
      const updated = await getMySellerRequests();
      setUpgradeRequests(updated.requests || []);
      setStoreName('');
      setStoreDescription('');
      setIdentityCardNumber('');
      setProofFile(null);
    } catch (err: unknown) {
      setUpgradeError(err instanceof Error ? err.message : 'Gửi yêu cầu thất bại.');
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

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

                {showUserMenu && (
                  <div className="home-header-popover absolute right-0 top-[calc(100%+6px)] z-[1100] w-[240px] overflow-hidden rounded-[10px] border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="mb-1.5 flex items-center gap-3 rounded-md bg-slate-50 p-2.5">
                      {displayUserAvatar ? (
                        <img
                          src={displayUserAvatar}
                          alt={displayUserName}
                          referrerPolicy="no-referrer"
                          className="h-[38px] w-[38px] shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#1c3973] text-white">
                          <User size={20} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-bold text-slate-800">
                          {displayUserName}
                        </p>
                        {displayUserEmail && (
                          <p className="m-0 truncate text-xs text-slate-500">{displayUserEmail}</p>
                        )}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {profile?.role === 'ADMIN'
                              ? 'Quản trị viên'
                              : profile?.role === 'SELLER'
                                ? 'Người bán (Seller)'
                                : profile?.role === 'SUPPORT_STAFF'
                                  ? 'Nhân viên (Staff)'
                                  : 'Khách hàng (Buyer)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {profile && (
                      <div className="mb-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Wallet size={12} className="text-amber-600" /> Số dư ví:
                          </span>
                          <strong className="text-emerald-700 font-semibold">
                            {profile.wallet
                              ? `${Number(profile.wallet.balance).toLocaleString('vi-VN')} ₫`
                              : '0 ₫'}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Award size={12} className="text-amber-600" /> Điểm uy tín:
                          </span>
                          <span className="font-semibold text-slate-800">
                            {profile.reputationScore} ({profile.trustLevel})
                          </span>
                        </div>
                      </div>
                    )}

                    {profile?.role === 'ADMIN' && (
                      <a
                        href="/admin"
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-blue-700 bg-blue-50 font-medium hover:bg-blue-100 mb-1"
                      >
                        <ShieldCheck size={15} />
                        <span>Bảng Điều Hành Admin</span>
                      </a>
                    )}

                    {(profile?.role === 'ADMIN' || profile?.role === 'SUPPORT_STAFF') && (
                      <a
                        href="/staff"
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-indigo-700 bg-indigo-50 font-medium hover:bg-indigo-100 mb-1"
                      >
                        <Store size={15} />
                        <span>Trang Quản Trị & Duyệt Hồ Sơ</span>
                      </a>
                    )}

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
                        clearAuthSession();

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
                {effectiveCartCount > 0 && (
                  <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f24e1e] px-1 text-[10px] font-bold text-white">
                    {effectiveCartCount > 99 ? '99+' : effectiveCartCount}
                  </span>
                )}
              </div>

              <span className="text-sm font-bold text-[#1c3973]">Giỏ Hàng</span>
            </button>

            {/* CART PANEL */}
            {showCartPanel && (
              <div className="home-header-popover absolute right-0 top-[calc(100%+6px)] z-[1100] w-[380px] overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h4 className="m-0 text-sm font-bold text-slate-800">Giỏ Hàng Của Bạn</h4>

                  <span className="text-xs text-slate-500">{effectiveCartItems.length} món</span>
                </div>

                <div className="max-h-72 overflow-y-auto">
                  {effectiveCartItems.length > 0 ? (
                    effectiveCartItems.map((item) => (
                      <a
                        key={item.id}
                        href={`/product/${item.id}`}
                        className="flex gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50 transition"
                      >
                        {item.img && (
                          <img
                            src={item.img}
                            alt={item.name}
                            className="h-[52px] w-[52px] shrink-0 rounded-md border border-slate-200 object-cover p-0.5 bg-white"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <h5 className="mb-1 line-clamp-2 text-[13px] font-semibold text-slate-800 hover:text-[#f24e1e]">
                            {item.name}
                          </h5>

                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-[#f24e1e]">
                              {item.price}
                            </span>
                            {item.qty && (
                              <span className="text-xs text-slate-400 font-medium">
                                x{item.qty}
                              </span>
                            )}
                          </div>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="p-6 text-center text-[13px] text-slate-400">
                      Chưa có sản phẩm trong giỏ hàng
                    </div>
                  )}
                </div>

                {effectiveCartItems.length > 0 && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50">
                    <a
                      href="/cart"
                      className="block w-full py-2.5 px-4 rounded-xl bg-[#f24e1e] hover:bg-[#d63b0e] text-white text-center font-bold text-xs shadow-md transition"
                      onClick={() => setShowCartPanel(false)}
                    >
                      Xem Giỏ Hàng & Thanh Toán
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOAST THÔNG BÁO TÁC VỤ */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl transition-all">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL ĐĂNG KÝ TRỞ THÀNH SELLER */}
      <Popup
        isOpen={showUpgradeModal}
        onClose={() => {
          if (!isSubmittingUpgrade) setShowUpgradeModal(false);
        }}
        title={
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <span>
              {profile?.role === 'SELLER'
                ? 'Thông Tin Gian Hàng Người Bán'
                : 'Đăng Ký Nâng Cấp Thành Người Bán (Seller)'}
            </span>
          </div>
        }
        size="lg"
      >
        {isLoadingRequests ? (
          <div className="py-12 text-center text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-spin" />
            Đang tải dữ liệu hồ sơ từ máy chủ...
          </div>
        ) : upgradeRequests.some((r) => r.status === 'PENDING') ? (
          (() => {
            const pendingReq = upgradeRequests.find((r) => r.status === 'PENDING')!;
            return (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
                  <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <h4 className="font-bold text-amber-900 mb-1">
                      Hồ sơ của bạn đang được Ban Quản Trị xét duyệt!
                    </h4>
                    <p className="text-amber-800">
                      Bạn đã gửi yêu cầu nâng cấp tài khoản lên Seller. Quản trị viên đang tiến hành
                      kiểm tra thông tin và tài liệu chứng minh.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Tên gian hàng:</span>
                    <strong className="text-slate-800">{pendingReq.storeName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Số điện thoại liên hệ:</span>
                    <span className="text-slate-800 font-medium">{pendingReq.phone}</span>
                  </div>
                  {pendingReq.businessEmail && (
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Email kinh doanh:</span>
                      <span className="text-slate-800 font-medium">{pendingReq.businessEmail}</span>
                    </div>
                  )}
                  {pendingReq.identityCardNumber && (
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Số CCCD/CMND:</span>
                      <span className="text-slate-800 font-medium">
                        {pendingReq.identityCardNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Thời gian nộp:</span>
                    <span className="text-slate-800">
                      {new Date(pendingReq.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Trạng thái:</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      ĐANG CHỜ DUYỆT (PENDING)
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    className="px-5 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition"
                    onClick={() => setShowUpgradeModal(false)}
                  >
                    Đã hiểu
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="space-y-4">
            {upgradeRequests.length > 0 && upgradeRequests[0].status === 'REJECTED' && (
              <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Yêu cầu trước đó bị từ chối:</strong>{' '}
                  {upgradeRequests[0].rejectionReason || 'Hồ sơ chưa đạt tiêu chuẩn sàn.'}
                  <p className="text-xs text-red-600 mt-1">
                    Vui lòng bổ sung giấy tờ và thông tin chính xác để gửi lại yêu cầu.
                  </p>
                </div>
              </div>
            )}

            {upgradeSuccess && (
              <div className="p-3 text-sm text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{upgradeSuccess}</span>
              </div>
            )}

            {upgradeError && (
              <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">
                {upgradeError}
              </div>
            )}

            <form onSubmit={handleSubmitUpgrade} className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên Gian Hàng / Thương Hiệu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cổ Vật Hoàng Gia Store"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    disabled={isSubmittingUpgrade}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số Điện Thoại Liên Hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0987654321"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isSubmittingUpgrade}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Kinh Doanh
                  </label>
                  <input
                    type="email"
                    placeholder="VD: shop@domain.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    disabled={isSubmittingUpgrade}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số CCCD / CMND / Mã Doanh Nghiệp
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 001202008888"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={identityCardNumber}
                    onChange={(e) => setIdentityCardNumber(e.target.value)}
                    disabled={isSubmittingUpgrade}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô Tả Gian Hàng & Sản Phẩm Kinh Doanh
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả ngắn gọn về nguồn gốc sản phẩm, lĩnh vực hoạt động..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={storeDescription}
                  onChange={(e) => setStoreDescription(e.target.value)}
                  disabled={isSubmittingUpgrade}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tài Liệu Đính Kèm Chứng Minh (Ảnh CCCD / GPKD){' '}
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 rounded-lg cursor-pointer transition text-sm text-slate-600">
                    <Upload className="w-4 h-4 text-orange-500" />
                    <span>
                      {proofFile ? proofFile.name : 'Chọn tệp đính kèm (Ảnh/PDF tối đa 15MB)'}
                    </span>
                    <input
                      type="file"
                      required
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      disabled={isSubmittingUpgrade}
                    />
                  </label>
                  {proofFile && (
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:underline"
                      onClick={() => setProofFile(null)}
                      disabled={isSubmittingUpgrade}
                    >
                      Xóa tệp
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hệ thống yêu cầu tài liệu để đảm bảo tính pháp lý và bảo vệ quyền lợi người mua
                  trên sàn.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  onClick={() => setShowUpgradeModal(false)}
                  disabled={isSubmittingUpgrade}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUpgrade}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#f24e1e] hover:bg-[#d94217] rounded-lg transition disabled:opacity-50"
                >
                  {isSubmittingUpgrade ? 'Đang gửi hồ sơ...' : 'Nộp Hồ Sơ Xét Duyệt'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Popup>
    </header>
  );
};

export default HomeHeader;
