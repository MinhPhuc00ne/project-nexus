import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NonAdminLayout() {
  const { token, isLoading, isAdmin } = useAuth();

  if (!token) return <Outlet />;

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <p role="status">Đang kiểm tra quyền truy cập…</p>
      </main>
    );
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
