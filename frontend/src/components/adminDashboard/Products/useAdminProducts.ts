import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { listAdminProducts, listAdminTrendingProducts } from '@/features/admin/services/admin';
import type { AdminTrendingProduct } from '@/features/admin/types/admin-product.types';
import type {
  AdminProduct,
  QueryAdminProductsParams,
} from '@/features/admin/types/admin-product.types';
import type { PaginatedResult } from '@/features/admin/types/admin.types';

export type TrendingFilter = 'all' | 'trending';

async function loadProducts(
  query: QueryAdminProductsParams,
  filter: TrendingFilter,
  trendingProducts: AdminTrendingProduct[] | null,
  signal: AbortSignal,
): Promise<PaginatedResult<AdminProduct>> {
  if (filter === 'all') return listAdminProducts(query, signal);
  const ids = new Set(trendingProducts?.map((product) => product.id));
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const products: AdminProduct[] = [];
  if (ids.size) {
    const first = await listAdminProducts({ ...query, page: 1, limit: 100 }, signal);
    products.push(...first.items);
    for (let nextPage = 2; nextPage <= first.totalPages; nextPage += 1) {
      signal.throwIfAborted();
      const next = await listAdminProducts({ ...query, page: nextPage, limit: 100 }, signal);
      products.push(...next.items);
    }
  }
  const items = products.filter((product) => ids.has(product.id));
  return {
    items: items.slice((page - 1) * limit, page * limit),
    total: items.length,
    totalPages: Math.ceil(items.length / limit),
    page,
    limit,
  };
}

export function useAdminProducts() {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<QueryAdminProductsParams>({ page: 1, limit: 10 });
  const [result, setResult] = useState<PaginatedResult<AdminProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [trendingProducts, setTrendingProducts] = useState<AdminTrendingProduct[]>([]);
  const [trendingError, setTrendingError] = useState('');
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingFilter, setTrendingFilterValue] = useState<TrendingFilter>('all');
  const filterProducts = trendingFilter === 'all' ? null : trendingProducts;
  const filterError = trendingFilter === 'all' ? '' : trendingError;
  const waitingForTrending = trendingFilter !== 'all' && trendingLoading;

  useEffect(() => {
    const controller = new AbortController();
    setTrendingProducts([]);
    setTrendingError('');
    setTrendingLoading(true);
    void listAdminTrendingProducts(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted)
          setTrendingProducts(value.items.filter((item) => item.isTrending));
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setTrendingError(
            cause instanceof Error ? cause.message : t('products.trending.loadError'),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setTrendingLoading(false);
      });
    return () => controller.abort();
  }, [revision, token, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = search.trim() || undefined;
      setQuery((current) =>
        current.search === value ? current : { ...current, search: value, page: 1 },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    if (waitingForTrending) return () => controller.abort();
    if (filterError) {
      setError(filterError);
      setLoading(false);
      return () => controller.abort();
    }
    void loadProducts(query, trendingFilter, filterProducts, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, value.totalPages);
        if ((query.page ?? 1) > lastPage) {
          setQuery((current) => ({ ...current, page: lastPage }));
          return;
        }
        setResult(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : t('products.loadErr'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, revision, token, trendingFilter, filterProducts, filterError, waitingForTrending]);

  return {
    search,
    setSearch,
    query,
    setQuery,
    result,
    loading,
    error,
    trendingProducts,
    trendingError,
    trendingFilter,
    setTrendingFilter: (value: TrendingFilter) => {
      setTrendingFilterValue(value);
      setQuery((current) => ({ ...current, page: 1 }));
    },
    refresh: () => setRevision((value) => value + 1),
  };
}
