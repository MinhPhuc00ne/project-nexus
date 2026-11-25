import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Role } from '@nexus/types';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children?: ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { t } = useTranslation('common');
  const { token, user, storedUser, isLoading } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <p role="status" className="text-sm font-medium text-slate-600">
          {t('states.checkingAccess')}
        </p>
      </main>
    );
  }

  const effectiveRole = (user?.role || storedUser?.role) as Role | undefined;
  if (allowedRoles && (!effectiveRole || !allowedRoles.includes(effectiveRole))) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
