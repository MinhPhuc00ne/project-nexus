import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search, X, Sparkles, SlidersHorizontal } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';
import CatalogListing from '../../components/products/CatalogListing';
import SearchFilterSidebar, {
  type SearchFilterState,
} from '../../components/products/SearchFilterSidebar';
import {
  getCategoriesApi,
  type CatalogQuery,
  type CategoryNode,
} from '@/features/catalog/services/products.service';

const VALID_SORT_OPTIONS = new Set<NonNullable<CatalogQuery['sortBy']>>([
  'newest',
  'price_asc',
  'price_desc',
  'best_selling',
  'trending',
  'top_rated',
]);

export default function SearchPage() {
  const { t } = useTranslation('guest');
  const [params, setParams] = useSearchParams();
  const rawSearch = params.get('q')?.trim() ?? '';
  const rawCategoryId = params.get('categoryId')?.trim() ?? '';
  const rawCategoryName = params.get('categoryName')?.trim() ?? '';
  const rawCity = params.get('city')?.trim() ?? '';
  const rawMinPrice = params.get('minPrice') ? Number(params.get('minPrice')) : undefined;
  const rawMaxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : undefined;
  const rawMinRating = params.get('minRating') ? Number(params.get('minRating')) : undefined;
  const rawInStock = params.get('inStock') === 'true' ? 'true' : undefined;
  const rawTrendingOnly = params.get('trendingOnly') === 'true' ? true : undefined;
  const rawMinPurchase = params.get('minPurchaseCount')
    ? Number(params.get('minPurchaseCount'))
    : undefined;
  const sortParam = params.get('sortBy') as NonNullable<CatalogQuery['sortBy']> | null;
  const rawSortBy: NonNullable<CatalogQuery['sortBy']> =
    sortParam && VALID_SORT_OPTIONS.has(sortParam) ? sortParam : 'newest';

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
      trendingOnly: rawTrendingOnly,
      minPurchaseCount: rawMinPurchase,
    }),
    [
      categoryId,
      rawCity,
      rawMinPrice,
      rawMaxPrice,
      rawMinRating,
      rawInStock,
      rawTrendingOnly,
      rawMinPurchase,
    ],
  );

  const activeBadges: { label: string; key: keyof SearchFilterState }[] = [];
  if (categoryId || categoryName) {
    activeBadges.push({
      label: t('search.badgeCategory', { name: categoryName || categoryId }),
      key: 'categoryId',
    });
  }
  if (rawCity) {
    activeBadges.push({ label: t('search.badgeCity', { city: rawCity }), key: 'city' });
  }
  if (rawMinPrice !== undefined || rawMaxPrice !== undefined) {
    const minText = rawMinPrice ? formatCurrency(rawMinPrice) : formatCurrency(0);
    const maxText = rawMaxPrice ? formatCurrency(rawMaxPrice) : '∞';
    activeBadges.push({
      label: t('search.badgePrice', { min: minText, max: maxText }),
      key: 'minPrice',
    });
  }
  if (rawMinRating) {
    activeBadges.push({
      label: t('search.badgeRating', { rating: rawMinRating }),
      key: 'minRating',
    });
  }
  if (rawInStock) {
    activeBadges.push({ label: t('search.badgeInStock'), key: 'inStock' });
  }
  if (rawTrendingOnly) {
    activeBadges.push({ label: t('search.badgeTrendingOnly'), key: 'trendingOnly' });
  }
  if (rawMinPurchase !== undefined && rawMinPurchase > 0) {
    activeBadges.push({
      label: t('search.badgeMinPurchase', { count: rawMinPurchase }),
      key: 'minPurchaseCount',
    });
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

    if (nextFilters.trendingOnly) {
      nextParams.set('trendingOnly', 'true');
    } else {
      nextParams.delete('trendingOnly');
    }

    if (nextFilters.minPurchaseCount !== undefined && nextFilters.minPurchaseCount > 0) {
      nextParams.set('minPurchaseCount', String(nextFilters.minPurchaseCount));
    } else {
      nextParams.delete('minPurchaseCount');
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
    } else if (key === 'trendingOnly') {
      delete updated.trendingOnly;
    } else if (key === 'minPurchaseCount') {
      delete updated.minPurchaseCount;
    }
    updateFiltersInUrl(updated);
  };

  const renderPageTitle = () => {
    if (search && categoryName) {
      return t('search.titleSearchInCategory', { search, category: categoryName });
    }
    if (categoryName) {
      return (
        <>
          {t('search.titleCategoryOnly', { category: categoryName })}
          {rawSearch && (
            <span className="text-sm font-normal text-slate-500">
              {' '}
              {t('search.titleKeywordSuffix', { keyword: rawSearch })}
            </span>
          )}
        </>
      );
    }
    if (search) {
      return t('search.titleSearchOnly', { search });
    }
    return t('search.titleExploreAll');
  };

  return (
    <main className="mx-auto max-w-[1280px] space-y-5 px-3 sm:px-4 py-5 sm:py-7">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label={t('search.breadcrumbAria')}
        className="flex items-center gap-2 text-xs text-slate-500"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t('search.breadcrumbHome')}
        </Link>
        <span className="text-slate-300">/</span>
        <Link to="/categories" className="text-slate-600 hover:text-blue-600 transition">
          {t('search.breadcrumbCategories')}
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
            <p className="text-xs sm:text-sm text-slate-500">{t('search.subtitle')}</p>
          </div>

          {/* Search Input Box */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={t('search.inputPlaceholder')}
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition shadow-2xs placeholder:text-slate-400"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => setInputVal('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title={t('search.clearKeyword')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs shrink-0 cursor-pointer"
            >
              {t('search.submitButton')}
            </button>
          </form>
        </div>

        {/* Active Filter Chips */}
        {activeBadges.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-blue-600" />{' '}
              {t('search.filteringLabel')}
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
                  title={t('search.removeFilter', { label: badge.label })}
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
              {t('search.clearAllFilters')}
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
          aria-label={t('search.resultsAria')}
          className="flex-1 min-w-0 w-full rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 shadow-xs"
        >
          <CatalogListing
            key={`${search}-${categoryId}-${rawCity}-${rawMinPrice}-${rawMaxPrice}-${rawMinRating}-${rawInStock}-${rawTrendingOnly}-${rawMinPurchase}`}
            search={search}
            categoryId={categoryId}
            city={rawCity}
            minPrice={rawMinPrice}
            maxPrice={rawMaxPrice}
            minRating={rawMinRating}
            inStock={rawInStock}
            trendingOnly={rawTrendingOnly}
            minPurchaseCount={rawMinPurchase}
            initialSortBy={rawSortBy}
            onSortChange={(nextSort) => {
              const nextParams = new URLSearchParams(params);
              if (nextSort === 'newest') nextParams.delete('sortBy');
              else nextParams.set('sortBy', nextSort);
              setParams(nextParams);
            }}
            onOpenMobileFilter={() => setIsMobileFilterOpen(true)}
            activeFilterCount={activeBadges.length}
          />
        </section>
      </div>
    </main>
  );
}
