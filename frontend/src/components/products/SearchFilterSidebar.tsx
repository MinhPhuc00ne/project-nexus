import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Filter,
  Star,
  RotateCcw,
  ChevronDown,
  Check,
  MapPin,
  Tag,
  Boxes,
  SlidersHorizontal,
  Search,
  X,
  Flame,
} from 'lucide-react';
import type { CategoryNode } from '@/features/catalog/services/products.service';

export interface SearchFilterState {
  categoryId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: 'true' | 'false';
  trendingOnly?: boolean;
  minPurchaseCount?: number;
}

interface SearchFilterSidebarProps {
  categories: CategoryNode[];
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  onReset: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const POPULAR_CITIES = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];

const ALL_CITIES = [
  'TP. Hồ Chí Minh',
  'Hà Nội',
  'Đà Nẵng',
  'Cần Thơ',
  'Hải Phòng',
  'An Giang',
  'Bà Rịa - Vũng Tàu',
  'Bắc Giang',
  'Bắc Kạn',
  'Bạc Liêu',
  'Bắc Ninh',
  'Bến Tre',
  'Bình Định',
  'Bình Dương',
  'Bình Phước',
  'Bình Thuận',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Đắk Nông',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Giang',
  'Hà Nam',
  'Hà Tĩnh',
  'Hải Dương',
  'Hậu Giang',
  'Hòa Bình',
  'Hưng Yên',
  'Khánh Hòa',
  'Kiên Giang',
  'Kon Tum',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Long An',
  'Nam Định',
  'Nghệ An',
  'Ninh Bình',
  'Ninh Thuận',
  'Phú Thọ',
  'Phú Yên',
  'Quảng Bình',
  'Quảng Nam',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sóc Trăng',
  'Sơn La',
  'Tây Ninh',
  'Thái Bình',
  'Thái Nguyên',
  'Thanh Hóa',
  'Thừa Thiên Huế',
  'Tiền Giang',
  'Trà Vinh',
  'Tuyên Quang',
  'Vĩnh Long',
  'Vĩnh Phúc',
  'Yên Bái',
];

const PRICE_PRESETS = [
  { key: 'filters.presetUnder100k', min: undefined, max: 100000 },
  { key: 'filters.preset100kTo500k', min: 100000, max: 500000 },
  { key: 'filters.preset500kTo2m', min: 500000, max: 2000000 },
  { key: 'filters.presetOver2m', min: 2000000, max: undefined },
] as const;

