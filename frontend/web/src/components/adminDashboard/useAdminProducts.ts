import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listAdminProducts } from '../../services/admin';
import type { AdminProduct, QueryAdminProductsParams } from '../../types/admin-product.types';
import type { PaginatedResult } from '../../types/admin.types';

export function useAdminProducts() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<QueryAdminProductsParams>({ page: 1, limit: 10 });
  const [result, setResult] = useState<PaginatedResult<AdminProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

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
    void listAdminProducts(query, controller.signal)
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
          setError(cause instanceof Error ? cause.message : 'Không thể tải sản phẩm.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, revision, token]);

  return {
    search,
    setSearch,
    query,
    setQuery,
    result,
    loading,
    error,
    refresh: () => setRevision((value) => value + 1),
  };
}
