import React, { useState, useEffect } from 'react';
import {
  Gavel,
  ShieldCheck,
  Heart,
  Share2,
  Eye,
  Box,
  Clock,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Truck,
  RotateCw,
  Sparkles,
  X,
  Scan,
  MessageSquare,
} from 'lucide-react';
import HomeHeader from '../../components/headers/HomeHeader';
import Footer from '../../components/footer';
interface SimilarWatch {
  id: string;
  badge: {
    text: string;
    type: 'live' | 'upcoming' | 'buy-now';
  };
  brand: string;
  title: string;
  image: string;
  priceLabel: string;
  price: string;
  usdPrice: string;
  statusLabel: string;
  statusVal: string;
  statusType: 'blue' | 'green';
}

export const AuctionPage: React.FC = () => {
  // 1. Live Countdown Timer State (15m 42s = 942 seconds)
  const [timeLeft, setTimeLeft] = useState(942);
  const [activeTab, setActiveTab] = useState<'certs' | 'specs' | 'history' | 'reviews'>('certs');
  const [viewerMode, setViewerMode] = useState<'photo' | '3d' | 'lidar'>('photo');
  const [selectedThumb, setSelectedThumb] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likedSimilar, setLikedSimilar] = useState<Record<string, boolean>>({});

  // 2. Bidding State
  const [currentPrice, setCurrentPrice] = useState(128500000);
  const [leadingBidder, setLeadingBidder] = useState('Nguyen_Horology');
  const [customBidAmount, setCustomBidAmount] = useState(129500000);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidSuccessToast, setBidSuccessToast] = useState<string | null>(null);

  // 3. 3D Rotation simulation
  const [rotationAngle, setRotationAngle] = useState(0);

  // Countdown timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const formatUSD = (vnd: number) => {
    const usd = Math.round(vnd / 24000);
    return `(≈ $${new Intl.NumberFormat('en-US').format(usd)} USD)`;
  };

  // Quick increment handler
  const handleQuickIncrement = (inc: number) => {
    setCustomBidAmount(currentPrice + inc);
  };

  // Submit Bid Handler
  const handleConfirmBid = () => {
    setCurrentPrice(customBidAmount);
    setLeadingBidder('Bạn (Tài khoản hiện tại)');
    setShowBidModal(false);
    setCustomBidAmount(customBidAmount + 1000000);
    setBidSuccessToast(
      `Đặt giá thành công: ${formatVND(customBidAmount)}! Escrow đã tạm giữ 10% cọc.`,
    );

    setTimeout(() => {
      setBidSuccessToast(null);
    }, 4500);
  };

  // Thumbnails
  const thumbnails = [
    { label: 'Mặt số Bleu Nuit', src: '/images/watches/watch-1.png' },
    { label: 'Bộ máy Calibre 4401', src: '/images/watches/watch-2.png' },
    { label: 'Cạnh vát Bevels Satin', src: '/images/watches/watch-3.png' },
    { label: 'Khóa gập đôi AP', src: '/images/watches/watch-4.png' },
    { label: 'Tem kiểm định RFID Geneva', src: '/images/watches/watch-5.png' },
  ];

  // 4 Similar watches matching exact image details
  const similarWatches: SimilarWatch[] = [
    {
      id: 'patek-nautilus',
      badge: { text: 'LIVE BID', type: 'live' },
      brand: 'PATEK PHILIPPE',
      title: 'Nautilus 5711/1A-010 Mặt Xanh Blue',
      image: '/images/watches/watch-1.png',
      priceLabel: 'Giá hiện tại:',
      price: '192.000.000 đ',
      usdPrice: '(~$8,000 USD)',
      statusLabel: 'Còn lại:',
      statusVal: '12m 40s',
      statusType: 'blue',
    },
    {
      id: 'rolex-daytona',
      badge: { text: 'SẮP DIỄN RA', type: 'upcoming' },
      brand: 'ROLEX COSMOGRAPH',
      title: 'Daytona Panda Cerachrom Bezel...',
      image: '/images/watches/watch-2.png',
      priceLabel: 'Khởi điểm:',
      price: '110.000.000 đ',
      usdPrice: '(~$4,583 USD)',
      statusLabel: 'Bắt đầu sau:',
      statusVal: '02h 15m',
      statusType: 'blue',
    },
    {
      id: 'hublot-sangbleu',
      badge: { text: 'LIVE BID', type: 'live' },
      brand: 'HUBLOT MANUFACTURE',
      title: 'Big Bang Sang Bleu II Titanium Faceted',
      image: '/images/watches/watch-3.png',
      priceLabel: 'Giá hiện tại:',
      price: '88.500.000 đ',
      usdPrice: '(~$3,688 USD)',
      statusLabel: 'Còn lại:',
      statusVal: '18m 02s',
      statusType: 'blue',
    },
    {
      id: 'vacheron-overseas',
      badge: { text: 'MUA ĐỨT', type: 'buy-now' },
      brand: 'VACHERON CONSTANTIN',
      title: 'Overseas Self-Winding Blue Dial...',
      image: '/images/watches/watch-4.png',
      priceLabel: 'Giá niêm yết:',
      price: '135.000.000 đ',
      usdPrice: '(~$5,625 USD)',
      statusLabel: 'Kho hàng:',
      statusVal: 'Sẵn giao 2H',
      statusType: 'green',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_Helvetica,_Arial,_sans-serif]">
      {/* 1. MAIN HEADER (Consistent with Homepage & Marketplace) */}
      <HomeHeader
        logoPath="/images/logo.png"
        onLoginClick={() => window.location.assign('/login')}
        onRegisterClick={() => window.location.assign('/register')}
        onSearch={(query, floor) => {
          const params = new URLSearchParams({ q: query, floor });
          window.location.assign(`/search?${params.toString()}`);
        }}
      />

      {/* Toast notification */}
      {bidSuccessToast && (
        <div className="fixed top-20 right-6 z-[2500] flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold">{bidSuccessToast}</span>
        </div>
      )}

      <main className="max-w-7xl [margin:0_auto] [padding:1.25rem_1rem_3rem_1rem]">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-5 text-[13px] text-slate-500">
          <nav className="flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
            <a
              href="/"
              className="text-slate-500 no-underline [transition:color_0.15s_ease] hover:[color:#ee4d2d]"
            >
              Trang Chủ
            </a>
            <span className="text-slate-300">/</span>
            <a
              href="/search?floor=Sàn+Đấu+Giá+Live"
              className="text-slate-500 no-underline [transition:color_0.15s_ease] hover:[color:#ee4d2d]"
            >
              Sàn Đấu Giá Live 3D
            </a>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 no-underline [transition:color_0.15s_ease] hover:[color:#ee4d2d]">
              Đồng Hồ Cơ Xa Xỉ
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">
              Audemars Piguet Royal Oak Chronograph
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 [padding:0.375rem_0.75rem] bg-white [border:1px_solid_#e2e8f0] rounded-full text-xs font-medium text-slate-600 cursor-pointer [transition:all_0.15s_ease] hover:border-slate-300 hover:bg-slate-100 [&.liked]:text-red-500 [&.liked]:[border-color:#fecaca] [&.liked]:bg-red-50 hover:text-[#f24e1e] transition"
              title="Quay lại Trang Chủ"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Trang Chủ</span>
            </a>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 [padding:0.375rem_0.75rem] bg-white [border:1px_solid_#e2e8f0] rounded-full text-xs font-medium text-slate-600 cursor-pointer [transition:all_0.15s_ease] hover:border-slate-300 hover:bg-slate-100 [&.liked]:text-red-500 [&.liked]:[border-color:#fecaca] [&.liked]:bg-red-50 ${isLiked ? 'liked' : ''}`}
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{isLiked ? 'Đã Lưu' : 'Lưu Lot'}</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 [padding:0.375rem_0.75rem] bg-white [border:1px_solid_#e2e8f0] rounded-full text-xs font-medium text-slate-600 cursor-pointer [transition:all_0.15s_ease] hover:border-slate-300 hover:bg-slate-100 [&.liked]:text-red-500 [&.liked]:[border-color:#fecaca] [&.liked]:bg-red-50"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Đã sao chép liên kết phiên đấu giá!');
                }
              }}
            >
              <Share2 className="w-4 h-4" />
              <span>Chia Sẻ</span>
            </button>
          </div>
        </div>

        {/* =========================================================
            2. HERO SECTION: 3D VIEWER + BID TERMINAL
        ========================================================= */}
        <div className="grid [grid-template-columns:1.1fr_1fr] gap-8 mb-10 max-[1024px]:[grid-template-columns:1fr] max-[1024px]:gap-6">
          {/* LEFT: 3D INTERACTIVE VIEWER & GALLERY */}
          <div className="[background:#ffffff] rounded-2xl [border:1px_solid_#e2e8f0] p-5 shadow-sm">
            <div className="relative w-full [aspect-ratio:1_/_0.95] [background:radial-gradient(circle_at_center,_#f8fafc_0%,_#edf2f7_100%)] rounded-xl overflow-hidden flex items-center justify-center [border:1px_solid_#f1f5f9] select-none">
              {/* Badges on top of viewer */}
              <div className="absolute top-3.5 left-3.5 flex flex-col gap-2 z-5">
                <span className="inline-flex items-center gap-[0.4rem] bg-red-500 text-white text-[11px] font-bold [padding:0.25rem_0.6rem] rounded-full [letter-spacing:0.05em] [box-shadow:0_2px_8px_rgba(239,_68,_68,_0.4)]">
                  <span className="w-1.5 h-1.5 bg-white rounded-full [animation:pulseAnim_1.4s_infinite]"></span>
                  LIVE BID
                </span>
                <span className="inline-flex items-center gap-[0.35rem] [background:rgba(15,_23,_42,_0.78)] [backdrop-filter:blur(6px)] text-white text-[11px] font-semibold [padding:0.25rem_0.55rem] rounded-full w-fit">
                  <Scan className="w-3.5 h-3.5 text-cyan-400" />
                  3D LiDAR Có Sẵn
                </span>
              </div>

              {/* Main Product Image with simulated 3D rotation */}
              <img
                src={thumbnails[selectedThumb].src}
                alt="Audemars Piguet Royal Oak Chrono"
                className="[max-width:82%] [max-height:82%] object-contain [transition:transform_0.2s_cubic-bezier(0.2,_0,_0,_1)] [filter:drop-shadow(0_15px_25px_rgba(0,_0,_0,_0.12))]"
                style={{
                  transform: `rotate(${rotationAngle}deg) scale(${viewerMode === '3d' ? 1.08 : 1})`,
                }}
              />

              {/* LiDAR Holographic Overlay (if mode = lidar) */}
              {viewerMode === 'lidar' && (
                <div className="absolute [inset:0] pointer-events-none [background-image:linear-gradient(rgba(6,_182,_212,_0.15)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(6,_182,_212,_0.15)_1px,_transparent_1px)] [background-size:24px_24px]">
                  <div className="absolute top-0 left-0 right-0 h-[3px] [background:linear-gradient(90deg,_transparent,_#06b6d4,_#38bdf8,_transparent)] [box-shadow:0_0_15px_#06b6d4,_0_0_30px_#06b6d4] [animation:lidarScanAnim_2.8s_ease-in-out_infinite_alternate]"></div>
                  <div className="absolute bottom-3.5 left-3.5 [background:rgba(15,_23,_42,_0.85)] [backdrop-filter:blur(8px)] [color:#38bdf8] font-mono text-[11px] [padding:0.35rem_0.65rem] rounded-md [border:1px_solid_rgba(56,_189,_248,_0.4)] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>LIDAR 3D MATRIX: SAI SỐ 0.0018mm [PASS]</span>
                  </div>
                </div>
              )}

              {/* 3D Interactive badge */}
              {viewerMode === '3d' && (
                <div className="absolute bottom-3.5 left-3.5 [background:rgba(15,_23,_42,_0.85)] [backdrop-filter:blur(8px)] [color:#38bdf8] font-mono text-[11px] [padding:0.35rem_0.65rem] rounded-md [border:1px_solid_rgba(56,_189,_248,_0.4)] flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>KÉO HOẶC BẤM ĐỂ XOAY 360° • KHÔNG GIAN 3 CHIỀU</span>
                </div>
              )}
            </div>

            {/* Viewer Mode Switcher */}
            <div className="flex items-center justify-center gap-2 mt-4 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                className={`[flex:1] inline-flex items-center justify-center gap-1.5 [padding:0.5rem_0.75rem] text-xs font-semibold text-slate-500 rounded-lg [border:none] [background:transparent] cursor-pointer [transition:all_0.15s_ease] whitespace-nowrap hover:text-slate-900 [&.active]:bg-white [&.active]:text-slate-900 [&.active]:[box-shadow:0_2px_4px_rgba(0,_0,_0,_0.06)] ${viewerMode === 'photo' ? 'active' : ''}`}
                onClick={() => setViewerMode('photo')}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ảnh Studio HD</span>
              </button>
              <button
                type="button"
                className={`[flex:1] inline-flex items-center justify-center gap-1.5 [padding:0.5rem_0.75rem] text-xs font-semibold text-slate-500 rounded-lg [border:none] [background:transparent] cursor-pointer [transition:all_0.15s_ease] whitespace-nowrap hover:text-slate-900 [&.active]:bg-white [&.active]:text-slate-900 [&.active]:[box-shadow:0_2px_4px_rgba(0,_0,_0,_0.06)] ${viewerMode === '3d' ? 'active' : ''}`}
                onClick={() => {
                  setViewerMode('3d');
                  setRotationAngle((prev) => prev + 45);
                }}
              >
                <Box className="w-3.5 h-3.5 text-blue-600" />
                <span>Xoay 360° 3D Mesh</span>
              </button>
              <button
                type="button"
                className={`[flex:1] inline-flex items-center justify-center gap-1.5 [padding:0.5rem_0.75rem] text-xs font-semibold text-slate-500 rounded-lg [border:none] [background:transparent] cursor-pointer [transition:all_0.15s_ease] whitespace-nowrap hover:text-slate-900 [&.active]:bg-white [&.active]:text-slate-900 [&.active]:[box-shadow:0_2px_4px_rgba(0,_0,_0,_0.06)] ${viewerMode === 'lidar' ? 'active' : ''}`}
                onClick={() => setViewerMode('lidar')}
              >
                <Scan className="w-3.5 h-3.5 text-cyan-600" />
                <span>Quét LiDAR Hologram</span>
              </button>
            </div>

            {/* Gallery Thumbnails */}
            <div className="grid [grid-template-columns:repeat(5,_1fr)] gap-2.5 mt-4">
              {thumbnails.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`aspect-square [background:#f8fafc] [border:2px_solid_#e2e8f0] rounded-lg p-1 cursor-pointer overflow-hidden flex items-center justify-center [transition:all_0.15s_ease] hover:border-slate-300 [&.active]:border-blue-600 [&.active]:bg-blue-50 ${selectedThumb === idx ? 'active' : ''}`}
                  onClick={() => setSelectedThumb(idx)}
                  title={item.label}
                >
                  <img
                    src={item.src}
                    alt={item.label}
                    className="[max-width:90%] [max-height:90%] object-contain"
                  />
                </button>
              ))}
            </div>

            {/* Vault Storage Assurance Card */}
            <div className="mt-5 [padding:0.875rem_1rem] [background:#f8fafc] [border:1px_solid_#e2e8f0] rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="[width:40px] [height:40px] rounded-full [background:#1e3a8a] text-white flex items-center justify-center font-bold text-[15px] [flex-shrink:0]">
                  GV
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-slate-900 m-0">
                    Geneva Vault Horology Store
                  </h4>
                  <p className="text-[11px] text-slate-500 m-0">
                    <span className="text-amber-500 font-bold">★ 4.99/5</span> • 184 phiên đấu giá
                    hoàn tất
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-blue-600 [background:#eff6ff] [border:1px_solid_#bfdbfe] [padding:0.25rem_0.5rem] rounded-full font-semibold whitespace-nowrap">
                <span>Kho Bảo Mật Q.1 (TP.HCM)</span>
              </div>
            </div>
          </div>

          {/* RIGHT: BID TERMINAL & VALUE PROPOSITION */}
          <div className="flex flex-col gap-5">
            {/* Title & Reference */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold [letter-spacing:0.08em] text-blue-600 uppercase">
                  AUDEMARS PIGUET • LE BRASSUS
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500 [background:#f1f5f9] [padding:0.15rem_0.5rem] rounded">
                  LOT #AP-2025-X09
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 leading-snug m-0">
                Audemars Piguet Royal Oak Chronograph 41mm Selfwinding
              </h1>
              <p className="text-[13px] text-slate-500 m-0">
                Ref: 26331ST.OO.1220ST.01 • Thép không gỉ 904L • Mặt Số Xanh Bleu Nuit Tapisserie
              </p>
            </div>

            {/* Countdown Banner */}
            <div className="[background:linear-gradient(135deg,_#0f172a_0%,_#1e293b_100%)] text-white rounded-xl [padding:1rem_1.25rem] flex items-center justify-between [box-shadow:0_4px_12px_rgba(15,_23,_42,_0.15)]">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] uppercase [letter-spacing:0.06em] text-slate-400 font-semibold">
                  Thời Gian Còn Lại:
                </span>
                <span className="font-mono text-[26px] font-extrabold [color:#f87171] [letter-spacing:0.05em]">
                  {formatTimer(timeLeft)}
                </span>
              </div>
              <div className="text-right flex flex-col gap-1">
                <span className="text-sm font-bold text-white">42 lượt trả giá</span>
                <span className="text-[11px] [color:#38bdf8] flex items-center gap-[0.35rem] justify-end">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  1.428 người đang theo dõi
                </span>
              </div>
            </div>

            {/* Price & Terminal Box */}
            <div className="[background:#ffffff] [border:1px_solid_#e2e8f0] [border-radius:0.875rem] p-5 [box-shadow:0_2px_8px_rgba(0,_0,_0,_0.04)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-slate-600">
                  Giá Đặt Hiện Tại (Leading Bid):
                </span>
                <span className="text-[11px] font-semibold text-blue-600 [background:#eff6ff] [padding:0.2rem_0.5rem] rounded-full [border:1px_solid_#dbeafe]">
                  Live FX: $1 = 24.000đ
                </span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap mb-3">
                <span className="[font-size:32px] font-black text-red-500 leading-none">
                  {formatVND(currentPrice)}
                </span>
                <span className="text-[15px] font-bold text-blue-600">
                  {formatUSD(currentPrice)}
                </span>
              </div>

              <div className="text-xs text-slate-500 mb-4">
                Khởi điểm: <strong>95.000.000 đ</strong> (≈ $3,958 USD) • Bước giá tối thiểu:{' '}
                <strong>+1.000.000 đ</strong>
              </div>

              {/* Leading Bidder */}
              <div className="[background:#f8fafc] rounded-lg [padding:0.5rem_0.75rem] text-xs text-slate-600 flex items-center justify-between mb-5 [border-left:3px_solid_#10b981]">
                <span>Người đang giữ giá:</span>
                <span className="font-bold text-slate-900">{leadingBidder} 👑</span>
              </div>

              {/* Quick Bid Increment Buttons */}
              <div className="flex flex-col gap-3">
                <div className="grid [grid-template-columns:repeat(4,_1fr)] gap-2">
                  <button
                    type="button"
                    className="[padding:0.5rem_0.25rem] text-xs font-bold [color:#1e3a8a] bg-blue-50 [border:1px_solid_#bfdbfe] rounded-lg cursor-pointer [transition:all_0.15s_ease] text-center hover:bg-blue-100 hover:[border-color:#93c5fd]"
                    onClick={() => handleQuickIncrement(1000000)}
                  >
                    +1.000.000 đ
                  </button>
                  <button
                    type="button"
                    className="[padding:0.5rem_0.25rem] text-xs font-bold [color:#1e3a8a] bg-blue-50 [border:1px_solid_#bfdbfe] rounded-lg cursor-pointer [transition:all_0.15s_ease] text-center hover:bg-blue-100 hover:[border-color:#93c5fd]"
                    onClick={() => handleQuickIncrement(2000000)}
                  >
                    +2.000.000 đ
                  </button>
                  <button
                    type="button"
                    className="[padding:0.5rem_0.25rem] text-xs font-bold [color:#1e3a8a] bg-blue-50 [border:1px_solid_#bfdbfe] rounded-lg cursor-pointer [transition:all_0.15s_ease] text-center hover:bg-blue-100 hover:[border-color:#93c5fd]"
                    onClick={() => handleQuickIncrement(5000000)}
                  >
                    +5.000.000 đ
                  </button>
                  <button
                    type="button"
                    className="[padding:0.5rem_0.25rem] text-xs font-bold [color:#1e3a8a] bg-blue-50 [border:1px_solid_#bfdbfe] rounded-lg cursor-pointer [transition:all_0.15s_ease] text-center hover:bg-blue-100 hover:[border-color:#93c5fd]"
                    onClick={() => handleQuickIncrement(10000000)}
                  >
                    +10.000.000 đ
                  </button>
                </div>

                {/* Custom Bid Input */}
                <div className="flex items-center [border:2px_solid_#e2e8f0] rounded-lg overflow-hidden bg-white [transition:border-color_0.15s_ease] focus-within:[border-color:#ee4d2d]">
                  <span className="[padding:0.75rem_1rem] bg-slate-50 text-[13px] font-bold text-slate-500 [border-right:1px_solid_#e2e8f0]">
                    Mức giá bạn muốn đặt
                  </span>
                  <input
                    type="text"
                    className="[flex:1] [padding:0.75rem_1rem] [border:none] [font-size:16px] font-extrabold text-slate-900 [outline:none]"
                    value={formatVND(customBidAmount)}
                    readOnly
                  />
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-col gap-2.5 mt-2">
                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 [padding:0.875rem_1.5rem] [background:linear-gradient(135deg,_#ff6b35_0%,_#ee4d2d_100%)] text-white [border:none] rounded-lg text-[15px] font-extrabold cursor-pointer [box-shadow:0_4px_14px_rgba(238,_77,_45,_0.35)] [transition:all_0.15s_ease] hover:[transform:translateY(-1px)] hover:[box-shadow:0_6px_20px_rgba(238,_77,_45,_0.45)]"
                    onClick={() => setShowBidModal(true)}
                  >
                    <Gavel className="w-5 h-5" />
                    <span>ĐẶT GIÁ NGAY • {formatVND(customBidAmount)}</span>
                  </button>

                  <button
                    type="button"
                    className="w-full flex items-center justify-center gap-2 [padding:0.75rem_1.5rem] bg-white text-slate-900 [border:1.5px_solid_#cbd5e1] rounded-lg text-sm font-bold cursor-pointer [transition:all_0.15s_ease] hover:border-slate-900 hover:bg-slate-50"
                    onClick={() => {
                      alert('Tính năng mua đứt đang kích hoạt hợp đồng Escrow.');
                    }}
                  >
                    <span>Mua Đứt Ngay (Buy Out): 195.000.000 đ</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal mt-2 text-center">
                  🛡️ Tiền cọc yêu cầu: <strong>12.850.000 ₫</strong> (10%). Ký quỹ an toàn qua cổng
                  PayOS / Stripe Escrow. Tự động hoàn tiền 100% trong 30 giây nếu bị trả giá cao
                  hơn.
                </p>
              </div>
            </div>

            {/* Shipping & Authenticity Policies (Matches exact top-right cards from Image 1) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3.5 [padding:0.875rem_1rem] bg-white [border:1px_solid_#e2e8f0] rounded-xl [box-shadow:0_1px_2px_rgba(0,_0,_0,_0.04)]">
                <div className="[width:36px] [height:36px] rounded-full flex items-center justify-center [flex-shrink:0] [&.red]:bg-red-50 [&.red]:text-red-500 [&.blue]:bg-blue-50 [&.blue]:text-blue-600 red">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex flex-col [gap:0.2rem]">
                  <h4 className="text-[13px] font-bold text-slate-900 m-0">
                    Vận chuyển Hỏa Tốc GHN Express Bảo Hiểm 100%
                  </h4>
                  <p className="text-xs text-slate-500 [line-height:1.45] m-0">
                    Giao 2H tại TP.HCM & Hà Nội bằng thùng bảo mật chống sốc kèm camera ghi hình
                    niêm phong mở hộp.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 [padding:0.875rem_1rem] bg-white [border:1px_solid_#e2e8f0] rounded-xl [box-shadow:0_1px_2px_rgba(0,_0,_0,_0.04)]">
                <div className="[width:36px] [height:36px] rounded-full flex items-center justify-center [flex-shrink:0] [&.red]:bg-red-50 [&.red]:text-red-500 [&.blue]:bg-blue-50 [&.blue]:text-blue-600 blue">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex flex-col [gap:0.2rem]">
                  <h4 className="text-[13px] font-bold text-slate-900 m-0">
                    Chính Sách Hoàn Tiền 200% & Đổi Trả 7 Ngày
                  </h4>
                  <p className="text-xs text-slate-500 [line-height:1.45] m-0">
                    Khách hàng được quyền đồng kiểm cùng chuyên gia; hoàn tiền gấp đôi ngay lập tức
                    nếu sai lệch mô hình 3D.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            3. TABS SECTION (Exact match to Image 1)
        ========================================================= */}
        <section className="bg-white [border:1px_solid_#e2e8f0] rounded-2xl overflow-hidden mb-10 [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.04)]">
          <div className="flex items-center [border-bottom:1px_solid_#e2e8f0] bg-slate-50 [overflow-x:auto]">
            <button
              type="button"
              className={`inline-flex items-center gap-2 [padding:1rem_1.5rem] [font-size:13.5px] font-semibold text-slate-500 [border:none] [background:transparent] cursor-pointer whitespace-nowrap [transition:all_0.15s_ease] [border-bottom:2px_solid_transparent] hover:text-slate-900 hover:bg-slate-100 [&.active]:text-slate-900 [&.active]:font-bold [&.active]:bg-white [&.active]:[border-bottom:2px_solid_#ee4d2d] [&.active_.auction-tab-icon]:[color:#ee4d2d] ${activeTab === 'certs' ? 'active' : ''}`}
              onClick={() => setActiveTab('certs')}
            >
              <ShieldCheck className="w-[18px] h-[18px]" />
              <span>Hồ Sơ Giám Định 3D & Vật Lý</span>
            </button>

            <button
              type="button"
              className={`inline-flex items-center gap-2 [padding:1rem_1.5rem] [font-size:13.5px] font-semibold text-slate-500 [border:none] [background:transparent] cursor-pointer whitespace-nowrap [transition:all_0.15s_ease] [border-bottom:2px_solid_transparent] hover:text-slate-900 hover:bg-slate-100 [&.active]:text-slate-900 [&.active]:font-bold [&.active]:bg-white [&.active]:[border-bottom:2px_solid_#ee4d2d] [&.active_.auction-tab-icon]:[color:#ee4d2d] ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              <Sliders className="w-[18px] h-[18px]" />
              <span>Thông Số Kỹ Thuật Chi Tiết</span>
            </button>

            <button
              type="button"
              className={`inline-flex items-center gap-2 [padding:1rem_1.5rem] [font-size:13.5px] font-semibold text-slate-500 [border:none] [background:transparent] cursor-pointer whitespace-nowrap [transition:all_0.15s_ease] [border-bottom:2px_solid_transparent] hover:text-slate-900 hover:bg-slate-100 [&.active]:text-slate-900 [&.active]:font-bold [&.active]:bg-white [&.active]:[border-bottom:2px_solid_#ee4d2d] [&.active_.auction-tab-icon]:[color:#ee4d2d] ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Clock className="w-[18px] h-[18px]" />
              <span>Lịch Sử Đấu Giá (19 lượt)</span>
            </button>

            <button
              type="button"
              className={`inline-flex items-center gap-2 [padding:1rem_1.5rem] [font-size:13.5px] font-semibold text-slate-500 [border:none] [background:transparent] cursor-pointer whitespace-nowrap [transition:all_0.15s_ease] [border-bottom:2px_solid_transparent] hover:text-slate-900 hover:bg-slate-100 [&.active]:text-slate-900 [&.active]:font-bold [&.active]:bg-white [&.active]:[border-bottom:2px_solid_#ee4d2d] [&.active_.auction-tab-icon]:[color:#ee4d2d] ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <MessageSquare className="w-[18px] h-[18px]" />
              <span>Đánh Giá Collectors (48)</span>
            </button>
          </div>

          <div className="p-7">
            {/* TAB 1: 3D CERTIFICATES & TIMIEGRAPHER (Matches Image 1) */}
            {activeTab === 'certs' && (
              <div>
                {/* 3 Certification Cards */}
                <div className="grid [grid-template-columns:repeat(3,_1fr)] gap-5 mb-8 max-[900px]:[grid-template-columns:1fr]">
                  {/* Card 1 */}
                  <div className="bg-slate-50 [border:1px_solid_#e2e8f0] rounded-xl p-5 flex flex-col justify-between gap-3.5 [transition:all_0.2s_ease] hover:bg-white hover:border-slate-300 hover:[box-shadow:0_4px_12px_rgba(0,_0,_0,_0.05)]">
                    <div className="flex items-center gap-2">
                      <Scan className="w-5 h-5 text-blue-600 [flex-shrink:0]" />
                      <h4 className="text-sm font-bold text-blue-600 m-0">
                        Quét 3D LiDAR Hologram
                      </h4>
                    </div>
                    <p className="[font-size:12.5px] text-slate-600 leading-normal m-0">
                      Tỷ lệ sai số dưới 0.002mm so với bản vẽ gốc của Audemars Piguet Le Brassus.
                      Không phát hiện dấu hiệu can thiệp đánh bóng quá mức (Unpolished bevels).
                    </p>
                    <div className="text-xs font-semibold text-slate-900 pt-2 [border-top:1px_dashed_#e2e8f0]">
                      Mã kiểm định: <strong>LDR-CHRONO-2025-X09</strong>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-slate-50 [border:1px_solid_#e2e8f0] rounded-xl p-5 flex flex-col justify-between gap-3.5 [transition:all_0.2s_ease] hover:bg-white hover:border-slate-300 hover:[box-shadow:0_4px_12px_rgba(0,_0,_0,_0.05)]">
                    <div className="flex items-center gap-2">
                      <RotateCw className="w-5 h-5 text-blue-600 [flex-shrink:0]" />
                      <h4 className="text-sm font-bold text-blue-600 m-0">
                        Tem Niêm Phong Chống Mở Nắp Lưng
                      </h4>
                    </div>
                    <p className="[font-size:12.5px] text-slate-600 leading-normal m-0">
                      Tem RFID mã hóa micro-mesh được kiểm định bởi Viện Đồng Hồ Cao Cấp Geneva. Bộ
                      máy được bảo hiểm toàn vẹn 100% nguyên bản từ xưởng.
                    </p>
                    <div className="text-xs font-semibold text-slate-900 pt-2 [border-top:1px_dashed_#e2e8f0]">
                      Trạng thái: <strong>Nguyên tem 100% (Intact)</strong>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-slate-50 [border:1px_solid_#e2e8f0] rounded-xl p-5 flex flex-col justify-between gap-3.5 [transition:all_0.2s_ease] hover:bg-white hover:border-slate-300 hover:[box-shadow:0_4px_12px_rgba(0,_0,_0,_0.05)]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600 [flex-shrink:0]" />
                      <h4 className="text-sm font-bold text-blue-600 m-0">
                        Chứng Chỉ NFT On-Chain Provenance
                      </h4>
                    </div>
                    <p className="[font-size:12.5px] text-slate-600 leading-normal m-0">
                      Hợp đồng thông minh ghi nhận lịch sử sở hữu, hóa đơn mua ban đầu tại Boutique
                      Hong Kong 2022 và các mốc bảo dưỡng định kỳ 24 tháng.
                    </p>
                    <div className="text-xs font-semibold text-slate-900 pt-2 [border-top:1px_dashed_#e2e8f0]">
                      <a
                        href="#blockchain"
                        className="text-blue-600 no-underline font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        <span>Tra cứu Etherscan / Polygon Contract</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Timegrapher Diagnostics Section (Matches Image 1) */}
                <div className="mt-6">
                  <h3 className="text-[15px] font-extrabold text-slate-900 [margin:0_0_1rem_0]">
                    Bảng Đo Đạc Máy Thử Nhịp (Timegrapher Diagnostics)
                  </h3>

                  <div className="grid [grid-template-columns:repeat(4,_1fr)] gap-4 max-[900px]:[grid-template-columns:repeat(2,_1fr)] max-[600px]:[grid-template-columns:1fr]">
                    {/* Metric 1 */}
                    <div className="bg-blue-50 [border:1px_solid_#dbeafe] rounded-xl p-5 flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-500 font-medium m-0">
                          Giá đặt hiện tại:
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 bg-white [padding:0.15rem_0.4rem] rounded-full [border:1px_solid_#bfdbfe]">
                          Live FX: $1 = 24.000đ
                        </span>
                      </div>
                      <p className="text-[26px] font-black text-slate-900 [line-height:1.1] m-0 [&.red]:text-red-500 [&.blue]:text-blue-600 red">
                        128.500.000 đ
                      </p>
                      <p className="text-[13px] font-bold text-blue-600 m-0">(≈ $5,354 USD)</p>
                      <p className="text-[11px] text-slate-500 m-0">
                        Khởi điểm: 95.000.000 đ • ≈ $3,958 USD
                      </p>
                    </div>

                    {/* Metric 2 */}
                    <div className="bg-blue-50 [border:1px_solid_#dbeafe] rounded-xl p-5 flex flex-col justify-between gap-2">
                      <span className="text-xs text-slate-500 font-medium m-0">
                        Biên độ dao động (Amplitude):
                      </span>
                      <p className="text-[26px] font-black text-slate-900 [line-height:1.1] m-0 [&.red]:text-red-500 [&.blue]:text-blue-600">
                        298°
                      </p>
                      <p className="text-[11px] text-slate-500 m-0">Mức lý tưởng (280° - 310°)</p>
                    </div>

                    {/* Metric 3 */}
                    <div className="bg-blue-50 [border:1px_solid_#dbeafe] rounded-xl p-5 flex flex-col justify-between gap-2">
                      <span className="text-xs text-slate-500 font-medium m-0">
                        Lỗi nhịp (Beat Error):
                      </span>
                      <p className="text-[26px] font-black text-slate-900 [line-height:1.1] m-0 [&.red]:text-red-500 [&.blue]:text-blue-600">
                        0.1 ms
                      </p>
                      <p className="text-[11px] text-slate-500 m-0">Cực kỳ hoàn hảo (&lt;0.5ms)</p>
                    </div>

                    {/* Metric 4 */}
                    <div className="bg-blue-50 [border:1px_solid_#dbeafe] rounded-xl p-5 flex flex-col justify-between gap-2">
                      <span className="text-xs text-slate-500 font-medium m-0">
                        Kiểm tra áp suất nước:
                      </span>
                      <p className="text-[26px] font-black text-slate-900 [line-height:1.1] m-0 [&.red]:text-red-500 [&.blue]:text-blue-600 blue">
                        5.0 BAR (PASS)
                      </p>
                      <p className="text-[11px] text-slate-500 m-0">Chống nước 50m an toàn</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TECHNICAL SPECIFICATIONS */}
            {activeTab === 'specs' && (
              <table className="w-full [border-collapse:collapse] [&_tr]:[border-bottom:1px_solid_#f1f5f9] [&_tr:last-child]:[border-bottom:none] [&_td]:[padding:0.875rem_0.5rem] [&_td]:text-[13px] [&_td.label-col]:[width:30%] [&_td.label-col]:text-slate-500 [&_td.label-col]:font-medium [&_td.val-col]:text-slate-900 [&_td.val-col]:font-semibold">
                <tbody>
                  <tr>
                    <td className="label-col">Thương hiệu</td>
                    <td className="val-col">Audemars Piguet (Le Brassus, Thụy Sĩ)</td>
                  </tr>
                  <tr>
                    <td className="label-col">Bộ sưu tập</td>
                    <td className="val-col">Royal Oak Chronograph 41mm</td>
                  </tr>
                  <tr>
                    <td className="label-col">Mã tham chiếu (Ref)</td>
                    <td className="val-col">26331ST.OO.1220ST.01</td>
                  </tr>
                  <tr>
                    <td className="label-col">Bộ máy (Calibre)</td>
                    <td className="val-col">In-house Manufacture Calibre 4401 Automatic Flyback</td>
                  </tr>
                  <tr>
                    <td className="label-col">Thời gian trữ cót</td>
                    <td className="val-col">70 giờ liên tục (Tần số 28.800 vph - 4Hz)</td>
                  </tr>
                  <tr>
                    <td className="label-col">Chất liệu thân vỏ & dây</td>
                    <td className="val-col">Thép không gỉ 904L chải xước satin và vát cạnh bóng</td>
                  </tr>
                  <tr>
                    <td className="label-col">Mặt số (Dial)</td>
                    <td className="val-col">
                      Họa tiết vân Grande Tapisserie xanh Bleu Nuit, cọc số vàng trắng
                    </td>
                  </tr>
                  <tr>
                    <td className="label-col">Mặt kính & nắp lưng</td>
                    <td className="val-col">
                      Sapphire nguyên khối chống lóa hai mặt, tem RFID nắp lưng
                    </td>
                  </tr>
                  <tr>
                    <td className="label-col">Kháng nước</td>
                    <td className="val-col">
                      50m / 5 BAR (Đã thử nghiệm áp suất đạt tiêu chuẩn PASS)
                    </td>
                  </tr>
                  <tr>
                    <td className="label-col">Phụ kiện đi kèm</td>
                    <td className="val-col">
                      Full Box hộp gỗ AP, thẻ bảo hành điện tử NFC, chứng thư NFT
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* TAB 3: BID HISTORY */}
            {activeTab === 'history' && (
              <table className="w-full [border-collapse:collapse] [&_th]:text-left [&_th]:p-3 [&_th]:text-xs [&_th]:font-bold [&_th]:text-slate-500 [&_th]:[border-bottom:1px_solid_#e2e8f0] [&_th]:bg-slate-50 [&_td]:[padding:0.875rem_0.75rem] [&_td]:text-[13px] [&_td]:[border-bottom:1px_solid_#f1f5f9]">
                <thead>
                  <tr>
                    <th>Người tham gia</th>
                    <th>Mức giá đặt</th>
                    <th>Thời gian</th>
                    <th>Xác thực Escrow</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-bold text-slate-900">Nguyen_Horology</td>
                    <td className="font-bold text-red-600">128.500.000 đ</td>
                    <td className="text-slate-500">14:41:20</td>
                    <td>
                      <span className="text-emerald-600 font-semibold">Đã khóa cọc 10%</span>
                    </td>
                    <td>
                      <span className="text-emerald-600 font-bold">Dẫn đầu 👑</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Collector_SG_01</td>
                    <td className="font-semibold text-slate-800">127.500.000 đ</td>
                    <td className="text-slate-500">14:38:05</td>
                    <td>
                      <span className="text-slate-600">Đã khóa cọc 10%</span>
                    </td>
                    <td>
                      <span className="text-slate-400">Bị vượt giá</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Pham_Gia_Bao</td>
                    <td className="font-semibold text-slate-800">125.000.000 đ</td>
                    <td className="text-slate-500">14:30:12</td>
                    <td>
                      <span className="text-slate-600">Đã khóa cọc 10%</span>
                    </td>
                    <td>
                      <span className="text-slate-400">Bị vượt giá</span>
                    </td>
                  </tr>
                  <tr>
                    <td>WatchLover99</td>
                    <td className="font-semibold text-slate-800">120.000.000 đ</td>
                    <td className="text-slate-500">14:15:44</td>
                    <td>
                      <span className="text-slate-600">Đã khóa cọc 10%</span>
                    </td>
                    <td>
                      <span className="text-slate-400">Bị vượt giá</span>
                    </td>
                  </tr>
                  <tr>
                    <td>Luxury_Bidder_HN</td>
                    <td className="font-semibold text-slate-800">110.000.000 đ</td>
                    <td className="text-slate-500">13:58:02</td>
                    <td>
                      <span className="text-slate-600">Đã khóa cọc 10%</span>
                    </td>
                    <td>
                      <span className="text-slate-400">Bị vượt giá</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* TAB 4: REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-black text-amber-500">4.98 / 5</div>
                  <div>
                    <div className="flex text-amber-500">★★★★★</div>
                    <p className="text-xs text-slate-500 m-0">
                      Dựa trên 48 đánh giá của các nhà sưu tập đã hoàn tất nhận hàng và đối chiếu 3D
                    </p>
                  </div>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900">
                      Dr. Hoàng Vũ (Collector Hà Nội)
                    </span>
                    <span className="text-xs text-slate-400">2 ngày trước</span>
                  </div>
                  <div className="text-xs text-amber-500 mb-1">
                    ★★★★★ (Đã đồng kiểm GHN Express)
                  </div>
                  <p className="text-xs text-slate-600 m-0">
                    Hiện vật đúng từng vết vát bevels như ảnh quét LiDAR 3D. Đồng hồ chạy chuẩn
                    0.1ms Beat Error, dịch vụ vận chuyển thùng chống sốc rất chuyên nghiệp.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================
            4. SIMILAR / SAME AUCTION SESSION SECTION (Matches Image 1, 2, 3)
        ========================================================= */}
        <section className="mt-12 [margin-bottom:3.5rem]">
          <div className="flex items-end justify-between mb-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[22px] font-extrabold text-slate-900 m-0">
                Vật Phẩm Tương Tự & Cùng Phiên Đấu Giá
              </h2>
              <p className="text-[13px] text-slate-500 m-0">
                Các cỗ máy cơ vi cơ học danh giá đã qua kiểm định LiDAR 3D nghiêm ngặt
              </p>
            </div>

            <a
              href="/search?floor=Sàn+Đấu+Giá+Live"
              className="text-[13px] font-bold text-blue-600 no-underline inline-flex items-center gap-1 [transition:gap_0.15s_ease] hover:gap-2 hover:underline"
            >
              <span>Xem tất cả 42 lot</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid [grid-template-columns:repeat(4,_1fr)] gap-5 max-[1024px]:[grid-template-columns:repeat(2,_1fr)] max-[580px]:[grid-template-columns:1fr]">
            {similarWatches.map((item) => {
              const liked = likedSimilar[item.id] || false;
              return (
                <div
                  key={item.id}
                  className="bg-white [border:1px_solid_#e2e8f0] [border-radius:0.875rem] overflow-hidden flex flex-col [transition:all_0.2s_ease] relative [box-shadow:0_1px_3px_rgba(0,_0,_0,_0.04)] hover:[transform:translateY(-3px)] hover:border-slate-300 hover:[box-shadow:0_10px_20px_rgba(0,_0,_0,_0.08)] hover:[&_.watch-card-img]:[transform:scale(1.05)]"
                >
                  {/* Top Badge */}
                  <span
                    className={`absolute top-2.5 left-2.5 text-[10px] font-extrabold [padding:0.2rem_0.5rem] rounded [letter-spacing:0.04em] [z-index:2] [&.live]:bg-red-500 [&.live]:text-white [&.upcoming]:bg-blue-600 [&.upcoming]:text-white [&.buy-now]:bg-slate-600 [&.buy-now]:text-white ${item.badge.type}`}
                  >
                    {item.badge.text}
                  </span>

                  {/* Favorite Button */}
                  <button
                    type="button"
                    className={`absolute top-2.5 right-2.5 [width:28px] [height:28px] rounded-full [background:rgba(255,_255,_255,_0.9)] [backdrop-filter:blur(4px)] [border:1px_solid_#e2e8f0] flex items-center justify-center text-slate-500 cursor-pointer [z-index:2] [transition:all_0.15s_ease] hover:text-red-500 hover:[background:#ffffff] [&.liked]:text-red-500 [&.liked]:[fill:#ef4444] ${liked ? 'liked' : ''}`}
                    onClick={() => setLikedSimilar((prev) => ({ ...prev, [item.id]: !liked }))}
                    aria-label="Thêm vào yêu thích"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>

                  {/* Image with 3D tag */}
                  <div className="relative w-full aspect-square bg-slate-50 overflow-hidden flex items-center justify-center">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="[width:82%] [height:82%] object-contain [transition:transform_0.25s_ease]"
                    />
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 [background:rgba(255,_255,_255,_0.92)] [backdrop-filter:blur(4px)] [border:1px_solid_#e2e8f0] [padding:0.2rem_0.45rem] rounded [font-size:10.5px] font-bold [color:#1e3a8a]">
                      <Scan className="w-3 h-3 text-blue-600" />
                      <span>3D Có sẵn</span>
                    </span>
                  </div>

                  {/* Info Area */}
                  <div className="p-3.5 flex flex-col [flex:1] justify-between gap-3">
                    <div>
                      <p className="[font-size:10.5px] font-extrabold text-slate-500 uppercase [letter-spacing:0.05em] m-0">
                        {item.brand}
                      </p>
                      <h4 className="[font-size:13.5px] font-bold text-slate-900 [line-height:1.35] [margin:0.2rem_0_0_0] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-end justify-between gap-2 pt-2 [border-top:1px_solid_#f1f5f9]">
                      <div className="flex flex-col">
                        <span className="[font-size:10.5px] text-slate-500 m-0">
                          {item.priceLabel}
                        </span>
                        <p
                          className={`[font-size:17px] font-black text-red-500 m-0 [&.black]:text-slate-900 ${item.badge.type === 'upcoming' ? 'black' : ''}`}
                        >
                          {item.price}
                        </p>
                        <span className="[font-size:10.5px] font-semibold text-blue-600 m-0">
                          {item.usdPrice}
                        </span>
                      </div>

                      <div
                        className={`[padding:0.25rem_0.5rem] rounded-md text-[11px] font-bold text-center flex flex-col items-center justify-center [min-width:60px] [&.blue]:bg-blue-50 [&.blue]:text-blue-600 [&.green]:[background-color:#ecfdf5] [&.green]:text-emerald-600 [&_.pill-sub]:[font-size:9px] [&_.pill-sub]:font-medium [&_.pill-sub]:[opacity:0.8] ${item.statusType}`}
                      >
                        <span className="pill-sub">{item.statusLabel}</span>
                        <span>{item.statusVal}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* =========================================================
          5. ESCROW CONFIRMATION MODAL
      ========================================================= */}
      {showBidModal && (
        <div
          className="fixed [inset:0] [background-color:rgba(15,_23,_42,_0.65)] [backdrop-filter:blur(4px)] [z-index:2000] flex items-center justify-center p-4"
          onClick={() => setShowBidModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full [max-width:480px] p-6 [box-shadow:0_20px_25px_-5px_rgba(0,_0,_0,_0.2)] [animation:modalPopAnim_0.2s_cubic-bezier(0.16,_1,_0.3,_1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="[font-size:16px] font-extrabold text-slate-900 m-0">
                Xác Nhận Đặt Giá Đấu Giá 3D
              </h3>
              <button
                type="button"
                className="[background:transparent] [border:none] text-slate-500 cursor-pointer p-1 flex items-center justify-center hover:text-slate-900"
                onClick={() => setShowBidModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg mb-4 text-xs text-slate-700">
              <p className="font-bold text-slate-900 mb-1">
                Audemars Piguet Royal Oak Chronograph 41mm
              </p>
              <p className="m-0 text-slate-500">Mã Lot: AP-2025-X09 • Kho bảo mật TP.HCM</p>
            </div>

            <div className="space-y-3 mb-5 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Giá đặt đề xuất:</span>
                <span className="font-bold text-red-600">{formatVND(customBidAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Tiền cọc Escrow (10%):</span>
                <span className="font-bold text-blue-600">
                  {formatVND(Math.round(customBidAmount * 0.1))}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Cổng ký quỹ Escrow:</span>
                <span className="font-semibold text-slate-800">PayOS / Smart Contract</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-5 leading-relaxed">
              * Khoản cọc sẽ được đóng băng tạm thời trong tài khoản Escrow. Trong trường hợp có
              người đặt giá cao hơn, khoản cọc sẽ được tự động hoàn lại 100% trong vòng 30 giây.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                onClick={() => setShowBidModal(false)}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xs shadow-md hover:opacity-95"
                onClick={handleConfirmBid}
              >
                Khóa Cọc & Đặt Giá Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. FOOTER (Consistent with Homepage, Login, Register) */}
      <Footer />
    </div>
  );
};

export default AuctionPage;
