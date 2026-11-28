import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listUsers } from '@/features/admin/services/admin';
import type { PaginatedResult } from '@/features/admin/types/admin.types';
import type { AdminUser, QueryUsersParams } from '@/features/account/types/user.types';
import { useAuth } from '../../../contexts/AuthContext';

export function useAdminUsers(preview: boolean) {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<QueryUsersParams>({ page: 1 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<PaginatedResult<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search/filter changes always reset to page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((current) => {
        const value = search.trim() || undefined;
        return current.search === value ? current : { ...current, search: value, page: 1 };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    void listUsers({ ...query, limit: preview ? 3 : 10 }, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, list.totalPages);
        if ((query.page ?? 1) > lastPage) {
          setQuery((current) => ({ ...current, page: lastPage }));
          return;
        }
        setResult(list);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : t('users.loadErr'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    // Cancel prior request so late responses cannot overwrite newer filters or page.
    return () => controller.abort();
  }, [token, query, preview, revision]);

  return {
    search,
    setSearch,
    query,
    setQuery,
    result,
    loading,
    error,
    refresh: () => setRevision((current) => current + 1),
  };
}
