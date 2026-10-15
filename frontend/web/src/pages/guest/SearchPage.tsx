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
  <div className="[width:44px] [height:44px] [background:linear-gradient(135deg,_#2563eb,_#1d4ed8)] [border-radius:12px] flex items-center justify-center text-white [box-shadow:0_4px_10px_rgba(37,_99,_235,_0.25)]">
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
    <div className="min-h-screen bg-slate-50 text-slate-800 [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_Helvetica,_Arial,_sans-serif] flex flex-col">
      {/* 1. TOP UTILITY BAR */}
      <section className="bg-white [border-bottom:1px_solid_#f1f5f9] text-xs text-slate-600">
        <div className="max-w-screen-2xl [margin:0_auto] [padding:6px_24px] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-slate-600 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600">
              <Store className="w-3.5 h-3.5" /> Kênh Người Bán
            </span>
            <span className="w-[1px] h-3 bg-slate-200"></span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600">
              Trở thành Seller
            </span>
            <span className="w-[1px] h-3 bg-slate-200"></span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600">
              <Smartphone className="w-3.5 h-3.5" /> Tải Ứng Dụng
            </span>
            <span className="w-[1px] h-3 bg-slate-200"></span>
            <div className="inline-flex items-center gap-1.5">
              <span>Kết nối:</span>
              <Globe className="w-3.5 h-3.5 text-slate-500 cursor-pointer [transition:color_0.15s] hover:text-blue-600" />
              <MessageCircle className="w-3.5 h-3.5 text-slate-500 cursor-pointer [transition:color_0.15s] hover:text-blue-600" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-slate-600 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600">
              <Bell className="w-3.5 h-3.5" />
              Thông Báo{' '}
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block ml-[2px]"></span>
            </span>
            <span className="w-[1px] h-3 bg-slate-200"></span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600">
              <HelpCircle className="w-3.5 h-3.5" /> Trợ Giúp
            </span>
            <span className="w-[1px] h-3 bg-slate-200"></span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600">
              <Globe className="w-3.5 h-3.5" /> Tiếng Việt{' '}
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </span>
            <span className="w-[1px] h-3 bg-slate-200"></span>
            {currentUser ? (
              <span className="inline-flex items-center gap-1.5 text-slate-600 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600 font-semibold text-slate-900">
                {currentUser.fullName || currentUser.email}
              </span>
            ) : (
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 text-slate-600 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600 font-semibold text-slate-900"
              >
                Đăng Nhập
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 2. MAIN HEADER */}
      <header className="bg-white [border-bottom:1px_solid_#e2e8f0] [padding:16px_0] sticky top-0 z-40 [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.03)]">
        <div className="max-w-screen-2xl [margin:0_auto] [padding:0_24px] flex items-center justify-between gap-6 max-[640px]:flex-col max-[640px]:items-stretch">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 no-underline [flex-shrink:0]">
            <NexusLogo />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-extrabold [letter-spacing:-0.5px] text-slate-900 leading-none">
                  NEXUS
                </span>
                <span className="[background-color:#ea580c] text-white text-[10px] font-extrabold [padding:2px_6px] rounded [letter-spacing:0.5px]">
                  MALL & BID
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-[3px] font-medium">
                Sàn Thương Mại Điện Tử & Đấu Giá Trực Tuyến
              </span>
            </div>
          </a>

          {/* Search Box */}
          <div className="[flex:1] max-w-[680px] flex flex-col gap-1.5 max-[640px]:max-w-full">
            <div className="flex items-center [border:2px_solid_#ea580c] [border-radius:10px] [background:#ffffff] overflow-hidden [height:46px] [box-shadow:0_2px_6px_rgba(234,_88,_12,_0.08)] [transition:all_0.2s_ease] focus-within:[box-shadow:0_0_0_3px_rgba(234,_88,_12,_0.2)]">
              <div className="relative">
                <button
                  type="button"
                  className="[background:transparent] [border:none] [border-right:1px_solid_#e2e8f0] [padding:0_14px] text-[13px] font-semibold text-slate-800 cursor-pointer flex items-center gap-1.5 h-full whitespace-nowrap"
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
                className="[flex:1] [border:none] [outline:none] [padding:0_16px] text-sm text-slate-900 [background:transparent] w-full [&::placeholder]:text-slate-400"
                placeholder="Tìm kiếm đồng hồ, thương hiệu, phiên đấu giá..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
              />

              <button
                type="button"
                className="[background-color:#ea580c] [border:none] text-white h-full [padding:0_24px] cursor-pointer flex items-center justify-center [transition:background-color_0.15s_ease] hover:[background-color:#c2410c]"
                aria-label="Tìm kiếm"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {/* Trending searches */}
            <div className="flex items-center gap-3 text-[11px] text-slate-500 pl-1 [overflow-x:auto] whitespace-nowrap">
              <span className="font-semibold text-slate-400">Xu hướng:</span>
              {trendingSearches.map((item) => (
                <span
                  key={item}
                  className="text-slate-600 cursor-pointer [transition:color_0.15s_ease] hover:text-blue-600 hover:underline"
                  onClick={() => setSearchQuery(item)}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Cart Button */}
          <a
            href="/cart"
            className="flex items-center gap-2.5 [background:#ffffff] [border:1px_solid_#e2e8f0] [padding:8px_18px] rounded-full cursor-pointer relative [transition:all_0.2s_ease] no-underline [flex-shrink:0] hover:border-slate-300 hover:bg-slate-50 hover:[box-shadow:0_2px_6px_rgba(0,_0,_0,_0.04)]"
          >
            <ShoppingCart className="w-5 h-5 [color:#ea580c]" />
            <span className="text-sm font-bold text-slate-900">Giỏ Hàng</span>
          </a>
        </div>
      </header>

      {/* 3. SEARCH RESULTS BANNER */}
      <section className="bg-white [border-bottom:1px_solid_#e2e8f0] [padding:20px_0]">
        <div className="max-w-screen-2xl [margin:0_auto] [padding:0_24px] flex items-center justify-between gap-5">
          <div className="flex flex-col gap-1">
            <div className="mb-2">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-sm transition"
              >
                <ArrowLeft size={13} />
                Quay lại Trang Chủ
              </a>
            </div>
            <h1 className="text-[26px] font-extrabold text-slate-900 m-0 leading-tight">
              Kết quả tìm kiếm cho:{' '}
              <span className="text-blue-600">"{searchQuery || 'đồng hồ cơ skeleton'}"</span>
            </h1>
            <div className="flex items-center gap-2 text-[13px] text-slate-500 font-medium">
              <span>
                Tìm thấy <strong className="font-bold text-slate-900">128</strong> sản phẩm thương
                mại
              </span>
              <span>•</span>
              <span className="w-1.5 h-1.5 [background-color:#ea580c] rounded-full inline-block"></span>
              <span className="[color:#ea580c] font-bold">14 phiên đấu giá trực tiếp 3D</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-blue-50 [border:1px_solid_#bfdbfe] text-blue-700 text-xs font-bold [letter-spacing:0.5px] [padding:8px_18px] rounded-full uppercase [box-shadow:0_1px_2px_rgba(37,_99,_235,_0.05)] [flex-shrink:0]">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>KIỂM ĐỊNH MICRO-MESH & VẬT LÝ SỐ 100%</span>
          </div>
        </div>
      </section>

      {/* 4. SORTING & VIEW BAR */}
      <section className="bg-white [border-bottom:1px_solid_#e2e8f0] [padding:12px_0]">
        <div className="max-w-screen-2xl [margin:0_auto] [padding:0_24px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-[13px] text-slate-500 font-medium mr-1">
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              <span>Sắp xếp theo:</span>
            </div>

            <button
              type="button"
              className={`[padding:6px_16px] text-[13px] font-semibold rounded-full [border:1px_solid_#e2e8f0] bg-white text-slate-700 cursor-pointer [transition:all_0.15s_ease] inline-flex items-center gap-1 hover:bg-slate-50 hover:border-slate-300 [&.active]:bg-blue-600 [&.active]:border-blue-600 [&.active]:text-white [&.active]:[box-shadow:0_2px_6px_rgba(37,_99,_235,_0.2)] ${activeSort === 'popular' ? 'active' : ''}`}
              onClick={() => setActiveSort('popular')}
            >
              Phổ biến nhất
            </button>
            <button
              type="button"
              className={`[padding:6px_16px] text-[13px] font-semibold rounded-full [border:1px_solid_#e2e8f0] bg-white text-slate-700 cursor-pointer [transition:all_0.15s_ease] inline-flex items-center gap-1 hover:bg-slate-50 hover:border-slate-300 [&.active]:bg-blue-600 [&.active]:border-blue-600 [&.active]:text-white [&.active]:[box-shadow:0_2px_6px_rgba(37,_99,_235,_0.2)] ${activeSort === 'latest' ? 'active' : ''}`}
              onClick={() => setActiveSort('latest')}
            >
              Mới nhất
            </button>
            <button
              type="button"
              className={`[padding:6px_16px] text-[13px] font-semibold rounded-full [border:1px_solid_#e2e8f0] bg-white text-slate-700 cursor-pointer [transition:all_0.15s_ease] inline-flex items-center gap-1 hover:bg-slate-50 hover:border-slate-300 [&.active]:bg-blue-600 [&.active]:border-blue-600 [&.active]:text-white [&.active]:[box-shadow:0_2px_6px_rgba(37,_99,_235,_0.2)] ${activeSort === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveSort('sales')}
            >
              Bán chạy
            </button>
            <button
              type="button"
              className={`[padding:6px_16px] text-[13px] font-semibold rounded-full [border:1px_solid_#e2e8f0] bg-white text-slate-700 cursor-pointer [transition:all_0.15s_ease] inline-flex items-center gap-1 hover:bg-slate-50 hover:border-slate-300 [&.active]:bg-blue-600 [&.active]:border-blue-600 [&.active]:text-white [&.active]:[box-shadow:0_2px_6px_rgba(37,_99,_235,_0.2)] ${activeSort === 'price' ? 'active' : ''}`}
              onClick={() => setActiveSort('price')}
            >
              Giá <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[13px] text-slate-500 font-medium">Chế độ xem:</span>
            <button
              type="button"
              className={`w-8 h-8 [border-radius:6px] [border:1px_solid_#e2e8f0] [background:#ffffff] text-slate-500 flex items-center justify-center cursor-pointer [transition:all_0.15s_ease] [&.active]:bg-blue-600 [&.active]:border-blue-600 [&.active]:text-white ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Xem dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              className={`w-8 h-8 [border-radius:6px] [border:1px_solid_#e2e8f0] [background:#ffffff] text-slate-500 flex items-center justify-center cursor-pointer [transition:all_0.15s_ease] [&.active]:bg-blue-600 [&.active]:border-blue-600 [&.active]:text-white ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="Xem dạng danh sách"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. MAIN CONTENT (2 COLUMNS: SIDEBAR + RESULTS) */}
      <main className="[padding:24px_0_48px] [flex:1]">
        <div className="max-w-screen-2xl [margin:0_auto] [padding:0_24px] flex gap-6 items-start max-[900px]:flex-col">
          {/* LEFT SIDEBAR FILTERS */}
          <aside className="[width:260px] [flex-shrink:0] flex flex-col gap-4 max-[900px]:w-full">
            <div className="[background:#ffffff] [border:1px_solid_#e2e8f0] [border-radius:12px] p-[18px] [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.02)]">
              <div className="flex items-center justify-between mb-4 pb-3 [border-bottom:1px_solid_#f1f5f9]">
                <div className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <span>Bộ Lọc Tìm Kiếm</span>
                </div>
                <button
                  type="button"
                  className="[background:none] [border:none] text-blue-600 text-xs font-semibold cursor-pointer p-0 hover:underline"
                  onClick={clearAllFilters}
                >
                  Xóa tất cả
                </button>
              </div>

              {/* 1. LOẠI HÌNH GIAO DỊCH */}
              <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3 select-none"
                  onClick={() => toggleSection('transactionType')}
                >
                  <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
                    LOẠI HÌNH GIAO DỊCH
                  </span>
                  <ChevronUp
                    className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['transactionType'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['transactionType'] && (
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${transactionTypes.live3d ? 'checked' : ''}`}
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
                      <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600 orange">
                        14
                      </span>
                    </label>

                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${transactionTypes.mall ? 'checked' : ''}`}
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
                      <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600 blue">
                        86
                      </span>
                    </label>

                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${transactionTypes.upcoming ? 'checked' : ''}`}
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
                      <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                        22
                      </span>
                    </label>

                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${transactionTypes.escrow ? 'checked' : ''}`}
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
                      <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                        20
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* 2. KHOẢNG GIÁ (VNĐ) */}
              <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3 select-none"
                  onClick={() => toggleSection('priceRange')}
                >
                  <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
                    KHOẢNG GIÁ (VNĐ)
                  </span>
                  <ChevronUp
                    className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['priceRange'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['priceRange'] && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="[flex:1] flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">TỪ</span>
                        <input
                          type="text"
                          className="w-full [border:1px_solid_#cbd5e1] [border-radius:6px] [padding:6px_8px] text-xs font-semibold text-slate-900 [background:#f8fafc] [outline:none] [box-sizing:border-box] focus:border-blue-600 focus:[background:#ffffff]"
                          value={priceFrom}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPriceFrom(e.target.value)
                          }
                        />
                      </div>
                      <div className="[flex:1] flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">ĐẾN</span>
                        <input
                          type="text"
                          className="w-full [border:1px_solid_#cbd5e1] [border-radius:6px] [padding:6px_8px] text-xs font-semibold text-slate-900 [background:#f8fafc] [outline:none] [box-sizing:border-box] focus:border-blue-600 focus:[background:#ffffff]"
                          value={priceTo}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPriceTo(e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="[margin:14px_4px_10px]">
                      <div className="relative h-1 bg-slate-200 [border-radius:2px]">
                        <div className="absolute h-full [left:5%] [right:50%] bg-blue-600 [border-radius:2px]"></div>
                        <div className="absolute [top:50%] [transform:translate(-50%,_-50%)] w-3.5 h-3.5 rounded-full bg-white [border:2px_solid_#2563eb] [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.15)] cursor-pointer [&.left]:[left:5%] [&.right]:[left:50%] left"></div>
                        <div className="absolute [top:50%] [transform:translate(-50%,_-50%)] w-3.5 h-3.5 rounded-full bg-white [border:2px_solid_#2563eb] [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.15)] cursor-pointer [&.left]:[left:5%] [&.right]:[left:50%] right"></div>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-semibold mt-2">
                        <span>0 VNĐ</span>
                        <span>500M+ VNĐ</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full bg-blue-600 text-white [border:none] [border-radius:8px] [padding:9px_12px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 [transition:background-color_0.15s_ease] mt-2.5 hover:bg-blue-700"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Áp Dụng Khoảng Giá
                    </button>
                  </div>
                )}
              </div>

              {/* 3. TÌNH TRẠNG VẬT PHẨM */}
              <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3 select-none"
                  onClick={() => toggleSection('itemCondition')}
                >
                  <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
                    TÌNH TRẠNG VẬT PHẨM
                  </span>
                  <ChevronUp
                    className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['itemCondition'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['itemCondition'] && (
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${conditionFilters.brandNew ? 'checked' : ''}`}
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

                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${conditionFilters.likeNew ? 'checked' : ''}`}
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

                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${conditionFilters.gradeA ? 'checked' : ''}`}
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

                    <div className="bg-blue-50 [border:1px_solid_#bfdbfe] [border-radius:8px] [padding:10px_12px] flex items-start gap-2 mt-1.5">
                      <Shield className="w-4 h-4 text-blue-600 [flex-shrink:0] mt-[1px]" />
                      <span className="text-[11px] [line-height:1.4] [color:#1e40af] font-medium">
                        Bao gồm Chứng thư Giám định Vật lý & NFT Provenance Token
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. THƯƠNG HIỆU XA XỈ */}
              <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3 select-none"
                  onClick={() => toggleSection('luxuryBrands')}
                >
                  <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
                    THƯƠNG HIỆU XA XỈ
                  </span>
                  <ChevronUp
                    className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['luxuryBrands'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['luxuryBrands'] && (
                  <div className="flex flex-col gap-2.5">
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
                        <label
                          key={brand.key}
                          className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${isChecked ? 'checked' : ''}`}
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
                          <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                            {brand.count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. VẬN CHUYỂN & DỊCH VỤ */}
              <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3 select-none"
                  onClick={() => toggleSection('shippingService')}
                >
                  <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
                    VẬN CHUYỂN & DỊCH VỤ
                  </span>
                  <ChevronUp
                    className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['shippingService'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['shippingService'] && (
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${shippingFilters.ghn ? 'checked' : ''}`}
                          onClick={() =>
                            setShippingFilters({ ...shippingFilters, ghn: !shippingFilters.ghn })
                          }
                        >
                          {shippingFilters.ghn && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                        <span>Đồng kiểm niêm phong GHN Express</span>
                      </div>
                    </label>

                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${shippingFilters.pci ? 'checked' : ''}`}
                          onClick={() =>
                            setShippingFilters({ ...shippingFilters, pci: !shippingFilters.pci })
                          }
                        >
                          {shippingFilters.pci && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                        <span>Bảo hiểm giá trị cao 100% (PCI Safe)</span>
                      </div>
                    </label>

                    <label className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded [border:1.5px_solid_#cbd5e1] flex items-center justify-center [transition:all_0.15s_ease] bg-white [flex-shrink:0] [&.checked]:bg-blue-600 [&.checked]:border-blue-600 [&.checked]:text-white ${shippingFilters.express2h ? 'checked' : ''}`}
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
              <div className="mb-5 [border-bottom:1px_solid_#f1f5f9] pb-[18px] [&:last-child]:mb-0 [&:last-child]:[border-bottom:none] [&:last-child]:pb-0">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3 select-none"
                  onClick={() => toggleSection('collectorRating')}
                >
                  <span className="text-xs font-extrabold text-slate-800 uppercase [letter-spacing:0.5px]">
                    ĐÁNH GIÁ COLLECTOR
                  </span>
                  <ChevronUp
                    className={`w-4 h-4 text-slate-400 [transition:transform_0.2s_ease] [&.collapsed]:[transform:rotate(180deg)] ${collapsedSections['collectorRating'] ? 'collapsed' : ''}`}
                  />
                </div>
                {!collapsedSections['collectorRating'] && (
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-[3px] text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-xs text-gray-700">(5.0 tuyệt đối)</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                        64
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[13px] text-slate-700 cursor-pointer select-none">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-[3px] text-amber-500">
                          {[1, 2, 3, 4].map((s) => (
                            <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                          <Star className="w-3.5 h-3.5 text-gray-300" />
                        </div>
                        <span className="text-xs text-gray-700">từ 4 sao</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 [&.orange]:[color:#ea580c] [&.blue]:text-blue-600">
                        78
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* RIGHT AREA: TAGS & PRODUCTS */}
          <div className="[flex:1] min-w-0 flex flex-col gap-4">
            {/* Related Searches */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Tìm kiếm liên quan:</span>
              </div>
              {relatedTags.map((tag) => (
                <span
                  key={tag}
                  className="[background:#ffffff] [border:1px_solid_#e2e8f0] rounded-full [padding:4px_12px] text-xs font-medium text-slate-600 cursor-pointer [transition:all_0.15s_ease] hover:[border-color:#93c5fd] hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => setSearchQuery(tag.replace('# ', ''))}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Applied Filters Row */}
            <div className="flex items-center justify-between gap-3 [background:#ffffff] [border:1px_solid_#e2e8f0] [border-radius:10px] [padding:10px_16px]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-extrabold text-slate-600 [letter-spacing:0.5px]">
                  ĐANG ÁP DỤNG:
                </span>
                {appliedChips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1.5 bg-blue-50 [border:1px_solid_#bfdbfe] text-blue-600 text-xs font-semibold [padding:4px_10px] [border-radius:6px] cursor-pointer [transition:all_0.15s_ease] hover:bg-blue-100"
                    onClick={() => removeChip(chip)}
                  >
                    {chip} <span className="text-[11px] text-blue-500 font-extrabold">✕</span>
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-bold text-slate-400 [letter-spacing:0.5px] whitespace-nowrap">
                HIỂN THỊ 8 TRÊN 142 VẬT PHẨM
              </span>
            </div>

            {/* PRODUCT GRID */}
            <div
              className={`grid [grid-template-columns:repeat(4,_1fr)] gap-4 [&.list-mode]:[grid-template-columns:1fr] max-[1200px]:[grid-template-columns:repeat(3,_1fr)] max-[900px]:[grid-template-columns:repeat(2,_1fr)] max-[640px]:[grid-template-columns:1fr] ${viewMode === 'list' ? 'list-mode' : ''}`}
            >
              {products.map((item) => (
                <div
                  key={item.id}
                  className="[background:#ffffff] [border:1px_solid_#e2e8f0] [border-radius:12px] overflow-hidden flex flex-col [transition:all_0.2s_ease] [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.02)] relative hover:[transform:translateY(-3px)] hover:[box-shadow:0_8px_20px_rgba(0,_0,_0,_0.07)] hover:border-slate-300 hover:[&_.product-image-img]:[transform:scale(1.03)]"
                >
                  {/* Media / Image Box */}
                  <div className="relative w-full aspect-square [background-color:#0b0f19] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover [transition:transform_0.3s_ease]"
                      loading="lazy"
                    />

                    {/* Top Left Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      {item.primaryBadge.type === 'live' && (
                        <span className="bg-red-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1 [letter-spacing:0.3px] [box-shadow:0_2px_4px_rgba(220,_38,_38,_0.3)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'mall' && (
                        <span className="bg-blue-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1 [box-shadow:0_2px_4px_rgba(37,_99,_235,_0.3)]">
                          <ShieldCheck className="w-3 h-3" />
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'upcoming' && (
                        <span className="bg-slate-800 [color:#fde047] [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'flash' && (
                        <span className="bg-red-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'free_deposit' && (
                        <span className="bg-emerald-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {item.primaryBadge.text}
                        </span>
                      )}
                      {item.primaryBadge.type === 'verified' && (
                        <span className="bg-blue-600 text-white [font-size:9px] font-extrabold [padding:2px_7px] rounded-full inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          {item.primaryBadge.text}
                        </span>
                      )}

                      {/* Sub glass badge */}
                      {item.subBadge && (
                        <span
                          className={`[background-color:rgba(255,_255,_255,_0.9)] [backdrop-filter:blur(4px)] text-slate-800 [font-size:9px] font-bold [padding:2px_6px] rounded inline-flex items-center gap-1 [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.1)] [&.yellow-tag]:[background-color:#fef08a] [&.yellow-tag]:[color:#854d0e] ${item.subBadge.isYellow ? 'yellow-tag' : ''}`}
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
                      className={`absolute top-2 right-2 [width:28px] [height:28px] rounded-full [background:rgba(255,_255,_255,_0.9)] [backdrop-filter:blur(4px)] [border:none] flex items-center justify-center text-slate-500 cursor-pointer z-10 [transition:all_0.15s_ease] [box-shadow:0_2px_4px_rgba(0,_0,_0,_0.1)] hover:[transform:scale(1.1)] hover:text-red-500 [&.favorited]:text-red-500 [&.favorited]:bg-white ${likedItems[item.id] ? 'favorited' : ''}`}
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
                        className="absolute bottom-1.5 left-1.5 right-1.5 [background:rgba(255,_255,_255,_0.92)] [backdrop-filter:blur(6px)] [border-radius:6px] [padding:4px_8px] flex items-center justify-between text-[10px] font-semibold z-10 [box-shadow:0_2px_4px_rgba(0,_0,_0,_0.08)] cursor-pointer hover:bg-white transition-colors"
                        onClick={() => setActivePreviewWatch(item)}
                        title="Bấm để xoay 3D trực tiếp"
                      >
                        <div className="flex items-center gap-1 text-blue-600">
                          {item.imageOverlay.leftIcon === 'rotate' && (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          {item.imageOverlay.leftIcon === 'hourglass' && (
                            <Clock className="w-3 h-3 text-blue-600" />
                          )}
                          <span>{item.imageOverlay.leftText}</span>
                        </div>
                        <div className="[color:#b45309] font-bold">
                          <span>{item.imageOverlay.rightText}</span>
                        </div>
                      </div>
                    )}

                    {/* Discount badge */}
                    {item.imageOverlay?.isDiscount && (
                      <span className="absolute bottom-2 left-2 [background-color:#fee2e2] text-red-600 text-[10px] font-extrabold [padding:2px_6px] rounded z-10">
                        {item.imageOverlay.discountText}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 flex flex-col [flex:1]">
                    <span className="text-[10px] font-bold [letter-spacing:0.5px] uppercase text-slate-400 mb-1">
                      {item.brand}
                    </span>
                    <h3
                      className="text-[13px] font-bold text-slate-900 [line-height:1.35] [margin:0_0_8px] [height:36px] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden"
                      title={item.title}
                    >
                      <a href={`/product/${item.id}`} className="hover:text-[#f24e1e] transition">
                        {item.title}
                      </a>
                    </h3>

                    {/* Rating / Sold Row */}
                    {item.rating && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-slate-900">{item.rating.toFixed(1)}</span>
                        <span>•</span>
                        <span>Đã bán {item.soldCount}</span>
                      </div>
                    )}

                    {/* Price Section */}
                    <div className="[margin-top:auto] pt-1">
                      {(item.priceLabel || item.timer) && (
                        <div className="flex items-center justify-between text-[11px] mb-[2px]">
                          {item.priceLabel && (
                            <span className="text-slate-500 font-medium">{item.priceLabel}</span>
                          )}
                          {item.timer && (
                            <span className="flex items-center gap-[3px] text-red-600 font-bold text-[11px]">
                              <Clock className="w-3 h-3" /> {item.timer}
                            </span>
                          )}
                        </div>
                      )}

                      {item.oldPrice && (
                        <div className="text-[11px] text-slate-400 [text-decoration:line-through] mb-[2px]">
                          {item.oldPrice}
                        </div>
                      )}

                      <div
                        className={`[font-size:17px] font-extrabold leading-tight [&.orange]:[color:#ea580c] [&.red]:text-red-600 [&.black]:text-slate-900 ${item.priceColor}`}
                      >
                        {item.currentPrice}
                      </div>

                      {/* Sub metadata */}
                      <div className="flex items-center justify-between text-[11px] mt-1.5 text-slate-500">
                        <span>{item.subMetaLeft}</span>
                        {item.subMetaRight && (
                          <span
                            className={
                              item.subMetaRightType === 'link'
                                ? 'text-blue-600 font-semibold'
                                : item.subMetaRightType === 'waiting'
                                  ? '[color:#ea580c] font-bold'
                                  : ''
                            }
                          >
                            {item.subMetaRight}
                          </span>
                        )}
                        {item.subMetaRightType === 'green_ship' && (
                          <span className="text-green-600 font-semibold flex items-center gap-1">
                            <Truck className="w-3 h-3" /> Freeship
                          </span>
                        )}
                        {item.subMetaRightType === 'blue_pay' && (
                          <span className="text-blue-600 font-semibold flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                          </span>
                        )}
                        {item.subMetaRightType === 'blue_cert' && (
                          <span className="text-blue-600 font-semibold flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    {item.actionButton && (
                      <div className="mt-2.5">
                        {item.actionButton.type === 'bid' && (
                          <button
                            type="button"
                            className="w-full [background:linear-gradient(135deg,_#ea580c,_#f97316)] text-white [border:none] [border-radius:8px] [padding:8px_12px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 [transition:all_0.15s_ease] [box-shadow:0_2px_4px_rgba(234,_88,_12,_0.2)] hover:[background:linear-gradient(135deg,_#c2410c,_#ea580c)] hover:[transform:translateY(-1px)]"
                            onClick={() => setActivePreviewWatch(item)}
                          >
                            <Gavel className="w-3.5 h-3.5" />
                            {item.actionButton.text}
                          </button>
                        )}
                        {item.actionButton.type === 'schedule' && (
                          <button
                            type="button"
                            className="w-full bg-slate-50 [border:1px_solid_#e2e8f0] text-slate-800 [border-radius:8px] [padding:8px_12px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 [transition:all_0.15s_ease] hover:bg-slate-100 hover:border-slate-300"
                            onClick={() => alert(`Đã đặt lịch báo phiên: ${item.title}`)}
                          >
                            <Bell className="w-3.5 h-3.5" />
                            {item.actionButton.text}
                          </button>
                        )}
                        {item.actionButton.type === 'free_bid' && (
                          <button
                            type="button"
                            className="w-full [background:linear-gradient(135deg,_#ea580c,_#f97316)] text-white [border:none] [border-radius:8px] [padding:8px_12px] text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 [transition:all_0.15s_ease] [box-shadow:0_2px_4px_rgba(234,_88,_12,_0.2)] hover:[background:linear-gradient(135deg,_#c2410c,_#ea580c)] hover:[transform:translateY(-1px)]"
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
            <div className="flex items-center justify-center gap-2 [margin-top:36px] pt-5 [border-top:1px_solid_#f1f5f9]">
              <button
                type="button"
                className="bg-white [border:1px_solid_#e2e8f0] text-slate-600 text-[13px] font-semibold [padding:7px_14px] [border-radius:8px] cursor-pointer [transition:all_0.15s_ease] inline-flex items-center gap-1 [&:hover:not(:disabled)]:bg-slate-50 [&:hover:not(:disabled)]:border-slate-300 disabled:[opacity:0.5] disabled:cursor-not-allowed"
                disabled={activePage === 1}
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
              >
                ‹ Trang Trước
              </button>

              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`[width:34px] [height:34px] [border-radius:8px] [border:1px_solid_#e2e8f0] bg-white text-slate-700 text-[13px] font-semibold flex items-center justify-center cursor-pointer [transition:all_0.15s_ease] hover:bg-slate-50 hover:border-slate-300 [&.active]:bg-blue-600 [&.active]:border-blue-600 [&.active]:text-white [&.active]:font-extrabold [&.active]:[box-shadow:0_2px_4px_rgba(37,_99,_235,_0.25)] ${activePage === page ? 'active' : ''}`}
                    onClick={() => setActivePage(page)}
                  >
                    {page}
                  </button>
                ))}
                <span className="text-[13px] text-slate-400 [padding:0_4px]">...</span>
                <button
                  type="button"
                  className={`[width:34px] [height:34px] [border-radius:8px] [border:1px_solid_#e2e8f0] bg-white text-slate-700 text-[13px] font-semibold flex items-center justify-center cursor-pointer [transition:all_0.15s_ease] hover:bg-slate-50 hover:border-slate-300 [&.active]:bg-blue-600 [&.active]:border-blue-600 [&.active]:text-white [&.active]:font-extrabold [&.active]:[box-shadow:0_2px_4px_rgba(37,_99,_235,_0.25)] ${activePage === 12 ? 'active' : ''}`}
                  onClick={() => setActivePage(12)}
                >
                  12
                </button>
              </div>

              <button
                type="button"
                className="bg-white [border:1px_solid_#e2e8f0] text-slate-600 text-[13px] font-semibold [padding:7px_14px] [border-radius:8px] cursor-pointer [transition:all_0.15s_ease] inline-flex items-center gap-1 [&:hover:not(:disabled)]:bg-slate-50 [&:hover:not(:disabled)]:border-slate-300 disabled:[opacity:0.5] disabled:cursor-not-allowed"
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
      <section className="bg-white [border-top:1px_solid_#e2e8f0] [border-bottom:1px_solid_#e2e8f0] [padding:28px_0]">
        <div className="max-w-screen-2xl [margin:0_auto] [padding:0_24px] grid [grid-template-columns:repeat(4,_1fr)] gap-6 max-[900px]:[grid-template-columns:repeat(2,_1fr)] max-[640px]:[grid-template-columns:1fr]">
          <div className="flex items-center gap-3.5">
            <div className="[width:44px] [height:44px] [border-radius:10px] bg-blue-50 flex items-center justify-center text-blue-600 [flex-shrink:0]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="text-sm font-extrabold text-slate-900">100% Chính Hãng</span>
              <span className="text-xs text-slate-500 leading-snug">
                Bảo chứng Bộ Công Thương & PCI-DSS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="[width:44px] [height:44px] [border-radius:10px] bg-blue-50 flex items-center justify-center text-blue-600 [flex-shrink:0]">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="text-sm font-extrabold text-slate-900">Thanh Toán Bảo Mật</span>
              <span className="text-xs text-slate-500 leading-snug">
                Escrow PayOS, Stripe & Thẻ quốc tế
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="[width:44px] [height:44px] [border-radius:10px] bg-blue-50 flex items-center justify-center text-blue-600 [flex-shrink:0]">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="text-sm font-extrabold text-slate-900">Đồng Kiểm Tận Nơi</span>
              <span className="text-xs text-slate-500 leading-snug">
                Vận hành GHN Express & Viettel Post
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="[width:44px] [height:44px] [border-radius:10px] bg-blue-50 flex items-center justify-center text-blue-600 [flex-shrink:0]">
              <Box className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-[2px]">
              <span className="text-sm font-extrabold text-slate-900">Mô Phỏng 3D Thực</span>
              <span className="text-xs text-slate-500 leading-snug">
                Kiểm định micro-mesh & vật lý số
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-white [padding:48px_0_20px]">
        <div className="max-w-screen-2xl [margin:0_auto] [padding:0_24px]">
          <div className="grid [grid-template-columns:2fr_1.3fr_1.3fr_1.4fr] [gap:40px] [margin-bottom:40px] max-[1200px]:[grid-template-columns:repeat(2,_1fr)] max-[640px]:[grid-template-columns:1fr]">
            {/* Column 1: Brand & Certified */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-2.5">
                <Nexus3dLogo />
                <span className="[font-size:18px] font-extrabold text-slate-900">NEXUS 3D OS</span>
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed [max-width:380px]">
                Sàn giao dịch thương mại điện tử và đấu giá tương tác 3D thời gian thực tiên phong
                tại Đông Nam Á. Kết nối các nhà sưu tập tinh hoa với vật phẩm nghệ thuật và hàng xa
                xỉ bảo chứng.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-extrabold [padding:4px_8px] rounded [letter-spacing:0.5px] [&.blue]:bg-blue-50 [&.blue]:[border:1px_solid_#bfdbfe] [&.blue]:text-blue-600 [&.orange]:[background-color:#fff7ed] [&.orange]:[border:1px_solid_#fed7aa] [&.orange]:[color:#ea580c] blue">
                  PCI-DSS COMPLIANT
                </span>
                <span className="text-[10px] font-extrabold [padding:4px_8px] rounded [letter-spacing:0.5px] [&.blue]:bg-blue-50 [&.blue]:[border:1px_solid_#bfdbfe] [&.blue]:text-blue-600 [&.orange]:[background-color:#fff7ed] [&.orange]:[border:1px_solid_#fed7aa] [&.orange]:[color:#ea580c] orange">
                  MOIT CERTIFIED
                </span>
              </div>
            </div>

            {/* Column 2: Customer Service */}
            <div className="footer-links-col">
              <h4 className="text-sm font-extrabold text-slate-900 mb-4">Chăm Sóc Khách Hàng</h4>
              <ul className="[list-style:none] p-0 m-0 flex flex-col gap-2.5">
                <li>
                  <a
                    href="#help"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Trung tâm trợ giúp 24/7
                  </a>
                </li>
                <li>
                  <a
                    href="#rules"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Quy chuẩn đấu giá thực
                  </a>
                </li>
                <li>
                  <a
                    href="#returns"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Chính sách đồng kiểm & hoàn tiền
                  </a>
                </li>
                <li>
                  <a
                    href="#appraisal"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Biểu phí ký gửi giám định
                  </a>
                </li>
                <li>
                  <a
                    href="#hotline"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Hotline: 1900 8822
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Platform info */}
            <div className="footer-links-col">
              <h4 className="text-sm font-extrabold text-slate-900 mb-4">Về NEXUS Platform</h4>
              <ul className="[list-style:none] p-0 m-0 flex flex-col gap-2.5">
                <li>
                  <a
                    href="#about"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Giới thiệu hệ điều hành 3D
                  </a>
                </li>
                <li>
                  <a
                    href="#inspection"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Quy trình thẩm định hiện vật
                  </a>
                </li>
                <li>
                  <a
                    href="#partners"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Hệ thống đối tác GHN / Stripe
                  </a>
                </li>
                <li>
                  <a
                    href="#terms"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Điều khoản giao dịch
                  </a>
                </li>
                <li>
                  <a
                    href="#privacy"
                    className="text-[13px] text-slate-500 no-underline [transition:color_0.15s_ease] cursor-pointer hover:text-blue-600"
                  >
                    Chính sách bảo mật dữ liệu
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: App & Social Links */}
            <div className="flex flex-col gap-4">
              <h4 className="text-sm font-extrabold text-slate-900 mb-4">
                Ứng Dụng & Cổng Kết Nối
              </h4>
              <div className="bg-slate-50 [border:1px_solid_#e2e8f0] [border-radius:12px] p-3.5 flex items-center gap-3">
                <div className="[width:44px] [height:44px] [background:#eff6ff] [border-radius:8px] flex items-center justify-center text-blue-600 [flex-shrink:0]">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-[2px]">
                  <span className="text-[13px] font-extrabold text-slate-900">NEXUS 3D App</span>
                  <span className="text-[11px] text-slate-500 leading-snug">
                    Quét để trải nghiệm AR và đấu giá trực tiếp
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="[width:36px] [height:36px] [border-radius:8px] bg-slate-100 [border:1px_solid_#e2e8f0] flex items-center justify-center text-slate-500 cursor-pointer [transition:all_0.15s_ease] hover:bg-blue-50 hover:[border-color:#bfdbfe] hover:text-blue-600"
                  aria-label="Hệ thống mạng lưới"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="[width:36px] [height:36px] [border-radius:8px] bg-slate-100 [border:1px_solid_#e2e8f0] flex items-center justify-center text-slate-500 cursor-pointer [transition:all_0.15s_ease] hover:bg-blue-50 hover:[border-color:#bfdbfe] hover:text-blue-600"
                  aria-label="Chia sẻ"
                >
                  <Share2 className="w-4 h-4 rotate-90" />
                </button>
                <button
                  type="button"
                  className="[width:36px] [height:36px] [border-radius:8px] bg-slate-100 [border:1px_solid_#e2e8f0] flex items-center justify-center text-slate-500 cursor-pointer [transition:all_0.15s_ease] hover:bg-blue-50 hover:[border-color:#bfdbfe] hover:text-blue-600"
                  aria-label="Website toàn cầu"
                >
                  <Globe className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & API Status */}
          <div className="[border-top:1px_solid_#f1f5f9] pt-5 flex items-center justify-between text-xs text-slate-400 gap-4 flex-wrap">
            <p className="m-0">
              © 2025 NEXUS E-Commerce & 3D Auction Inc. Toàn quyền bảo lưu mã nguồn và chứng chỉ số.
            </p>
            <div className="flex items-center gap-4">
              <span>VIỆT NAM (VN)</span>
              <span>ENGLISH (US)</span>
              <span>
                API STATUS: <strong className="text-green-600 font-bold">99.99%</strong>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* 8. 3D INTERACTIVE VIEWER MODAL (Bonus Realtime Interaction) */}
      {activePreviewWatch && (
        <div
          className="fixed [inset:0] [background:rgba(15,_23,_42,_0.7)] [backdrop-filter:blur(8px)] [z-index:100] flex items-center justify-center p-5"
          onClick={() => setActivePreviewWatch(null)}
        >
          <div
            className="[background:#ffffff] [border-radius:16px] w-full max-w-[680px] overflow-hidden [box-shadow:0_20px_40px_rgba(0,_0,_0,_0.2)] flex flex-col"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="[padding:16px_20px] [border-bottom:1px_solid_#e2e8f0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-gray-900 text-sm">
                  Mô Phỏng 3D AR & Chi Tiết Phiên Đấu Giá
                </span>
              </div>
              <button
                type="button"
                className="[background:none] [border:none] text-slate-500 cursor-pointer p-1 [border-radius:6px] hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setActivePreviewWatch(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
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
