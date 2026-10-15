import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  LayoutGrid,
  List,
  RotateCcw,
  Heart,
  Shield,
  ShieldCheck,
  Truck,
  Box,
  Star,
  Gavel,
  Bell,
  Zap,
  Globe,
  HelpCircle,
  Smartphone,
  Store,
  MessageCircle,
  Share2,
  QrCode,
  Sparkles,
  CreditCard,
  Flame,
  Clock,
  ArrowLeft,
  X,
} from 'lucide-react';
import { getStoredUser } from '../../services/auth';
import './SearchPage.css';

// TypeScript interfaces
interface ProductItem {
  id: string;
  brand: string;
  title: string;
  image: string;
  type:
    'live_auction' | 'mall' | 'upcoming_auction' | 'flash_sale' | 'free_deposit' | 'verified_mall';
  primaryBadge: {
    text: string;
    type: 'live' | 'mall' | 'upcoming' | 'flash' | 'free_deposit' | 'verified';
    icon?: string;
  };
  subBadge?: {
    text: string;
    isYellow?: boolean;
    icon?: string;
  };
  imageOverlay?: {
    leftText: string;
    leftIcon?: 'rotate' | 'hourglass';
    rightText: string;
    isDiscount?: boolean;
    discountText?: string;
  };
  rating?: number;
  soldCount?: number;
  oldPrice?: string;
  currentPrice: string;
  priceColor: 'orange' | 'red' | 'black';
  priceLabel?: string;
  timer?: string;
  subMetaLeft: string;
  subMetaRight?: string;
  subMetaRightType?: 'link' | 'waiting' | 'green_ship' | 'blue_pay' | 'blue_cert';
  actionButton?: {
    text: string;
    type: 'bid' | 'schedule' | 'free_bid';
    icon?: 'gavel' | 'bell' | 'zap';
  };
}

