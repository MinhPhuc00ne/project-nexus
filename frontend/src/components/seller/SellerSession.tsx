import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/contracts';
import { useAuth } from '../../contexts/AuthContext';
import type { UserProfile } from '@/features/account/services/users';

const SellerContext = createContext<UserProfile | null>(null);

export function useSellerSession() {
  const user = useContext(SellerContext);
  if (!user) throw new Error('SellerSession is required');
  return user;
}

export default function SellerSession({ children }: { children: ReactNode }) {
  const { t } = useTranslation('seller');
  const location = useLocation();
  const { token, user, isLoading, refreshProfile, switchActiveMode } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const needsSellerMode = Boolean(
    user &&
    user.role === Role.SELLER &&
    !user.isShopSuspended &&
    (!user.isSellerActive || user.currentMode !== 'SELLER'),
  );

  // Tự động kích hoạt chế độ Seller khi người bán đang ở trong Dashboard Seller (/seller/*)
  useEffect(() => {
    let cancelled = false;
    if (!needsSellerMode || modeError) return;
    void switchActiveMode('SELLER').catch((error: unknown) => {
      if (!cancelled) {
        setModeError(error instanceof Error ? error.message : t('session.switchModeFailed'));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [modeError, needsSellerMode, switchActiveMode, t]);

  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (isLoading || retrying || (needsSellerMode && !modeError))
    return (
      <p role="status" className="p-8 text-center">
        {t('session.verifying')}
      </p>
    );
  if (user && user.role !== Role.SELLER) return <Navigate to="/" replace />;
  if (modeError) {
    return (
      <div role="alert" className="p-8 text-center">
        <p>{t('session.syncModeFailed', { error: modeError })}</p>
        <button
          className="mt-4 rounded bg-blue-700 px-4 py-2 text-white"
          onClick={() => setModeError(null)}
        >
          {t('session.retry')}
        </button>
      </div>
    );
  }
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
        <p>{t('session.loadProfileFailed')}</p>
        <button
          className="mt-4 rounded bg-blue-700 px-4 py-2 text-white"
          onClick={() => void retry()}
        >
          {t('session.retry')}
        </button>
      </div>
    );
  }

  const sellerUser: UserProfile = {
    ...user,
    isSellerActive: Boolean(user.isSellerActive && !user.isShopSuspended),
    currentMode: 'SELLER',
  };

  return <SellerContext.Provider value={sellerUser}>{children}</SellerContext.Provider>;
}
