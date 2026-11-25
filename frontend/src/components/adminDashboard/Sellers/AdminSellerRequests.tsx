import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { getSellerRequests } from '../../../services/admin';
import type { PaginatedResult } from '../../../types/admin.types';
import type { SellerUpgradeRequest } from '../../../services/users';
import { useAuth } from '../../../contexts/AuthContext';

export type SellerRequestFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

// Giữ danh sách/bộ lọc/phân trang dùng chung cho panel, sidebar và trang tổng quan.
function useSellerRequests() {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const [status, setStatus] = useState<SellerRequestFilter>('PENDING');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedResult<SellerUpgradeRequest>>({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [pendingTotal, setPendingTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshRevision, setRefreshRevision] = useState(0);
  const revision = useRef(0);
  const inFlight = useRef<{
    key: string;
    promise: Promise<[PaginatedResult<SellerUpgradeRequest>, number]>;
  } | null>(null);

  // AdminLayout chỉ tạo provider này sau khi xác minh tài khoản có role ADMIN.
  // Tải lại khi đổi trạng thái, đổi trang hoặc gọi refresh().
  useEffect(() => {
    const current = ++revision.current;
    setLoading(true);
    setError('');
    setResult((previous) => ({ ...previous, items: [] }));
    // Reuse a pending load during StrictMode effect replay, but always reload after
    // an explicit refresh or a session/filter/page change.
    const key = JSON.stringify([token, status, page, refreshRevision]);
    if (inFlight.current?.key !== key) {
      const list = getSellerRequests({
        status: status === 'ALL' ? undefined : status,
        page,
        limit: 10,
      });
      const pendingTotal =
        status === 'PENDING'
          ? list.then((result) => result.total)
          : getSellerRequests({ status: 'PENDING', page: 1, limit: 1 }).then(
              (result) => result.total,
            );
      const request = { key, promise: Promise.all([list, pendingTotal]) };
      inFlight.current = request;
      void request.promise.then(
        () => {
          if (inFlight.current === request) inFlight.current = null;
        },
        () => {
          if (inFlight.current === request) inFlight.current = null;
        },
      );
    }
    void inFlight.current.promise
      .then(([list, pending]) => {
        // Nếu bộ lọc/trang đã đổi trong lúc chờ, bỏ phản hồi cũ.
        if (current !== revision.current) return;
        setPendingTotal(pending);
        // Sau khi duyệt hồ sơ cuối trang, quay về trang còn dữ liệu nếu số trang giảm.
        if (page > Math.max(1, list.totalPages)) {
          setPage(Math.max(1, list.totalPages));
          return;
        }
        setResult(list);
      })
      .catch((cause) => {
        if (current !== revision.current) return;
        setError(cause instanceof Error ? cause.message : t('sellers.loadErr'));
      })
      .finally(() => {
        if (current === revision.current) setLoading(false);
      });
    return () => {
      revision.current++;
    };
  }, [token, status, page, refreshRevision]);

  // Tăng revision để effect chạy lại, kể cả khi bộ lọc và số trang vẫn như cũ.
  const refresh = useCallback(() => setRefreshRevision((value) => value + 1), []);
  return {
    status,
    changeStatus: (value: SellerRequestFilter) => {
      setStatus(value);
      setPage(1);
    },
    page,
    setPage,
    result,
    pendingTotal,
    loading,
    error,
    refresh,
  };
}

const Context = createContext<ReturnType<typeof useSellerRequests> | null>(null);

// Các component gọi hook này để đọc cùng một state của provider, không tạo danh sách riêng.
export function useAdminSellerRequests() {
  const state = useContext(Context);
  if (!state) throw new Error('AdminSellerRequestsProvider is required');
  return state;
}

export function AdminSellerRequestsProvider({ children }: { children: ReactNode }) {
  const state = useSellerRequests();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