export default function SearchFilterSidebar({
  categories,
  filters,
  onChange,
  onReset,
  isOpenMobile = false,
  onCloseMobile,
}: SearchFilterSidebarProps) {
  const { t } = useTranslation('guest');
  const [fromPrice, setFromPrice] = useState<string>(
    filters.minPrice !== undefined ? String(filters.minPrice) : '',
  );
  const [toPrice, setToPrice] = useState<string>(
    filters.maxPrice !== undefined ? String(filters.maxPrice) : '',
  );
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllCities, setShowAllCities] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // Accordion toggle states
  const [openSections, setOpenSections] = useState({
    categories: true,
    cities: true,
    price: true,
    rating: true,
    stock: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    setFromPrice(filters.minPrice !== undefined ? String(filters.minPrice) : '');
    setToPrice(filters.maxPrice !== undefined ? String(filters.maxPrice) : '');
  }, [filters.minPrice, filters.maxPrice]);

  const handleApplyPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const min = fromPrice.trim() ? Number(fromPrice.trim()) : undefined;
    const max = toPrice.trim() ? Number(toPrice.trim()) : undefined;
    onChange({
      ...filters,
      minPrice: min !== undefined && !isNaN(min) && min >= 0 ? min : undefined,
      maxPrice: max !== undefined && !isNaN(max) && max >= 0 ? max : undefined,
    });
  };

  const handleSelectPreset = (min?: number, max?: number) => {
    setFromPrice(min !== undefined ? String(min) : '');
    setToPrice(max !== undefined ? String(max) : '');
    onChange({
      ...filters,
      minPrice: min,
      maxPrice: max,
    });
  };

  const handleSelectCategory = (catId: string) => {
    onChange({
      ...filters,
      categoryId: filters.categoryId === catId ? undefined : catId,
    });
  };

  const handleSelectCity = (city: string) => {
    onChange({
      ...filters,
      city: filters.city === city ? undefined : city,
    });
  };

  const handleSelectRating = (rating: number) => {
    onChange({
      ...filters,
      minRating: filters.minRating === rating ? undefined : rating,
    });
  };

  const handleToggleInStock = () => {
    onChange({
      ...filters,
      inStock: filters.inStock === 'true' ? undefined : 'true',
    });
  };

  const handleToggleTrendingOnly = () => {
    onChange({
      ...filters,
      trendingOnly: filters.trendingOnly ? undefined : true,
    });
  };

  const handleSelectMinPurchase = (count?: number) => {
    onChange({
      ...filters,
      minPurchaseCount: filters.minPurchaseCount === count ? undefined : count,
    });
  };

  const hasActiveFilters = Boolean(
    filters.categoryId ||
    filters.city ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.minRating !== undefined ||
    filters.inStock ||
    filters.trendingOnly ||
    filters.minPurchaseCount !== undefined,
  );

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 6);

  const displayedCities = useMemo(() => {
    if (showAllCities) {
      if (!citySearch.trim()) return ALL_CITIES;
      const q = citySearch.trim().toLowerCase();
      return ALL_CITIES.filter((c) => c.toLowerCase().includes(q));
    }
    // Collapsed: show top 5 popular provinces/cities, pinning selected province if outside top 5
    if (filters.city && !POPULAR_CITIES.includes(filters.city)) {
      return [filters.city, ...POPULAR_CITIES];
    }
    return POPULAR_CITIES;
  }, [showAllCities, citySearch, filters.city]);

  const content = (
    <div className="space-y-5 text-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-slate-800">
          <Filter className="h-4 w-4 text-blue-600" />
          {t('filters.title')}
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 transition cursor-pointer"
            title={t('filters.clearAllTitle')}
          >
            <RotateCcw className="h-3 w-3" />
            {t('filters.clearAll')}
          </button>
        )}
      </div>

      {/* Accordion 1: By Category */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => toggleSection('categories')}
          className="flex w-full items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-blue-600 transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Boxes className="h-3.5 w-3.5 text-blue-500" /> {t('filters.byCategory')}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              openSections.categories ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.categories && (
          <div className="mt-2.5 space-y-1">
            <ul className="space-y-0.5 text-sm">
              {displayedCategories.map((cat) => {
                const isSelected = filters.categoryId === cat.id;
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 font-semibold text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-white shrink-0 ml-1" />
                      ) : (
                        <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition">
                          {t('filters.select')}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {categories.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer px-2"
              >
                {showAllCategories ? (
                  <>{t('filters.collapse')}</>
                ) : (
                  <>{t('filters.showMoreCategories', { count: categories.length - 6 })}</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Accordion 2: Location */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => toggleSection('cities')}
          className="flex w-full items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-blue-600 transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-500" /> {t('filters.location')}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              openSections.cities ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.cities && (
          <div className="mt-2.5 space-y-2">
            {/* Search input when expanded */}
            {showAllCities && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder={t('filters.searchProvincePlaceholder')}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none transition placeholder:text-slate-400"
                />
                {citySearch && (
                  <button
                    type="button"
                    onClick={() => setCitySearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* List of cities */}
            <div className={`space-y-1 ${showAllCities ? 'max-h-52 overflow-y-auto pr-1' : ''}`}>
              {displayedCities.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-400 italic">
                  {t('filters.noProvinceFound')}
                </div>
              ) : (
                displayedCities.map((cityName) => {
                  const isChecked = filters.city === cityName;
                  return (
                    <label
                      key={cityName}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50 text-blue-700 font-medium border border-blue-200/60'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectCity(cityName)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="truncate">{cityName}</span>
                      </div>
                      {isChecked && <Check className="h-3 w-3 text-blue-600 shrink-0 ml-1" />}
                    </label>
                  );
                })
              )}
            </div>

            {/* Shopee-style toggle button */}
            <button
              type="button"
              onClick={() => {
                setShowAllCities((prev) => !prev);
                if (showAllCities) setCitySearch('');
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer px-1 pt-0.5"
            >
              {showAllCities ? (
                <>
                  {t('filters.showLess')} <ChevronDown className="h-3 w-3 rotate-180" />
                </>
              ) : (
                <>
                  {t('filters.showAllProvinces')} <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Accordion 3: Price Range */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="flex w-full items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-blue-600 transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-amber-500" /> {t('filters.priceRange')}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              openSections.price ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.price && (
          <div className="mt-2.5 space-y-3">
            {/* Quick Price Preset Chips */}
            <div className="grid grid-cols-2 gap-1.5">
              {PRICE_PRESETS.map((preset, idx) => {
                const isActive = filters.minPrice === preset.min && filters.maxPrice === preset.max;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset.min, preset.max)}
                    className={`rounded-lg py-1 px-1.5 text-[11px] font-medium text-center transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    {t(preset.key)}
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <form onSubmit={handleApplyPrice} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                    ₫
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={fromPrice}
                    onChange={(e) => setFromPrice(e.target.value)}
                    placeholder={t('filters.minPlaceholder')}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                  />
                </div>
                <span className="text-slate-400 text-xs">-</span>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                    ₫
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={toPrice}
                    onChange={(e) => setToPrice(e.target.value)}
                    placeholder={t('filters.maxPlaceholder')}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.99] py-1.5 text-xs font-bold uppercase tracking-wider text-white transition shadow-xs cursor-pointer"
              >
                {t('filters.apply')}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Accordion 4: Rating */}
      <div className="border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          className="flex w-full items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-blue-600 transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {t('filters.starRating')}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              openSections.rating ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.rating && (
          <div className="mt-2.5 space-y-1">
            {[5, 4, 3].map((stars) => {
              const isSelected = filters.minRating === stars;
              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => handleSelectRating(stars)}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200/70'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="ml-1 text-[11px]">
                      {stars === 5
                        ? t('filters.fiveStarsExact')
                        : t('filters.starsAndUp', { stars })}
                    </span>
                  </div>
                  {isSelected && <Check className="h-3 w-3 text-amber-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Accordion 5: Condition */}
      <div>
        <button
          type="button"
          onClick={() => toggleSection('stock')}
          className="flex w-full items-center justify-between py-1 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-blue-600 transition cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-purple-500" />{' '}
            {t('filters.serviceAndPromo')}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
              openSections.stock ? 'rotate-180' : ''
            }`}
          />
        </button>

        {openSections.stock && (
          <div className="mt-2.5 space-y-2">
            <label className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.inStock === 'true'}
                  onChange={handleToggleInStock}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>{t('filters.inStockOnly')}</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                {t('filters.inStockBadge')}
              </span>
            </label>

            <label className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(filters.trendingOnly)}
                  onChange={handleToggleTrendingOnly}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <span>{t('filters.trendingOnly')}</span>
              </span>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                <Flame className="h-2.5 w-2.5" />
                {t('filters.trendingBadge')}
              </span>
            </label>

            <div className="pt-2">
              <p className="px-2.5 text-[11px] font-semibold text-slate-500">
                {t('filters.minPurchaseLabel')}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5 px-2.5">
                {[undefined, 1, 5, 10, 50].map((count) => {
                  const isActive = filters.minPurchaseCount === count;
                  return (
                    <button
                      key={count ?? 'all'}
                      type="button"
                      onClick={() => handleSelectMinPurchase(count)}
                      className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition cursor-pointer ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      {count === undefined
                        ? t('filters.allPurchases')
                        : t('filters.minPurchasesPlus', { count })}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Offcanvas Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer Box */}
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-white p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <span className="text-sm font-bold text-slate-800">{t('filters.mobileTitle')}</span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {content}
            </div>

            <div className="pt-4 border-t border-slate-100 mt-6 flex gap-2">
              <button
                type="button"
                onClick={onReset}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                {t('filters.clearAll')}
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
              >
                {t('filters.viewResults')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
