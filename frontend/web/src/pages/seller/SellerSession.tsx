import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getStoredToken } from '../../services/auth';
import { getSellerSession, SellerSessionError } from '../../services/seller';
import type { UserProfile } from '../../services/users';

const SellerContext = createContext<UserProfile | null>(null);

export function useSellerSession() {
  const user = useContext(SellerContext);
  if (!user) throw new Error('SellerSession is required');
  return user;
}

export default function SellerSession({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(0);
  const revision = useRef(0);
  const verifiedToken = useRef<string | null>(null);
  const reload = useCallback(async () => {
    const current = ++revision.current;
    if (getStoredToken() !== verifiedToken.current) setLoading(true);
    setError('');
    setStatus(0);
    try {
      const profile = await getSellerSession();
      if (current !== revision.current) return;
      verifiedToken.current = getStoredToken();
      setUser(profile);
    } catch (cause) {
      if (current !== revision.current) return;
      verifiedToken.current = null;
      setUser(null);
      setStatus(cause instanceof SellerSessionError ? cause.status : 0);
      setError(cause instanceof Error ? cause.message : 'Không thể tải hồ sơ người bán.');
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      void reload();
    };
    const syncStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('nexus:auth-')) sync();
    };
    sync();
    window.addEventListener('nexus:auth-change', sync);
    window.addEventListener('storage', syncStorage);
    window.addEventListener('focus', sync);
    return () => {
      revision.current++;
      window.removeEventListener('nexus:auth-change', sync);
      window.removeEventListener('storage', syncStorage);
      window.removeEventListener('focus', sync);
    };
  }, [reload]);

  if (loading)
    return (
      <p role="status" className="p-8 text-center">
        Đang xác thực người bán…
      </p>
    );
  if (status === 401) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (status === 403) return <Navigate to="/" replace />;
  if (error || !user)
    return (
      <div role="alert" className="p-8 text-center">
        <p>{error}</p>
        <button
          className="mt-4 rounded bg-blue-700 px-4 py-2 text-white"
          onClick={() => void reload()}
        >
          Thử lại
        </button>
      </div>
    );
  return <SellerContext.Provider value={user}>{children}</SellerContext.Provider>;
}
