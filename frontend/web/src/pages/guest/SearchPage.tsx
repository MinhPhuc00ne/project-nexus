import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Shield,
  ShieldCheck,
  Truck,
  Box,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import type {
  ProductItem,
  TransactionTypeFilter,
  ConditionFilter,
  BrandFilter,
  ShippingFilter,
} from '../../types';
import SearchResultCard from '../../components/search/SearchResultCard';
import SearchFilterSidebar from '../../components/search/SearchFilterSidebar';
import SearchPreviewModal from '../../components/search/SearchPreviewModal';
import { relatedTags, getInitialProducts } from '../../components/search/mockData';

export const SearchPage: React.FC = () => {
  // Search Bar State
  const [searchQuery, setSearchQuery] = useState(
    () => new URLSearchParams(window.location.search).get('q') ?? 'đồng hồ cơ skeleton 3d',
  );

  // Sorting and View Mode State
  const [activeSort, setActiveSort] = useState<'popular' | 'latest' | 'sales' | 'price'>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter Accordion Collapse State
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Filter Checkbox States
  const [transactionTypes, setTransactionTypes] = useState<TransactionTypeFilter>({
    live3d: true,
    mall: true,
    upcoming: false,
    escrow: false,
  });

  const [conditionFilters, setConditionFilters] = useState<ConditionFilter>({
    brandNew: true,
    likeNew: false,
    gradeA: false,
  });

  const [brandFilters, setBrandFilters] = useState<BrandFilter>({
    ap: true,
    patek: true,
    rolex: true,
    hublot: false,
    rm: false,
    tissot: false,
    seiko: false,
  });

  const [shippingFilters, setShippingFilters] = useState<ShippingFilter>({
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

  // Products Data
  const products = getInitialProducts(formatSeconds(timerAp), formatSeconds(timerRm));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_Roboto,_Helvetica,_Arial,_sans-serif] flex flex-col">
      {/* SEARCH RESULTS BANNER */}
      <section className="bg-white [border-bottom:1px_solid_#e2e8f0] [padding:20px_0]">
        <div className="max-w-screen-2xl [margin:0_auto] [padding:0_24px] flex items-center justify-between gap-5">
          <div className="flex flex-col gap-1">
            <div className="mb-2">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 shadow-sm transition"
              >
                <ArrowLeft size={13} />
                Quay lại Trang Chủ
              </Link>
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
          <SearchFilterSidebar
            transactionTypes={transactionTypes}
            setTransactionTypes={setTransactionTypes}
            conditionFilters={conditionFilters}
            setConditionFilters={setConditionFilters}
            brandFilters={brandFilters}
            setBrandFilters={setBrandFilters}
            shippingFilters={shippingFilters}
            setShippingFilters={setShippingFilters}
            priceFrom={priceFrom}
            setPriceFrom={setPriceFrom}
            priceTo={priceTo}
            setPriceTo={setPriceTo}
            collapsedSections={collapsedSections}
            onToggleSection={toggleSection}
            onClearAll={clearAllFilters}
          />

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
                <SearchResultCard
                  key={item.id}
                  item={item}
                  isLiked={Boolean(likedItems[item.id])}
                  onToggleLike={toggleLike}
                  onPreview={(previewItem) => setActivePreviewWatch(previewItem)}
                />
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

      {/* 8. 3D INTERACTIVE VIEWER MODAL */}
      <SearchPreviewModal item={activePreviewWatch} onClose={() => setActivePreviewWatch(null)} />
    </div>
  );
};

export default SearchPage;
