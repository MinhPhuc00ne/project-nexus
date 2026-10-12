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
  Truck,
  RotateCw,
  Sparkles,
  X,
  Scan,
  MessageSquare,
} from 'lucide-react';
import HomeHeader from '../../components/headers/HomeHeader';
import Footer from '../../components/footer/footer';
import './AuctionPage.css';

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
    <div className="auction-page">
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

      <main className="auction-container">
        {/* Breadcrumb Navigation */}
        <div className="auction-breadcrumb-row">
          <nav className="auction-breadcrumb-list" aria-label="Breadcrumb">
            <a href="/" className="auction-breadcrumb-link">
              Trang Chủ
            </a>
            <span className="auction-breadcrumb-separator">/</span>
            <a href="/search?floor=Sàn+Đấu+Giá+Live" className="auction-breadcrumb-link">
              Sàn Đấu Giá Live 3D
            </a>
            <span className="auction-breadcrumb-separator">/</span>
            <span className="auction-breadcrumb-link">Đồng Hồ Cơ Xa Xỉ</span>
            <span className="auction-breadcrumb-separator">/</span>
            <span className="auction-breadcrumb-current">
              Audemars Piguet Royal Oak Chronograph
            </span>
          </nav>

          <div className="auction-top-actions">
            <button
              type="button"
              className={`auction-icon-btn ${isLiked ? 'liked' : ''}`}
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              <span>{isLiked ? 'Đã Lưu' : 'Lưu Lot'}</span>
            </button>
            <button
              type="button"
              className="auction-icon-btn"
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
        <div className="auction-hero-grid">
          {/* LEFT: 3D INTERACTIVE VIEWER & GALLERY */}
          <div className="auction-viewer-card">
            <div className="auction-main-viewer">
              {/* Badges on top of viewer */}
              <div className="auction-viewer-top-badges">
                <span className="auction-live-badge">
                  <span className="pulse-dot"></span>
                  LIVE BID
                </span>
                <span className="auction-3d-tag">
                  <Scan className="w-3.5 h-3.5 text-cyan-400" />
                  3D LiDAR Có Sẵn
                </span>
              </div>

              {/* Main Product Image with simulated 3D rotation */}
              <img
                src={thumbnails[selectedThumb].src}
                alt="Audemars Piguet Royal Oak Chrono"
                className="auction-main-viewer-img"
                style={{
                  transform: `rotate(${rotationAngle}deg) scale(${viewerMode === '3d' ? 1.08 : 1})`,
                }}
              />

              {/* LiDAR Holographic Overlay (if mode = lidar) */}
              {viewerMode === 'lidar' && (
                <div className="auction-lidar-overlay">
                  <div className="auction-lidar-scan-beam"></div>
                  <div className="auction-lidar-badge">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>LIDAR 3D MATRIX: SAI SỐ 0.0018mm [PASS]</span>
                  </div>
                </div>
              )}

              {/* 3D Interactive badge */}
              {viewerMode === '3d' && (
                <div className="auction-lidar-badge">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>KÉO HOẶC BẤM ĐỂ XOAY 360° • KHÔNG GIAN 3 CHIỀU</span>
                </div>
              )}
            </div>

            {/* Viewer Mode Switcher */}
            <div className="auction-viewer-mode-switch">
              <button
                type="button"
                className={`auction-mode-btn ${viewerMode === 'photo' ? 'active' : ''}`}
                onClick={() => setViewerMode('photo')}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ảnh Studio HD</span>
              </button>
              <button
                type="button"
                className={`auction-mode-btn ${viewerMode === '3d' ? 'active' : ''}`}
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
                className={`auction-mode-btn ${viewerMode === 'lidar' ? 'active' : ''}`}
                onClick={() => setViewerMode('lidar')}
              >
                <Scan className="w-3.5 h-3.5 text-cyan-600" />
                <span>Quét LiDAR Hologram</span>
              </button>
            </div>

            {/* Gallery Thumbnails */}
            <div className="auction-thumb-row">
              {thumbnails.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`auction-thumb-btn ${selectedThumb === idx ? 'active' : ''}`}
                  onClick={() => setSelectedThumb(idx)}
                  title={item.label}
                >
                  <img src={item.src} alt={item.label} className="auction-thumb-img" />
                </button>
              ))}
            </div>

            {/* Vault Storage Assurance Card */}
            <div className="auction-vault-card">
              <div className="auction-vault-left">
                <div className="auction-vault-avatar">GV</div>
                <div>
                  <h4 className="auction-vault-name">Geneva Vault Horology Store</h4>
                  <p className="auction-vault-badge">
                    <span className="auction-vault-rating">★ 4.99/5</span> • 184 phiên đấu giá hoàn
                    tất
                  </p>
                </div>
              </div>
              <div className="auction-vault-check">
                <span>Kho Bảo Mật Q.1 (TP.HCM)</span>
              </div>
            </div>
          </div>

          {/* RIGHT: BID TERMINAL & VALUE PROPOSITION */}
          <div className="auction-info-col">
            {/* Title & Reference */}
            <div className="auction-title-block">
              <div className="auction-brand-lot">
                <span className="auction-brand-tag">AUDEMARS PIGUET • LE BRASSUS</span>
                <span className="auction-lot-id">LOT #AP-2025-X09</span>
              </div>
              <h1 className="auction-main-title">
                Audemars Piguet Royal Oak Chronograph 41mm Selfwinding
              </h1>
              <p className="auction-sub-specs">
                Ref: 26331ST.OO.1220ST.01 • Thép không gỉ 904L • Mặt Số Xanh Bleu Nuit Tapisserie
              </p>
            </div>

            {/* Countdown Banner */}
            <div className="auction-timer-banner">
              <div className="auction-timer-left">
                <span className="auction-timer-label">Thời Gian Còn Lại:</span>
                <span className="auction-timer-digits">{formatTimer(timeLeft)}</span>
              </div>
              <div className="auction-timer-right">
                <span className="auction-bids-count">42 lượt trả giá</span>
                <span className="auction-live-viewers">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  1.428 người đang theo dõi
                </span>
              </div>
            </div>

            {/* Price & Terminal Box */}
            <div className="auction-price-card">
              <div className="auction-price-header">
                <span className="auction-price-label">Giá Đặt Hiện Tại (Leading Bid):</span>
                <span className="auction-fx-pill">Live FX: $1 = 24.000đ</span>
              </div>

              <div className="auction-price-amount-row">
                <span className="auction-current-price">{formatVND(currentPrice)}</span>
                <span className="auction-usd-price">{formatUSD(currentPrice)}</span>
              </div>

              <div className="auction-starting-price">
                Khởi điểm: <strong>95.000.000 đ</strong> (≈ $3,958 USD) • Bước giá tối thiểu:{' '}
                <strong>+1.000.000 đ</strong>
              </div>

              {/* Leading Bidder */}
              <div className="auction-leader-row">
                <span>Người đang giữ giá:</span>
                <span className="auction-leader-name">{leadingBidder} 👑</span>
              </div>

              {/* Quick Bid Increment Buttons */}
              <div className="auction-bid-controls">
                <div className="auction-quick-increments">
                  <button
                    type="button"
                    className="auction-quick-btn"
                    onClick={() => handleQuickIncrement(1000000)}
                  >
                    +1.000.000 đ
                  </button>
                  <button
                    type="button"
                    className="auction-quick-btn"
                    onClick={() => handleQuickIncrement(2000000)}
                  >
                    +2.000.000 đ
                  </button>
                  <button
                    type="button"
                    className="auction-quick-btn"
                    onClick={() => handleQuickIncrement(5000000)}
                  >
                    +5.000.000 đ
                  </button>
                  <button
                    type="button"
                    className="auction-quick-btn"
                    onClick={() => handleQuickIncrement(10000000)}
                  >
                    +10.000.000 đ
                  </button>
                </div>

                {/* Custom Bid Input */}
                <div className="auction-custom-bid-input-wrap">
                  <span className="auction-bid-input-prefix">Mức giá bạn muốn đặt</span>
                  <input
                    type="text"
                    className="auction-bid-input"
                    value={formatVND(customBidAmount)}
                    readOnly
                  />
                </div>

                {/* Main Action Buttons */}
                <div className="auction-action-buttons">
                  <button
                    type="button"
                    className="auction-bid-submit-btn"
                    onClick={() => setShowBidModal(true)}
                  >
                    <Gavel className="w-5 h-5" />
                    <span>ĐẶT GIÁ NGAY • {formatVND(customBidAmount)}</span>
                  </button>

                  <button
                    type="button"
                    className="auction-buy-now-btn"
                    onClick={() => {
                      alert('Tính năng mua đứt đang kích hoạt hợp đồng Escrow.');
                    }}
                  >
                    <span>Mua Đứt Ngay (Buy Out): 195.000.000 đ</span>
                  </button>
                </div>

                <p className="auction-escrow-note">
                  🛡️ Tiền cọc yêu cầu: <strong>12.850.000 ₫</strong> (10%). Ký quỹ an toàn qua cổng
                  PayOS / Stripe Escrow. Tự động hoàn tiền 100% trong 30 giây nếu bị trả giá cao
                  hơn.
                </p>
              </div>
            </div>

            {/* Shipping & Authenticity Policies (Matches exact top-right cards from Image 1) */}
            <div className="auction-shipping-policies">
              <div className="policy-card">
                <div className="policy-icon-box red">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="policy-text">
                  <h4 className="policy-title">Vận chuyển Hỏa Tốc GHN Express Bảo Hiểm 100%</h4>
                  <p className="policy-desc">
                    Giao 2H tại TP.HCM & Hà Nội bằng thùng bảo mật chống sốc kèm camera ghi hình
                    niêm phong mở hộp.
                  </p>
                </div>
              </div>

              <div className="policy-card">
                <div className="policy-icon-box blue">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="policy-text">
                  <h4 className="policy-title">Chính Sách Hoàn Tiền 200% & Đổi Trả 7 Ngày</h4>
                  <p className="policy-desc">
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
        <section className="auction-tabs-wrapper">
          <div className="auction-tabs-nav">
            <button
              type="button"
              className={`auction-tab-btn ${activeTab === 'certs' ? 'active' : ''}`}
              onClick={() => setActiveTab('certs')}
            >
              <ShieldCheck className="auction-tab-icon" />
              <span>Hồ Sơ Giám Định 3D & Vật Lý</span>
            </button>

            <button
              type="button"
              className={`auction-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              <Sliders className="auction-tab-icon" />
              <span>Thông Số Kỹ Thuật Chi Tiết</span>
            </button>

            <button
              type="button"
              className={`auction-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Clock className="auction-tab-icon" />
              <span>Lịch Sử Đấu Giá (19 lượt)</span>
            </button>

            <button
              type="button"
              className={`auction-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              <MessageSquare className="auction-tab-icon" />
              <span>Đánh Giá Collectors (48)</span>
            </button>
          </div>

          <div className="auction-tab-pane">
            {/* TAB 1: 3D CERTIFICATES & TIMIEGRAPHER (Matches Image 1) */}
            {activeTab === 'certs' && (
              <div>
                {/* 3 Certification Cards */}
                <div className="auction-certs-grid">
                  {/* Card 1 */}
                  <div className="cert-card">
                    <div className="cert-card-header">
                      <Scan className="cert-card-icon" />
                      <h4 className="cert-card-title">Quét 3D LiDAR Hologram</h4>
                    </div>
                    <p className="cert-card-body">
                      Tỷ lệ sai số dưới 0.002mm so với bản vẽ gốc của Audemars Piguet Le Brassus.
                      Không phát hiện dấu hiệu can thiệp đánh bóng quá mức (Unpolished bevels).
                    </p>
                    <div className="cert-card-footer">
                      Mã kiểm định: <strong>LDR-CHRONO-2025-X09</strong>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="cert-card">
                    <div className="cert-card-header">
                      <RotateCw className="cert-card-icon" />
                      <h4 className="cert-card-title">Tem Niêm Phong Chống Mở Nắp Lưng</h4>
                    </div>
                    <p className="cert-card-body">
                      Tem RFID mã hóa micro-mesh được kiểm định bởi Viện Đồng Hồ Cao Cấp Geneva. Bộ
                      máy được bảo hiểm toàn vẹn 100% nguyên bản từ xưởng.
                    </p>
                    <div className="cert-card-footer">
                      Trạng thái: <strong>Nguyên tem 100% (Intact)</strong>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="cert-card">
                    <div className="cert-card-header">
                      <ShieldCheck className="cert-card-icon" />
                      <h4 className="cert-card-title">Chứng Chỉ NFT On-Chain Provenance</h4>
                    </div>
                    <p className="cert-card-body">
                      Hợp đồng thông minh ghi nhận lịch sử sở hữu, hóa đơn mua ban đầu tại Boutique
                      Hong Kong 2022 và các mốc bảo dưỡng định kỳ 24 tháng.
                    </p>
                    <div className="cert-card-footer">
                      <a href="#blockchain" className="cert-card-link">
                        <span>Tra cứu Etherscan / Polygon Contract</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Timegrapher Diagnostics Section (Matches Image 1) */}
                <div className="auction-diagnostics-block">
                  <h3 className="diagnostics-heading">
                    Bảng Đo Đạc Máy Thử Nhịp (Timegrapher Diagnostics)
                  </h3>

                  <div className="diagnostics-grid">
                    {/* Metric 1 */}
                    <div className="diagnostics-card">
                      <div className="diag-header-row">
                        <span className="diag-label">Giá đặt hiện tại:</span>
                        <span className="diag-live-pill">Live FX: $1 = 24.000đ</span>
                      </div>
                      <p className="diag-big-val red">128.500.000 đ</p>
                      <p className="diag-sub-val">(≈ $5,354 USD)</p>
                      <p className="diag-meta">Khởi điểm: 95.000.000 đ • ≈ $3,958 USD</p>
                    </div>

                    {/* Metric 2 */}
                    <div className="diagnostics-card">
                      <span className="diag-label">Biên độ dao động (Amplitude):</span>
                      <p className="diag-big-val">298°</p>
                      <p className="diag-meta">Mức lý tưởng (280° - 310°)</p>
                    </div>

                    {/* Metric 3 */}
                    <div className="diagnostics-card">
                      <span className="diag-label">Lỗi nhịp (Beat Error):</span>
                      <p className="diag-big-val">0.1 ms</p>
                      <p className="diag-meta">Cực kỳ hoàn hảo (&lt;0.5ms)</p>
                    </div>

                    {/* Metric 4 */}
                    <div className="diagnostics-card">
                      <span className="diag-label">Kiểm tra áp suất nước:</span>
                      <p className="diag-big-val blue">5.0 BAR (PASS)</p>
                      <p className="diag-meta">Chống nước 50m an toàn</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TECHNICAL SPECIFICATIONS */}
            {activeTab === 'specs' && (
              <table className="auction-specs-table">
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
              <table className="bid-history-table">
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
        <section className="auction-similar-section">
          <div className="similar-header-row">
            <div className="similar-heading-col">
              <h2 className="similar-title">Vật Phẩm Tương Tự & Cùng Phiên Đấu Giá</h2>
              <p className="similar-subtitle">
                Các cỗ máy cơ vi cơ học danh giá đã qua kiểm định LiDAR 3D nghiêm ngặt
              </p>
            </div>

            <a href="/search?floor=Sàn+Đấu+Giá+Live" className="similar-all-link">
              <span>Xem tất cả 42 lot</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="similar-grid">
            {similarWatches.map((item) => {
              const liked = likedSimilar[item.id] || false;
              return (
                <div key={item.id} className="watch-card">
                  {/* Top Badge */}
                  <span className={`watch-card-top-badge ${item.badge.type}`}>
                    {item.badge.text}
                  </span>

                  {/* Favorite Button */}
                  <button
                    type="button"
                    className={`watch-card-fav-btn ${liked ? 'liked' : ''}`}
                    onClick={() => setLikedSimilar((prev) => ({ ...prev, [item.id]: !liked }))}
                    aria-label="Thêm vào yêu thích"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>

                  {/* Image with 3D tag */}
                  <div className="watch-card-img-area">
                    <img src={item.image} alt={item.title} className="watch-card-img" />
                    <span className="watch-card-3d-badge">
                      <Scan className="w-3 h-3 text-blue-600" />
                      <span>3D Có sẵn</span>
                    </span>
                  </div>

                  {/* Info Area */}
                  <div className="watch-card-info">
                    <div>
                      <p className="watch-card-brand">{item.brand}</p>
                      <h4 className="watch-card-title">{item.title}</h4>
                    </div>

                    <div className="watch-card-price-row">
                      <div className="watch-price-col">
                        <span className="watch-price-label">{item.priceLabel}</span>
                        <p
                          className={`watch-main-price ${item.badge.type === 'upcoming' ? 'black' : ''}`}
                        >
                          {item.price}
                        </p>
                        <span className="watch-usd-sub">{item.usdPrice}</span>
                      </div>

                      <div className={`watch-status-pill ${item.statusType}`}>
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
        <div className="auction-modal-overlay" onClick={() => setShowBidModal(false)}>
          <div className="auction-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="auction-modal-header">
              <h3 className="auction-modal-title">Xác Nhận Đặt Giá Đấu Giá 3D</h3>
              <button
                type="button"
                className="auction-modal-close-btn"
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
