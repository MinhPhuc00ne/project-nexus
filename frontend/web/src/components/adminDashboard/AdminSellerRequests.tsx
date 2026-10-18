import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { getSellerRequests, type PaginatedResult } from '../../services/admin';
import { getMe, type SellerUpgradeRequest } from '../../services/users';

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
  const [allowed, setAllowed] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [sessionRevision, setSessionRevision] = useState(0);
  const [refreshRevision, setRefreshRevision] = useState(0);
  const revision = useRef(0);

  useEffect(() => {
    let active = true;
    setSessionLoading(true);
    setAllowed(false);
    setSessionError('');
    void getMe()
      .then((profile) => {
        if (!active) return;
        if (profile.role === 'ADMIN') setAllowed(true);
        else
          setSessionError(
            'Chỉ quản trị viên ADMIN có quyền truy cập trang quản trị và duyệt hồ sơ Seller.',
          );
      })
      .catch((cause) => {
        if (active)
          setSessionError(
            cause instanceof Error ? cause.message : 'Không thể xác thực quản trị viên.',
          );
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });
    const sync = () => {
      revision.current++;
      setSessionRevision((value) => value + 1);
    };
    const syncStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('nexus:auth-')) sync();
    };
    window.addEventListener('nexus:auth-change', sync);
    window.addEventListener('storage', syncStorage);
    return () => {
      active = false;
      revision.current++;
      window.removeEventListener('nexus:auth-change', sync);
      window.removeEventListener('storage', syncStorage);
    };
  }, [sessionRevision]);

  useEffect(() => {
    if (!allowed) return;
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
  }, [allowed, status, page, refreshRevision]);

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
    sessionLoading,
    sessionError,
    retrySession: () => setSessionRevision((value) => value + 1),
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
  if (state.sessionLoading)
    return (
      <p role="status" className="p-8 text-center">
        Đang xác thực quản trị viên…
      </p>
    );
  if (state.sessionError)
    return (
      <main className="mx-auto max-w-xl space-y-4 p-8">
        <p role="alert">{state.sessionError}</p>
        <Link to="/login" className="block text-blue-700 underline">
          Đăng nhập bằng tài khoản Admin
        </Link>
        <button onClick={state.retrySession} className="rounded-lg border px-4 py-2">
          Thử lại
        </button>
      </main>
    );
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
