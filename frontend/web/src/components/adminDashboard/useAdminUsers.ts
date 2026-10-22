import { useEffect, useState } from 'react';
import { listUsers, type PaginatedResult } from '../../services/admin';
import type { AdminUser, QueryUsersParams } from '../../types/user.types';
import { useAuth } from '../../contexts/AuthContext';

export function useAdminUsers(preview: boolean) {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<QueryUsersParams>({ page: 1 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<PaginatedResult<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Gửi từ khóa sau khi ngừng gõ; tìm kiếm/lọc luôn bắt đầu lại từ trang 1.
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
          setError(cause instanceof Error ? cause.message : 'Không thể tải danh sách người dùng.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    // Hủy request cũ để phản hồi đến muộn không ghi đè bộ lọc/trang mới.
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
