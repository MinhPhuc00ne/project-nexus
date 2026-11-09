import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, X, Sparkles, SlidersHorizontal } from 'lucide-react';
import CatalogListing from '../../components/products/CatalogListing';
import SearchFilterSidebar, {
  type SearchFilterState,
} from '../../components/products/SearchFilterSidebar';
import { getCategoriesApi, type CategoryNode } from '../../services/products.service';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const rawSearch = params.get('q')?.trim() ?? '';
  const rawCategoryId = params.get('categoryId')?.trim() ?? '';
  const rawCategoryName = params.get('categoryName')?.trim() ?? '';
  const rawCity = params.get('city')?.trim() ?? '';
  const rawMinPrice = params.get('minPrice') ? Number(params.get('minPrice')) : undefined;
  const rawMaxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined;
  const rawMinRating = params.get('minRating') ? Number(params.get('minRating')) : undefined;
  const rawInStock = params.get('inStock') === 'true' ? 'true' : undefined;

  const [inputVal, setInputVal] = useState(rawSearch);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  useEffect(() => {
    setInputVal(rawSearch);
  }, [rawSearch]);

  useEffect(() => {
    void getCategoriesApi()
      .then((data) => setCategories(data || []))
      .catch(() => {});
  }, []);

  const matchedCategory = rawCategoryId
    ? categories.find((c) => c.id === rawCategoryId)
    : rawSearch
      ? categories.find((c) => c.name.toLowerCase() === rawSearch.toLowerCase())
      : undefined;

  const categoryId = rawCategoryId || matchedCategory?.id || '';
  const categoryName = rawCategoryName || matchedCategory?.name || '';
  const isCategoryExactSearch = Boolean(
    matchedCategory && rawSearch.toLowerCase() === matchedCategory.name.toLowerCase(),
  );
  const search = isCategoryExactSearch ? '' : rawSearch;

  const filterState: SearchFilterState = useMemo(
    () => ({
      categoryId: categoryId || undefined,
      city: rawCity || undefined,
      minPrice: rawMinPrice,
      maxPrice: rawMaxPrice,
      minRating: rawMinRating,
      inStock: rawInStock,
    }),
    [categoryId, rawCity, rawMinPrice, rawMaxPrice, rawMinRating, rawInStock],
  );

  const activeBadges: { label: string; key: keyof SearchFilterState }[] = [];
  if (categoryId || categoryName) {
    activeBadges.push({ label: `Danh mục: ${categoryName || categoryId}`, key: 'categoryId' });
  }
  if (rawCity) {
    activeBadges.push({ label: `Nơi bán: ${rawCity}`, key: 'city' });
  }
  if (rawMinPrice !== undefined || rawMaxPrice !== undefined) {
    const minText = rawMinPrice ? `${rawMinPrice.toLocaleString('vi-VN')}₫` : '0₫';
    const maxText = rawMaxPrice ? `${rawMaxPrice.toLocaleString('vi-VN')}₫` : '∞';
    activeBadges.push({ label: `Giá: ${minText} - ${maxText}`, key: 'minPrice' });
  }
  if (rawMinRating) {
    activeBadges.push({ label: `Đánh giá: Từ ${rawMinRating} sao`, key: 'minRating' });
  }
  if (rawInStock) {
    activeBadges.push({ label: 'Chỉ còn hàng', key: 'inStock' });
  }

  const updateFiltersInUrl = (nextFilters: SearchFilterState) => {
    const nextParams = new URLSearchParams(params);
    if (nextFilters.categoryId) {
      nextParams.set('categoryId', nextFilters.categoryId);
      const cat = categories.find((c) => c.id === nextFilters.categoryId);
      if (cat) nextParams.set('categoryName', cat.name);
    } else {
      nextParams.delete('categoryId');
      nextParams.delete('categoryName');
    }

    if (nextFilters.city) {
      nextParams.set('city', nextFilters.city);
    } else {
      nextParams.delete('city');
    }

    if (nextFilters.minPrice !== undefined) {
      nextParams.set('minPrice', String(nextFilters.minPrice));
    } else {
      nextParams.delete('minPrice');
    }

    if (nextFilters.maxPrice !== undefined) {
      nextParams.set('maxPrice', String(nextFilters.maxPrice));
    } else {
      nextParams.delete('maxPrice');
    }

    if (nextFilters.minRating !== undefined) {
      nextParams.set('minRating', String(nextFilters.minRating));
    } else {
      nextParams.delete('minRating');
    }

    if (nextFilters.inStock) {
      nextParams.set('inStock', 'true');
    } else {
      nextParams.delete('inStock');
    }

    setParams(nextParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    const nextParams = new URLSearchParams(params);
    if (trimmed) {
      nextParams.set('q', trimmed);
    } else {
      nextParams.delete('q');
    }
    setParams(nextParams);
  };

  const handleResetFilters = () => {
    const nextParams = new URLSearchParams();
    if (search) nextParams.set('q', search);
    setParams(nextParams);
    setIsMobileFilterOpen(false);
  };

  const removeFilterItem = (key: keyof SearchFilterState) => {
    const updated = { ...filterState };
    if (key === 'categoryId') {
      delete updated.categoryId;
    } else if (key === 'city') {
      delete updated.city;
    } else if (key === 'minPrice' || key === 'maxPrice') {
      delete updated.minPrice;
      delete updated.maxPrice;
    } else if (key === 'minRating') {
      delete updated.minRating;
    } else if (key === 'inStock') {
      delete updated.inStock;
    }
    updateFiltersInUrl(updated);
  };

  const renderPageTitle = () => {
    if (search && categoryName) {
      return (
        <>
          Kết quả tìm kiếm cho <span className="text-blue-600 font-extrabold">"{search}"</span>{' '}
          trong <span className="text-blue-600 font-extrabold">{categoryName}</span>
        </>
      );
    }
    if (categoryName) {
      return (
        <>
          Sản phẩm thuộc danh mục{' '}
          <span className="text-blue-600 font-extrabold">{categoryName}</span>
          {rawSearch && (
            <span className="text-sm font-normal text-slate-500"> (từ khóa: "{rawSearch}")</span>
          )}
        </>
      );
    }
    if (search) {
      return (
        <>
          Kết quả tìm kiếm cho từ khóa{' '}
          <span className="text-blue-600 font-extrabold">"{search}"</span>
        </>
      );
    }
    return 'Khám Phá Tất Cả Sản Phẩm';
  };

  return (
    <main className="mx-auto max-w-[1280px] space-y-5 px-3 sm:px-4 py-5 sm:py-7">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Trang chủ
        </Link>
        <span className="text-slate-300">/</span>
        <Link to="/categories" className="text-slate-600 hover:text-blue-600 transition">
          Danh mục
        </Link>
        {categoryName && (
          <>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800">{categoryName}</span>
          </>
        )}
      </nav>

      {/* Header Search & Title Banner */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50/40 via-white to-slate-50 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 shrink-0 hidden sm:inline-block" />
              <span>{renderPageTitle()}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Sản phẩm chính hãng, kiểm định minh bạch, bảo chứng ký quỹ NEXUS Escrow.
            </p>
          </div>

          {/* Search Input Box */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Tìm theo tên sản phẩm, thương hiệu..."
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition shadow-2xs placeholder:text-slate-400"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => setInputVal('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Xóa từ khóa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs shrink-0 cursor-pointer"
            >
              Tìm kiếm
            </button>
          </form>
        </div>

        {/* Active Filter Chips */}
        {activeBadges.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" /> Đang lọc:
            </span>
            {activeBadges.map((badge) => (
              <span
                key={badge.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/80 shadow-2xs transition hover:bg-blue-100"
              >
                {badge.label}
                <button
                  type="button"
                  onClick={() => removeFilterItem(badge.key)}
                  className="text-blue-500 hover:text-rose-600 cursor-pointer ml-0.5"
                  title={`Xóa bộ lọc ${badge.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:underline ml-2 cursor-pointer"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* Main Two-Column Body: Filter Sidebar + Catalog Grid */}
      <div className="flex flex-col lg:flex-row items-start gap-5">
        <SearchFilterSidebar
          categories={categories}
          filters={filterState}
          onChange={updateFiltersInUrl}
          onReset={handleResetFilters}
          isOpenMobile={isMobileFilterOpen}
          onCloseMobile={() => setIsMobileFilterOpen(false)}
        />

        <section
          aria-label="Danh sách sản phẩm tìm kiếm"
          className="flex-1 min-w-0 w-full rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs"
        >
          <CatalogListing
            key={`${search}-${categoryId}-${rawCity}-${rawMinPrice}-${rawMaxPrice}-${rawMinRating}-${rawInStock}`}
            search={search}
            categoryId={categoryId}
            city={rawCity}
            minPrice={rawMinPrice}
            maxPrice={rawMaxPrice}
            minRating={rawMinRating}
            inStock={rawInStock}
            onOpenMobileFilter={() => setIsMobileFilterOpen(true)}
            activeFilterCount={activeBadges.length}
          />
        </section>
      </div>
    </main>
  );
}
