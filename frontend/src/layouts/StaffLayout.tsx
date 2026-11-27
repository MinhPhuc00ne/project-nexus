import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/contracts';
import { useAuth } from '../contexts/AuthContext';

/**
 * Dedicated layout container for staff members (Support Staff and Admin).
 * Enforces role access and renders child staff routes via Outlet.
 */
export default function StaffLayout() {
  const { t } = useTranslation(['staff', 'common']);
  const { token, user, isLoading, refreshProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  if (isLoading || retrying) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <p role="status" className="text-sm text-slate-600">
          {t('common:states.checkingAccess')}
        </p>
      </main>
    );
  }

  const isStaffOrAdmin = user?.role === Role.SUPPORT_STAFF || user?.role === Role.ADMIN;

  if (isStaffOrAdmin) {
    return <Outlet />;
  }

  const retry = async (): Promise<void> => {
    setRetrying(true);
    try {
      await refreshProfile();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-primary">
          {user ? t('common:access.forbiddenTitle') : t('common:access.cannotVerifyTitle')}
        </h1>
        <p role={!user ? 'alert' : undefined} className="mt-3 text-sm leading-6 text-slate-500">
          {user ? t('staff:layout.forbiddenDesc') : t('common:access.cannotVerifyDesc')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!user && (
            <button
              onClick={() => void retry()}
              className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              {t('common:actions.retry')}
            </button>
          )}
          <a
            href="/"
            className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-semibold text-primary"
          >
            {t('common:access.backHome')}
          </a>
          <a
            href="/login"
            className="rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600"
          >
            {t('common:access.switchAccount')}
          </a>
        </div>
      </section>
    </main>
  );
}