// Brand Logo Component
const NexusLogo = () => (
  <div className="search-brand-icon-box">
    <svg viewBox="0 0 32 32" width="24" height="24" fill="none">
      <circle cx="16" cy="16" r="4.5" fill="#ffffff" />
      <circle cx="7" cy="10" r="2.5" fill="#ffffff" />
      <circle cx="25" cy="10" r="2.5" fill="#ffffff" />
      <circle cx="7" cy="22" r="2.5" fill="#ffffff" />
      <circle cx="25" cy="22" r="2.5" fill="#ffffff" />
      <circle cx="16" cy="6" r="2.5" fill="#ffffff" />
      <line
        x1="16"
        y1="16"
        x2="7"
        y2="10"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="16"
        x2="25"
        y2="10"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="16"
        x2="7"
        y2="22"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="16"
        x2="25"
        y2="22"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="16"
        x2="16"
        y2="6"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

// Footer 3D OS Logo
const Nexus3dLogo = () => (
  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M4 16v2a2 2 0 0 0 2 2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  </div>
);

export const SearchPage: React.FC = () => {
  const [currentUser] = useState(() => getStoredUser());
  // Search Bar State
  const [searchQuery, setSearchQuery] = useState(
    () => new URLSearchParams(window.location.search).get('q') ?? 'đồng hồ cơ skeleton 3d',
  );
  const [category, setCategory] = useState(
    () => new URLSearchParams(window.location.search).get('floor') ?? 'Tất Cả Sàn',
  );
  const [categoryOpen, setCategoryOpen] = useState(false);

  // Sorting and View Mode State
  const [activeSort, setActiveSort] = useState<'popular' | 'latest' | 'sales' | 'price'>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter Accordion Collapse State
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Filter Checkbox States
  const [transactionTypes, setTransactionTypes] = useState({
    live3d: true,
    mall: true,
    upcoming: false,
    escrow: false,
  });

  const [conditionFilters, setConditionFilters] = useState({
    brandNew: true,
    likeNew: false,
    gradeA: false,
  });

  const [brandFilters, setBrandFilters] = useState({
    ap: true,
    patek: true,
    rolex: true,
    hublot: false,
    rm: false,
    tissot: false,
    seiko: false,
  });

  const [shippingFilters, setShippingFilters] = useState({
    ghn: true,
    pci: true,
    express2h: false,
  });

  // Price range state
  const [priceFrom, setPriceFrom] = useState('5.000.000');
  const [priceTo, setPriceTo] = useState('150.000.000');

  // Applied filter chips
  const [appliedChips, setAppliedChips] = useState<string[]>([
    'Đấu giá 3D + Mall',
    '5.000.000đ – 150.000.000đ',
    'Brand New & Like New S',
  ]);

  // Liked items state
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});

  // Active page state
  const [activePage, setActivePage] = useState(1);

  // Live timer tick for auctions
  const [timerAp, setTimerAp] = useState(258); // 04:18 in seconds
  const [timerRm, setTimerRm] = useState(765); // 12:45 in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerAp((prev) => Math.max(0, prev - 1));
      setTimerRm((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}m`;
  };

  // 3D Modal Preview state
  const [activePreviewWatch, setActivePreviewWatch] = useState<ProductItem | null>(null);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const removeChip = (chip: string) => {
    setAppliedChips((prev) => prev.filter((c) => c !== chip));
  };

  const clearAllFilters = () => {
    setTransactionTypes({ live3d: false, mall: false, upcoming: false, escrow: false });
    setConditionFilters({ brandNew: false, likeNew: false, gradeA: false });
    setBrandFilters({
      ap: false,
      patek: false,
      rolex: false,
      hublot: false,
      rm: false,
      tissot: false,
      seiko: false,
    });
    setShippingFilters({ ghn: false, pci: false, express2h: false });
    setPriceFrom('');
    setPriceTo('');
    setAppliedChips([]);
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Trending search list
  const trendingSearches = [
    'đồng hồ cơ',
    'hublot skeleton',
    'rolex submariner',
    'patek philippe',
    'tourbillon 3d',
  ];

  // Related searches
  const relatedTags = [
    '# Đồng hồ cơ Thụy Sỹ',
    '# Patek Philippe Nautilus',
    '# Tourbillon 3D Model',
    '# Đồng hồ lộ cơ nam',
    '# Đấu giá đồng hồ',
  ];

  // 8 Products Data matching user's screenshots
  const products: ProductItem[] = [
    {
      id: 'ap-tourbillon',
      brand: 'AUDEMARS PIGUET • SWISS MADE',
      title: 'Audemars Piguet Royal Oak Chrono Tourbillon 3D',
      image: '/images/watches/watch-1.png',
      type: 'live_auction',
      primaryBadge: { text: 'LIVE 3D AUCTION', type: 'live' },
      subBadge: { text: '3D Model Verified', icon: '3d' },
      imageOverlay: {
        leftText: 'Chạm xoay 360°',
        leftIcon: 'rotate',
        rightText: '42 bids',
      },
      currentPrice: '128.500.000 ₫',
      priceColor: 'orange',
      priceLabel: 'Giá hiện tại:',
      timer: formatSeconds(timerAp),
      subMetaLeft: 'Cọc 10%: 12.850.000đ',
      subMetaRight: 'PayOS Escrow',
      subMetaRightType: 'link',
      actionButton: { text: 'Tham Gia Đấu Giá', type: 'bid', icon: 'gavel' },
    },
    {
      id: 'patek-celestial',
      brand: 'PATEK PHILIPPE • GENEVA',
      title: 'Patek Philippe Grand Complications Celestial...',
      image: '/images/watches/watch-2.png',
      type: 'mall',
      primaryBadge: { text: 'NEXUS MALL', type: 'mall' },
      subBadge: { text: 'Chính Hãng 100%' },
      imageOverlay: {
        leftText: '',
        rightText: '',
        isDiscount: true,
        discountText: 'GIẢM 10%',
      },
      rating: 5.0,
      soldCount: 24,
      oldPrice: '95.000.000đ',
      currentPrice: '85.000.000 ₫',
      priceColor: 'red',
      subMetaLeft: 'Freeship GHN Express',
      subMetaRightType: 'green_ship',
    },
    {
      id: 'hublot-unico',
      brand: 'HUBLOT • NYON SKELETON',
      title: 'Hublot Big Bang Unico Sapphire Skeleton Edition',
      image: '/images/watches/watch-3.png',
      type: 'upcoming_auction',
      primaryBadge: { text: 'SẮP MỞ 20:00', type: 'upcoming' },
      subBadge: { text: 'Mô phỏng 3D Sẵn sàng', icon: '3d' },
      currentPrice: '45.000.000 ₫',
      priceColor: 'black',
      priceLabel: 'Giá khởi điểm:',
      subMetaLeft: 'Bước giá: 1.000.000đ',
      subMetaRight: '142 người chờ',
      subMetaRightType: 'waiting',
      actionButton: { text: 'Đặt Lịch Báo Phiên', type: 'schedule', icon: 'bell' },
    },
    {
      id: 'rolex-submariner',
      brand: 'ROLEX • OYSTER PERPETUAL',
      title: 'Rolex Submariner Date Oystersteel 41mm...',
      image: '/images/watches/watch-4.png',
      type: 'mall',
      primaryBadge: { text: 'MALL', type: 'mall' },
      subBadge: { text: 'Bảo dưỡng 5 năm', isYellow: true },
      rating: 5.0,
      soldCount: 12,
      currentPrice: '320.000.000 ₫',
      priceColor: 'red',
      subMetaLeft: 'Trả góp 0% qua PayOS Gateway',
      subMetaRightType: 'blue_pay',
    },
    {
      id: 'rm-055',
      brand: 'RICHARD MILLE • RACING HOROLOGY',
      title: 'Richard Mille RM 055 Bubba Watson Skeleton 3D',
      image: '/images/watches/watch-5.png',
      type: 'live_auction',
      primaryBadge: { text: 'LIVE AUCTION', type: 'live' },
      subBadge: { text: 'Interactive Mesh', icon: '3d' },
      imageOverlay: {
        leftText: '3D AR Xem Thử',
        leftIcon: 'rotate',
        rightText: '68 lượt trả giá',
      },
      currentPrice: '210.000.000 ₫',
      priceColor: 'orange',
      priceLabel: 'Giá hiện tại:',
      timer: formatSeconds(timerRm),
      subMetaLeft: 'Bước giá: 5.000.000đ',
      subMetaRight: 'Stripe / PayOS',
      subMetaRightType: 'link',
      actionButton: { text: 'Tham Gia Đấu Giá', type: 'bid', icon: 'gavel' },
    },
    {
      id: 'omega-speedmaster',
      brand: 'OMEGA • MOONWATCH',
      title: 'Omega Speedmaster Moonwatch Professional...',
      image: '/images/watches/watch-6.png',
      type: 'flash_sale',
      primaryBadge: { text: 'FLASH SALE', type: 'flash' },
      subBadge: { text: 'Chính Hãng GHN Express' },
      imageOverlay: {
        leftText: '',
        rightText: '',
        isDiscount: true,
        discountText: '-17% GIÁ SỐC',
      },
      rating: 4.9,
      soldCount: 48,
      oldPrice: '175.000.000đ',
      currentPrice: '145.000.000 ₫',
      priceColor: 'red',
      subMetaLeft: 'Giao nhanh bảo hiểm 100%',
      subMetaRightType: 'blue_pay',
    },
    {
      id: 'tissot-tourelles',
      brand: 'TISSOT • SWISS MADE 1853',
      title: 'Tissot Chemin des Tourelles Skeleton...',
      image: '/images/watches/watch-7.png',
      type: 'free_deposit',
      primaryBadge: { text: 'CỌC 0Đ (TÂN THỦ)', type: 'free_deposit' },
      subBadge: { text: '3D Preview', icon: '3d' },
      imageOverlay: {
        leftText: 'Còn 01:22h',
        leftIcon: 'hourglass',
        rightText: '18 bids',
      },
      currentPrice: '12.800.000 ₫',
      priceColor: 'orange',
      priceLabel: 'Giá đang dẫn đầu:',
      subMetaLeft: 'Ưu đãi tân thủ NEXUS',
      subMetaRight: 'Bước giá 200k',
      subMetaRightType: 'waiting',
      actionButton: { text: 'Đấu Giá Miễn Cọc', type: 'free_bid', icon: 'zap' },
    },
    {
      id: 'cartier-santos',
      brand: 'CARTIER • PARIS HOROLOGY',
      title: 'Cartier Santos de Cartier Skeleton Automatic XL',
      image: '/images/watches/watch-8.png',
      type: 'verified_mall',
      primaryBadge: { text: 'CHỨNG THỰC 100%', type: 'verified' },
      subBadge: { text: 'Bộ Công Thương Kiểm Định' },
      rating: 5.0,
      soldCount: 9,
      currentPrice: '198.000.000 ₫',
      priceColor: 'red',
      subMetaLeft: 'Kèm chứng thư NFT Blockchain',
      subMetaRightType: 'blue_cert',
    },
  ];

  return (
    <div className="search-page">
      {/* 1. TOP UTILITY BAR */}
      <section className="search-topbar">
        <div className="search-topbar-container">
          <div className="search-topbar-left">
            <span className="search-topbar-link">
              <Store className="w-3.5 h-3.5" /> Kênh Người Bán
            </span>
            <span className="search-topbar-divider"></span>
            <span className="search-topbar-link">Trở thành Seller</span>
            <span className="search-topbar-divider"></span>
            <span className="search-topbar-link">
              <Smartphone className="w-3.5 h-3.5" /> Tải Ứng Dụng
            </span>
            <span className="search-topbar-divider"></span>
            <div className="search-social-icons">
              <span>Kết nối:</span>
              <Globe className="search-social-icon" />
              <MessageCircle className="search-social-icon" />
            </div>
          </div>

          <div className="search-topbar-right">
            <span className="search-topbar-link">
              <Bell className="w-3.5 h-3.5" />
              Thông Báo <span className="notification-dot"></span>
            </span>
            <span className="search-topbar-divider"></span>
            <span className="search-topbar-link">
              <HelpCircle className="w-3.5 h-3.5" /> Trợ Giúp
            </span>
            <span className="search-topbar-divider"></span>
            <span className="search-topbar-link">
              <Globe className="w-3.5 h-3.5" /> Tiếng Việt{' '}
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </span>
            <span className="search-topbar-divider"></span>
            {currentUser ? (
              <span className="search-topbar-link account-name">
                {currentUser.fullName || currentUser.email}
              </span>
            ) : (
              <a href="/login" className="search-topbar-link account-name">
                Đăng Nhập
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 2. MAIN HEADER */}
      <header className="search-main-header">
        <div className="search-header-container">
          {/* Logo */}
          <a href="/" className="search-brand">
            <NexusLogo />
            <div className="search-brand-text-col">
              <div className="search-brand-title-row">
                <span className="search-brand-title">NEXUS</span>
                <span className="search-brand-badge">MALL & BID</span>
              </div>
              <span className="search-brand-tagline">
                Sàn Thương Mại Điện Tử & Đấu Giá Trực Tuyến
              </span>
            </div>
          </a>

          {/* Search Box */}
          <div className="search-box-wrapper">
            <div className="search-input-group">
              <div className="relative">
                <button
                  type="button"
                  className="search-category-dropdown"
                  onClick={() => setCategoryOpen(!categoryOpen)}
                >
                  {category} <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {categoryOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                    {['Tất Cả Sàn', 'Đấu Giá 3D', 'NEXUS Mall', 'Hàng Ký Gửi'].map((cat) => (
                      <div
                        key={cat}
                        className="px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                        onClick={() => {
                          setCategory(cat);
                          setCategoryOpen(false);
                        }}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                className="search-input-field"
                placeholder="Tìm kiếm đồng hồ, thương hiệu, phiên đấu giá..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
              />

              <button type="button" className="search-submit-btn" aria-label="Tìm kiếm">
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Trending searches */}
            <div className="search-trending-row">
              <span className="trending-label">Xu hướng:</span>
              {trendingSearches.map((item) => (
                <span key={item} className="trending-keyword" onClick={() => setSearchQuery(item)}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Cart Button */}
          <a href="/cart" className="search-cart-btn">
            <ShoppingCart className="w-5 h-5 cart-icon-red" />
            <span className="cart-text">Giỏ Hàng</span>
          </a>
        </div>
      </header>

      {/* 3. SEARCH RESULTS BANNER */}
      <section className="results-banner-section">
        <div className="results-banner-container">
          <div className="results-heading-col">
            <div className="mb-2">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-sm transition"
              >
                <ArrowLeft size={13} />
                Quay lại Trang Chủ
              </a>
            </div>
            <h1 className="results-title">
              Kết quả tìm kiếm cho:{' '}
              <span className="results-query-highlight">
                "{searchQuery || 'đồng hồ cơ skeleton'}"
              </span>
            </h1>
            <div className="results-stats-row">
              <span>
                Tìm thấy <strong className="stat-bold">128</strong> sản phẩm thương mại
              </span>
              <span>•</span>
              <span className="stat-dot-orange"></span>
              <span className="stat-auction-text">14 phiên đấu giá trực tiếp 3D</span>
            </div>
          </div>

          <div className="verification-pill-badge">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>KIỂM ĐỊNH MICRO-MESH & VẬT LÝ SỐ 100%</span>
          </div>
        </div>
      </section>

      {/* 4. SORTING & VIEW BAR */}
      <section className="sort-view-bar">
        <div className="sort-view-container">
          <div className="sort-controls-left">
            <div className="sort-label-wrap">
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              <span>Sắp xếp theo:</span>
            </div>

            <button
              type="button"
              className={`sort-btn ${activeSort === 'popular' ? 'active' : ''}`}
              onClick={() => setActiveSort('popular')}
            >
              Phổ biến nhất
            </button>
            <button
              type="button"
              className={`sort-btn ${activeSort === 'latest' ? 'active' : ''}`}
              onClick={() => setActiveSort('latest')}
            >
              Mới nhất
            </button>
            <button
              type="button"
              className={`sort-btn ${activeSort === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveSort('sales')}
            >
              Bán chạy
            </button>
            <button
              type="button"
              className={`sort-btn ${activeSort === 'price' ? 'active' : ''}`}
              onClick={() => setActiveSort('price')}
            >
              Giá <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <div className="view-controls-right">
            <span className="view-mode-label">Chế độ xem:</span>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Xem dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="Xem dạng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. MAIN CONTENT (2 COLUMNS: SIDEBAR + RESULTS) */}
      <main className="search-content-section">
        <div className="search-content-container">
          {/* LEFT SIDEBAR FILTERS */}
          <aside className="search-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-header">
                <div className="sidebar-title-group">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <span>Bộ Lọc Tìm Kiếm</span>
                </div>
                <button type="button" className="sidebar-clear-btn" onClick={clearAllFilters}>
                  Xóa tất cả
                </button>
              </div>

              {/* 1. LOẠI HÌNH GIAO DỊCH */}
              <div className="filter-section">
                <div
                  className="filter-section-header"
                  onClick={() => toggleSection('transactionType')}
                >
                  <span className="filter-section-title">LOẠI HÌNH GIAO DỊCH</span>
                  <ChevronUp
                    className={`filter-chevron-icon ${collapsedSections['transactionType'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['transactionType'] && (
                  <div className="filter-section-body">
                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${transactionTypes.live3d ? 'checked' : ''}`}
                          onClick={() =>
                            setTransactionTypes({
                              ...transactionTypes,
                              live3d: !transactionTypes.live3d,
                            })
                          }
                        >
                          {transactionTypes.live3d && (
                            <span className="text-[10px] font-bold">✓</span>
                          )}
                        </div>
                        <span>Đấu Giá Trực Tiếp 3D (360°)</span>
                      </div>
                      <span className="filter-count-badge orange">14</span>
                    </label>

                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${transactionTypes.mall ? 'checked' : ''}`}
                          onClick={() =>
                            setTransactionTypes({
                              ...transactionTypes,
                              mall: !transactionTypes.mall,
                            })
                          }
                        >
                          {transactionTypes.mall && (
                            <span className="text-[10px] font-bold">✓</span>
                          )}
                        </div>
                        <span>Mua Ngay (NEXUS Mall)</span>
                      </div>
                      <span className="filter-count-badge blue">86</span>
                    </label>

                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${transactionTypes.upcoming ? 'checked' : ''}`}
                          onClick={() =>
                            setTransactionTypes({
                              ...transactionTypes,
                              upcoming: !transactionTypes.upcoming,
                            })
                          }
                        >
                          {transactionTypes.upcoming && (
                            <span className="text-[10px] font-bold">✓</span>
                          )}
                        </div>
                        <span>Đấu Giá Sắp Diễn Ra</span>
                      </div>
                      <span className="filter-count-badge">22</span>
                    </label>

                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${transactionTypes.escrow ? 'checked' : ''}`}
                          onClick={() =>
                            setTransactionTypes({
                              ...transactionTypes,
                              escrow: !transactionTypes.escrow,
                            })
                          }
                        >
                          {transactionTypes.escrow && (
                            <span className="text-[10px] font-bold">✓</span>
                          )}
                        </div>
                        <span>Hàng Ký Gửi Escrow</span>
                      </div>
                      <span className="filter-count-badge">20</span>
                    </label>
                  </div>
                )}
              </div>

              {/* 2. KHOẢNG GIÁ (VNĐ) */}
              <div className="filter-section">
                <div className="filter-section-header" onClick={() => toggleSection('priceRange')}>
                  <span className="filter-section-title">KHOẢNG GIÁ (VNĐ)</span>
                  <ChevronUp
                    className={`filter-chevron-icon ${collapsedSections['priceRange'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['priceRange'] && (
                  <div className="filter-section-body">
                    <div className="price-inputs-row">
                      <div className="price-input-box">
                        <span className="price-input-label">TỪ</span>
                        <input
                          type="text"
                          className="price-input"
                          value={priceFrom}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPriceFrom(e.target.value)
                          }
                        />
                      </div>
                      <div className="price-input-box">
                        <span className="price-input-label">ĐẾN</span>
                        <input
                          type="text"
                          className="price-input"
                          value={priceTo}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPriceTo(e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="slider-container">
                      <div className="slider-track-wrap">
                        <div className="slider-track-fill"></div>
                        <div className="slider-thumb left"></div>
                        <div className="slider-thumb right"></div>
                      </div>
                      <div className="slider-labels-row">
                        <span>0 VNĐ</span>
                        <span>500M+ VNĐ</span>
                      </div>
                    </div>

                    <button type="button" className="apply-price-btn">
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Áp Dụng Khoảng Giá
                    </button>
                  </div>
                )}
              </div>

              {/* 3. TÌNH TRẠNG VẬT PHẨM */}
              <div className="filter-section">
                <div
                  className="filter-section-header"
                  onClick={() => toggleSection('itemCondition')}
                >
                  <span className="filter-section-title">TÌNH TRẠNG VẬT PHẨM</span>
                  <ChevronUp
                    className={`filter-chevron-icon ${collapsedSections['itemCondition'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['itemCondition'] && (
                  <div className="filter-section-body">
                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${conditionFilters.brandNew ? 'checked' : ''}`}
                          onClick={() =>
                            setConditionFilters({
                              ...conditionFilters,
                              brandNew: !conditionFilters.brandNew,
                            })
                          }
                        >
                          {conditionFilters.brandNew && (
                            <span className="text-[10px] font-bold">✓</span>
                          )}
                        </div>
                        <span>Mới 100% Nguyên Hộp (Brand New)</span>
                      </div>
                    </label>

                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${conditionFilters.likeNew ? 'checked' : ''}`}
                          onClick={() =>
                            setConditionFilters({
                              ...conditionFilters,
                              likeNew: !conditionFilters.likeNew,
                            })
                          }
                        >
                          {conditionFilters.likeNew && (
                            <span className="text-[10px] font-bold">✓</span>
                          )}
                        </div>
                        <span>Like New 99% (Cấp Độ S)</span>
                      </div>
                    </label>

                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${conditionFilters.gradeA ? 'checked' : ''}`}
                          onClick={() =>
                            setConditionFilters({
                              ...conditionFilters,
                              gradeA: !conditionFilters.gradeA,
                            })
                          }
                        >
                          {conditionFilters.gradeA && (
                            <span className="text-[10px] font-bold">✓</span>
                          )}
                        </div>
                        <span>Cấp Độ A (95% - Đã kiểm định)</span>
                      </div>
                    </label>

                    <div className="cert-info-card">
                      <Shield className="cert-info-icon" />
                      <span className="cert-info-text">
                        Bao gồm Chứng thư Giám định Vật lý & NFT Provenance Token
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. THƯƠNG HIỆU XA XỈ */}
              <div className="filter-section">
                <div
                  className="filter-section-header"
                  onClick={() => toggleSection('luxuryBrands')}
                >
                  <span className="filter-section-title">THƯƠNG HIỆU XA XỈ</span>
                  <ChevronUp
                    className={`filter-chevron-icon ${collapsedSections['luxuryBrands'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['luxuryBrands'] && (
                  <div className="filter-section-body">
                    {[
                      { key: 'ap', name: 'Audemars Piguet', count: 18 },
                      { key: 'patek', name: 'Patek Philippe', count: 24 },
                      { key: 'rolex', name: 'Rolex', count: 36 },
                      { key: 'hublot', name: 'Hublot', count: 15 },
                      { key: 'rm', name: 'Richard Mille', count: 8 },
                      { key: 'tissot', name: 'Tissot', count: 22 },
                      { key: 'seiko', name: 'Seiko', count: 19 },
                    ].map((brand) => {
                      const isChecked = brandFilters[brand.key as keyof typeof brandFilters];
                      return (
                        <label key={brand.key} className="filter-checkbox-item">
                          <div className="filter-checkbox-label">
                            <div
                              className={`custom-checkbox ${isChecked ? 'checked' : ''}`}
                              onClick={() =>
                                setBrandFilters({
                                  ...brandFilters,
                                  [brand.key]: !isChecked,
                                })
                              }
                            >
                              {isChecked && <span className="text-[10px] font-bold">✓</span>}
                            </div>
                            <span>{brand.name}</span>
                          </div>
                          <span className="filter-count-badge">{brand.count}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. VẬN CHUYỂN & DỊCH VỤ */}
              <div className="filter-section">
                <div
                  className="filter-section-header"
                  onClick={() => toggleSection('shippingService')}
                >
                  <span className="filter-section-title">VẬN CHUYỂN & DỊCH VỤ</span>
                  <ChevronUp
                    className={`filter-chevron-icon ${collapsedSections['shippingService'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['shippingService'] && (
                  <div className="filter-section-body">
                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${shippingFilters.ghn ? 'checked' : ''}`}
                          onClick={() =>
                            setShippingFilters({ ...shippingFilters, ghn: !shippingFilters.ghn })
                          }
                        >
                          {shippingFilters.ghn && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                        <span>Đồng kiểm niêm phong GHN Express</span>
                      </div>
                    </label>

                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${shippingFilters.pci ? 'checked' : ''}`}
                          onClick={() =>
                            setShippingFilters({ ...shippingFilters, pci: !shippingFilters.pci })
                          }
                        >
                          {shippingFilters.pci && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                        <span>Bảo hiểm giá trị cao 100% (PCI Safe)</span>
                      </div>
                    </label>

                    <label className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div
                          className={`custom-checkbox ${shippingFilters.express2h ? 'checked' : ''}`}
                          onClick={() =>
                            setShippingFilters({
                              ...shippingFilters,
                              express2h: !shippingFilters.express2h,
                            })
                          }
                        >
                          {shippingFilters.express2h && (
                            <span className="text-[10px] font-bold">✓</span>
                          )}
                        </div>
                        <span>Hỏa tốc 2H nội thành (TP.HCM / HN)</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* 6. ĐÁNH GIÁ COLLECTOR */}
              <div className="filter-section">
                <div
                  className="filter-section-header"
                  onClick={() => toggleSection('collectorRating')}
                >
                  <span className="filter-section-title">ĐÁNH GIÁ COLLECTOR</span>
                  <ChevronUp
                    className={`filter-chevron-icon ${collapsedSections['collectorRating'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['collectorRating'] && (
                  <div className="filter-section-body">
                    <div className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div className="rating-stars-row">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-xs text-gray-700">(5.0 tuyệt đối)</span>
                      </div>
                      <span className="filter-count-badge">64</span>
                    </div>

                    <div className="filter-checkbox-item">
                      <div className="filter-checkbox-label">
                        <div className="rating-stars-row">
                          {[1, 2, 3, 4].map((s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                          <Star className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                        <span className="text-xs text-gray-700">từ 4 sao</span>
                      </div>
                      <span className="filter-count-badge">78</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* RIGHT AREA: TAGS & PRODUCTS */}
          <div className="search-results-area">
            {/* Related Searches */}
            <div className="related-searches-row">
              <div className="related-label-wrap">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Tìm kiếm liên quan:</span>
              </div>
              {relatedTags.map((tag) => (
                <span
                  key={tag}
                  className="related-tag-pill"
                  onClick={() => setSearchQuery(tag.replace('# ', ''))}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Applied Filters Row */}
            <div className="applied-filters-row">
              <div className="applied-tags-left">
                <span className="applied-label">ĐANG ÁP DỤNG:</span>
                {appliedChips.map((chip) => (
                  <span key={chip} className="applied-pill" onClick={() => removeChip(chip)}>
                    {chip} <span className="applied-pill-close">✕</span>
                  </span>
                ))}
              </div>
              <span className="results-count-right">HIỂN THỊ 8 TRÊN 142 VẬT PHẨM</span>
            </div>

            {/* PRODUCT GRID */}
            <div className={`products-grid-container ${viewMode === 'list' ? 'list-mode' : ''}`}>
              {products.map((item) => (
                <div key={item.id} className="product-card">
                  {/* Media / Image Box */}
                  <div className="product-card-media">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="product-image-img"
                      loading="lazy"
                    />

                    {/* Top Left Badges */}
                    <div className="media-badges-top-left">
                      {item.primaryBadge.type === 'live' && (
                        <span className="badge-live-auction">
                          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'mall' && (
                        <span className="badge-nexus-mall">
                          <ShieldCheck className="w-3 h-3" />
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'upcoming' && (
                        <span className="badge-upcoming">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'flash' && (
                        <span className="badge-flash-sale">
                          <Flame className="w-3 h-3" />
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'free_deposit' && (
                        <span className="badge-no-deposit">
                          <Zap className="w-3 h-3" />
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'verified' && (
                        <span className="badge-verified-cert">
                          <ShieldCheck className="w-3 h-3" />
                          {item.primaryBadge.text}
                        </span>
                      )}

                      {/* Sub glass badge */}
                      {item.subBadge && (
                        <span
                          className={`badge-glass-sub ${item.subBadge.isYellow ? 'yellow-tag' : ''}`}
                        >
                          {item.subBadge.icon === '3d' && (
                            <Box className="w-2.5 h-2.5 text-blue-600" />
                          )}
                          {item.subBadge.text}
                        </span>
                      )}
                    </div>

                    {/* Favorite Heart Button */}
                    <button
                      type="button"
                      className={`media-favorite-btn ${likedItems[item.id] ? 'favorited' : ''}`}
                      onClick={(e: React.MouseEvent) => toggleLike(item.id, e)}
                      aria-label="Thêm vào yêu thích"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${likedItems[item.id] ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </button>

                    {/* Bottom Image Overlay Bar */}
                    {item.imageOverlay && item.imageOverlay.leftText && (
                      <div
                        className="media-overlay-bottom cursor-pointer hover:bg-white transition-colors"
                        onClick={() => setActivePreviewWatch(item)}
                        title="Bấm để xoay 3D trực tiếp"
                      >
                        <div className="overlay-left-item">
                          {item.imageOverlay.leftIcon === 'rotate' && (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          {item.imageOverlay.leftIcon === 'hourglass' && (
                            <Clock className="w-3 h-3 text-blue-600" />
                          )}
                          <span>{item.imageOverlay.leftText}</span>
                        </div>
                        <div className="overlay-right-item">
                          <span>{item.imageOverlay.rightText}</span>
                        </div>
                      </div>
                    )}

                    {/* Discount badge */}
                    {item.imageOverlay?.isDiscount && (
                      <span className="overlay-discount-tag">{item.imageOverlay.discountText}</span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="product-card-body">
                    <span className="card-brand-category">{item.brand}</span>
                    <h3 className="card-product-title" title={item.title}>
                      <a href={`/product/${item.id}`} className="hover:text-[#f24e1e] transition">
                        {item.title}
                      </a>
                    </h3>

                    {/* Rating / Sold Row */}
                    {item.rating && (
                      <div className="card-rating-sold-row">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="star-val">{item.rating.toFixed(1)}</span>
                        <span>•</span>
                        <span>Đã bán {item.soldCount}</span>
                      </div>
                    )}

                    {/* Price Section */}
                    <div className="card-price-container">
                      {(item.priceLabel || item.timer) && (
                        <div className="price-top-meta-row">
                          {item.priceLabel && (
                            <span className="price-label-text">{item.priceLabel}</span>
                          )}
                          {item.timer && (
                            <span className="price-timer-pill">
                              <Clock className="w-3 h-3" /> {item.timer}
                            </span>
                          )}
                        </div>
                      )}

                      {item.oldPrice && <div className="card-old-price">{item.oldPrice}</div>}

                      <div className={`card-main-price ${item.priceColor}`}>
                        {item.currentPrice}
                      </div>

                      {/* Sub metadata */}
                      <div className="card-sub-meta-row">
                        <span>{item.subMetaLeft}</span>
                        {item.subMetaRight && (
                          <span
                            className={
                              item.subMetaRightType === 'link'
                                ? 'meta-link-blue'
                                : item.subMetaRightType === 'waiting'
                                  ? 'meta-people-waiting'
                                  : ''
                            }
                          >
                            {item.subMetaRight}
                          </span>
                        )}
                        {item.subMetaRightType === 'green_ship' && (
                          <span className="meta-shipping-green">
                            <Truck className="w-3 h-3" /> Freeship
                          </span>
                        )}
                        {item.subMetaRightType === 'blue_pay' && (
                          <span className="meta-payment-blue">
                            <CreditCard className="w-3 h-3" />
                          </span>
                        )}
                        {item.subMetaRightType === 'blue_cert' && (
                          <span className="meta-payment-blue">
                            <Shield className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    {item.actionButton && (
                      <div className="card-action-btn-wrap">
                        {item.actionButton.type === 'bid' && (
                          <button
                            type="button"
                            className="action-btn-bid"
                            onClick={() => setActivePreviewWatch(item)}
                          >
                            <Gavel className="w-3.5 h-3.5" />
                            {item.actionButton.text}
                          </button>
                        )}
                        {item.actionButton.type === 'schedule' && (
                          <button
                            type="button"
                            className="action-btn-schedule"
                            onClick={() => alert(`Đã đặt lịch báo phiên: ${item.title}`)}
                          >
                            <Bell className="w-3.5 h-3.5" />
                            {item.actionButton.text}
                          </button>
                        )}
                        {item.actionButton.type === 'free_bid' && (
                          <button
                            type="button"
                            className="action-btn-bid"
                            onClick={() => setActivePreviewWatch(item)}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            {item.actionButton.text}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION */}
            <div className="pagination-container">
              <button
                type="button"
                className="pagination-nav-btn"
                disabled={activePage === 1}
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
              >
                ‹ Trang Trước
              </button>

              <div className="pagination-pages">
                {[1, 2, 3, 4].map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`page-num-btn ${activePage === page ? 'active' : ''}`}
                    onClick={() => setActivePage(page)}
                  >
                    {page}
                  </button>
                ))}
                <span className="page-ellipsis">...</span>
                <button
                  type="button"
                  className={`page-num-btn ${activePage === 12 ? 'active' : ''}`}
                  onClick={() => setActivePage(12)}
                >
                  12
                </button>
              </div>

              <button
                type="button"
                className="pagination-nav-btn"
                disabled={activePage === 12}
                onClick={() => setActivePage((p) => Math.min(12, p + 1))}
              >
                Trang Kế Tiếp ›
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 6. TRUST FEATURES BAR */}
      <section className="trust-features-section">
        <div className="trust-features-container">
          <div className="trust-feature-item">
            <div className="trust-icon-box">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="trust-feature-text">
              <span className="trust-feature-title">100% Chính Hãng</span>
              <span className="trust-feature-desc">Bảo chứng Bộ Công Thương & PCI-DSS</span>
            </div>
          </div>

          <div className="trust-feature-item">
            <div className="trust-icon-box">
              <Shield className="w-5 h-5" />
            </div>
            <div className="trust-feature-text">
              <span className="trust-feature-title">Thanh Toán Bảo Mật</span>
              <span className="trust-feature-desc">Escrow PayOS, Stripe & Thẻ quốc tế</span>
            </div>
          </div>

          <div className="trust-feature-item">
            <div className="trust-icon-box">
              <Truck className="w-5 h-5" />
            </div>
            <div className="trust-feature-text">
              <span className="trust-feature-title">Đồng Kiểm Tận Nơi</span>
              <span className="trust-feature-desc">Vận hành GHN Express & Viettel Post</span>
            </div>
          </div>

          <div className="trust-feature-item">
            <div className="trust-icon-box">
              <Box className="w-5 h-5" />
            </div>
            <div className="trust-feature-text">
              <span className="trust-feature-title">Mô Phỏng 3D Thực</span>
              <span className="trust-feature-desc">Kiểm định micro-mesh & vật lý số</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="search-footer">
        <div className="footer-container">
          <div className="footer-main-grid">
            {/* Column 1: Brand & Certified */}
            <div className="footer-brand-col">
              <div className="footer-brand-title-wrap">
                <Nexus3dLogo />
                <span className="footer-brand-title">NEXUS 3D OS</span>
              </div>
              <p className="footer-brand-desc">
                Sàn giao dịch thương mại điện tử và đấu giá tương tác 3D thời gian thực tiên phong
                tại Đông Nam Á. Kết nối các nhà sưu tập tinh hoa với vật phẩm nghệ thuật và hàng xa
                xỉ bảo chứng.
              </p>
              <div className="footer-cert-badges-row">
                <span className="footer-cert-badge blue">PCI-DSS COMPLIANT</span>
                <span className="footer-cert-badge orange">MOIT CERTIFIED</span>
              </div>
            </div>

            {/* Column 2: Customer Service */}
            <div className="footer-links-col">
              <h4 className="footer-col-heading">Chăm Sóc Khách Hàng</h4>
              <ul className="footer-links-list">
                <li>
                  <a href="#help" className="footer-link-item">
                    Trung tâm trợ giúp 24/7
                  </a>
                </li>
                <li>
                  <a href="#rules" className="footer-link-item">
                    Quy chuẩn đấu giá thực
                  </a>
                </li>
                <li>
                  <a href="#returns" className="footer-link-item">
                    Chính sách đồng kiểm & hoàn tiền
                  </a>
                </li>
                <li>
                  <a href="#appraisal" className="footer-link-item">
                    Biểu phí ký gửi giám định
                  </a>
                </li>
                <li>
                  <a href="#hotline" className="footer-link-item">
                    Hotline: 1900 8822
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Platform info */}
            <div className="footer-links-col">
              <h4 className="footer-col-heading">Về NEXUS Platform</h4>
              <ul className="footer-links-list">
                <li>
                  <a href="#about" className="footer-link-item">
                    Giới thiệu hệ điều hành 3D
                  </a>
                </li>
                <li>
                  <a href="#inspection" className="footer-link-item">
                    Quy trình thẩm định hiện vật
                  </a>
                </li>
                <li>
                  <a href="#partners" className="footer-link-item">
                    Hệ thống đối tác GHN / Stripe
                  </a>
                </li>
                <li>
                  <a href="#terms" className="footer-link-item">
                    Điều khoản giao dịch
                  </a>
                </li>
                <li>
                  <a href="#privacy" className="footer-link-item">
                    Chính sách bảo mật dữ liệu
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: App & Social Links */}
            <div className="footer-app-col">
              <h4 className="footer-col-heading">Ứng Dụng & Cổng Kết Nối</h4>
              <div className="footer-app-box">
                <div className="qr-icon-wrap">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="app-box-text-col">
                  <span className="app-box-title">NEXUS 3D App</span>
                  <span className="app-box-desc">Quét để trải nghiệm AR và đấu giá trực tiếp</span>
                </div>
              </div>

              <div className="footer-social-row">
                <button type="button" className="footer-social-btn" aria-label="Hệ thống mạng lưới">
                  <Share2 className="w-4 h-4" />
                </button>
                <button type="button" className="footer-social-btn" aria-label="Chia sẻ">
                  <Share2 className="w-4 h-4 rotate-90" />
                </button>
                <button type="button" className="footer-social-btn" aria-label="Website toàn cầu">
                  <Globe className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & API Status */}
          <div className="footer-bottom-row">
            <p className="footer-copyright-text">
              © 2025 NEXUS E-Commerce & 3D Auction Inc. Toàn quyền bảo lưu mã nguồn và chứng chỉ số.
            </p>
            <div className="footer-bottom-meta">
              <span>VIỆT NAM (VN)</span>
              <span>ENGLISH (US)</span>
              <span>
                API STATUS: <strong className="api-status-green">99.99%</strong>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* 8. 3D INTERACTIVE VIEWER MODAL (Bonus Realtime Interaction) */}
      {activePreviewWatch && (
        <div className="modal-overlay" onClick={() => setActivePreviewWatch(null)}>
          <div className="modal-content" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-gray-900 text-sm">
                  Mô Phỏng 3D AR & Chi Tiết Phiên Đấu Giá
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActivePreviewWatch(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-xl">
                <img
                  src={activePreviewWatch.image}
                  alt={activePreviewWatch.title}
                  className="w-24 h-24 object-cover rounded-lg shadow-sm"
                />
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {activePreviewWatch.brand}
                  </span>
                  <h3 className="font-bold text-gray-900 text-base mt-1">
                    {activePreviewWatch.title}
                  </h3>
                  <div className="text-xl font-extrabold text-orange-600 mt-2">
                    {activePreviewWatch.currentPrice}
                  </div>
                </div>
              </div>

              <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block mb-1 text-blue-950 font-bold">
                    Bảo chứng kiểm định vật lý số 100%
                  </strong>
                  Vật phẩm đã được chuyên gia đồng kiểm thông qua Micro-Mesh scan bề mặt 3D, kèm
                  theo NFT Provenance Token lưu trữ bất biến trên chuỗi khối.
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors text-sm"
                  onClick={() => {
                    window.location.assign('/auction');
                  }}
                >
                  <Gavel className="w-4 h-4" /> Vào Phòng Đấu Giá Trực Tiếp 3D
                </button>
                <button
                  type="button"
                  className="px-5 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  onClick={() => setActivePreviewWatch(null)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
