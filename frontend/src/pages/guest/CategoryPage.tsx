import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutGrid as AppstoreOutlined } from 'lucide-react';
import {
  ArrowRight as ArrowRightOutlined,
  Search as SearchOutlined,
  RefreshCw as ReloadOutlined,
} from 'lucide-react';
import { getCategoriesApi, type CategoryNode } from '@/features/catalog/services/products.service';
import { getCategoryImageUrl } from '../../constants/categoryImages';
import { ROUTES } from '../../routes/paths';

export default function CategoryPage() {
  const { t } = useTranslation('guest');
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategoriesApi();
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
      }
    } catch (error) {
      // A hardcoded tree used to stand in here, so a failed request looked like
      // a catalogue of categories that may not exist.
      console.warn('Unable to load categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const filteredCategories = categories.filter((cat) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    if (cat.name.toLowerCase().includes(term)) return true;
    return cat.children?.some((child) => child.name.toLowerCase().includes(term));
  });

  return (
    <main className="storefront-container space-y-8 py-8">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 p-8 sm:p-10 text-white shadow-md">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-sm">
            <AppstoreOutlined /> {t('categories.badge')}
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
            {t('categories.title')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100 leading-relaxed">
            {t('categories.subtitle')}
          </p>

          <div className="mt-6 flex max-w-md items-center gap-2 rounded-xl bg-white p-1.5 shadow-lg">
            <SearchOutlined className="ml-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('categories.searchPlaceholder')}
              className="w-full bg-transparent px-2 py-1 text-sm text-ink placeholder-slate-400 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="mr-2 text-xs text-slate-400 hover:text-slate-600"
              >
                {t('categories.clearSearch')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {searchTerm
              ? t('categories.searchResultsHeading', { count: filteredCategories.length })
              : t('categories.allCategoriesHeading')}
          </h2>

          <button
            type="button"
            onClick={() => void loadCategories()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <ReloadOutlined className={loading ? 'animate-spin' : ''} />
            {t('categories.refresh')}
          </button>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-muted">{t('categories.emptyForKeyword', { keyword: searchTerm })}</p>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="mt-3 text-sm font-semibold text-blue-600 hover:underline"
            >
              {t('categories.viewAll')}
            </button>
          </div>
        ) : (
          <div className="storefront-auction-grid">
            {filteredCategories.map((cat) => {
              const imageUrl = getCategoryImageUrl(cat);
              const parentUrl = `${ROUTES.SEARCH}?categoryId=${encodeURIComponent(cat.id)}&categoryName=${encodeURIComponent(cat.name)}`;

              return (
                <div
                  key={cat.id}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <img
                        src={imageUrl}
                        alt={cat.name}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover border border-slate-100"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <Link
                          to={parentUrl}
                          className="text-base font-semibold text-ink hover:text-blue-600 transition truncate block"
                        >
                          {cat.name}
                        </Link>
                        <p className="mt-1 text-xs text-slate-400">
                          {cat.children && cat.children.length > 0
                            ? t('categories.subcategoriesCount', { count: cat.children.length })
                            : t('categories.standardCategory')}
                        </p>
                      </div>
                    </div>

                    {cat.children && cat.children.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {t('categories.featuredSubcategories')}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.children.map((child) => (
                            <Link
                              key={child.id}
                              to={`${ROUTES.SEARCH}?categoryId=${encodeURIComponent(child.id)}&categoryName=${encodeURIComponent(child.name)}`}
                              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                    <Link
                      to={parentUrl}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {t('categories.exploreCategory', { name: cat.name })}{' '}
                      <ArrowRightOutlined className="text-[10px]" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
