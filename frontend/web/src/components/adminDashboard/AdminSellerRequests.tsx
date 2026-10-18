import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getSellerRequests, type PaginatedResult } from '../../services/admin';
import type { SellerUpgradeRequest } from '../../services/users';

export type SellerRequestFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

function useSellerRequests() {
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

  // AdminLayout mounts this provider only after verifying the ADMIN session.
  useEffect(() => {
    const current = ++revision.current;
    setLoading(true);
    setError('');
    setResult((previous) => ({ ...previous, items: [] }));
    void Promise.all([
      getSellerRequests({ status: status === 'ALL' ? undefined : status, page, limit: 10 }),
      getSellerRequests({ status: 'PENDING', page: 1, limit: 1 }),
    ])
      .then(([list, pending]) => {
        if (current !== revision.current) return;
        setPendingTotal(pending.total);
        if (page > Math.max(1, list.totalPages)) {
          setPage(Math.max(1, list.totalPages));
          return;
        }
        setResult(list);
      })
      .catch((cause) => {
        if (current !== revision.current) return;
        setError(cause instanceof Error ? cause.message : 'Không thể tải hồ sơ người bán.');
      })
      .finally(() => {
        if (current === revision.current) setLoading(false);
      });
    return () => {
      revision.current++;
    };
  }, [status, page, refreshRevision]);

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

export function useAdminSellerRequests() {
  const state = useContext(Context);
  if (!state) throw new Error('AdminSellerRequestsProvider is required');
  return state;
}

export function AdminSellerRequestsProvider({ children }: { children: ReactNode }) {
  const state = useSellerRequests();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
