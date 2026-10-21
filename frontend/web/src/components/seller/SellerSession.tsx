import { createContext, useContext, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Role } from '@nexus/types';
import { useAuth } from '../../contexts/AuthContext';
import type { UserProfile } from '../../services/users';

const SellerContext = createContext<UserProfile | null>(null);

export function useSellerSession() {
  const user = useContext(SellerContext);
  if (!user) throw new Error('SellerSession is required');
  return user;
}

export default function SellerSession({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { token, user, isLoading, refreshProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);
  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (isLoading || retrying)
    return (
      <p role="status" className="p-8 text-center">
        Đang xác thực người bán…
      </p>
    );
  if (user && user.role !== Role.SELLER) return <Navigate to="/" replace />;
  if (!user || typeof user.id !== 'string') {
    const retry = async (): Promise<void> => {
      setRetrying(true);
      try {
        await refreshProfile();
      } finally {
        setRetrying(false);
      }
    };
    return (
      <div role="alert" className="p-8 text-center">
        <p>Không thể tải hồ sơ người bán từ máy chủ.</p>
        <button
          className="mt-4 rounded bg-blue-700 px-4 py-2 text-white"
          onClick={() => void retry()}
        >
          Thử lại
        </button>
      </div>
    );
  }
  return <SellerContext.Provider value={user}>{children}</SellerContext.Provider>;
}
