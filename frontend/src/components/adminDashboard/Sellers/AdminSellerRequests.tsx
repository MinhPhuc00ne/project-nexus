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
import { getSellerRequests } from '@/features/admin/services/admin';
import type { PaginatedResult } from '@/features/admin/types/admin.types';
import type { SellerUpgradeRequest } from '@/features/account/services/users';
import { useAuth } from '../../../contexts/AuthContext';

export type SellerRequestFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

// Shared list/filter/pagination state used across panel, sidebar, and overview page.
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

  // AdminLayout mounts this provider only after verifying the account has role ADMIN.
  // Reload whenever status filter, page, or refresh() changes.
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
        // Discard stale responses if filters or page changed while waiting.
        if (current !== revision.current) return;
        setPendingTotal(pending);
        // After approving the last item on a page, fall back to a populated page if totalPages shrank.
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

  // Bump revision so the effect re-runs even when filter and page are unchanged.
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

// Components call this hook to read the shared provider state instead of keeping a separate list.
export function useAdminSellerRequests() {
  const state = useContext(Context);
  if (!state) throw new Error('AdminSellerRequestsProvider is required');
  return state;
}

export function AdminSellerRequestsProvider({ children }: { children: ReactNode }) {
  const state = useSellerRequests();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
