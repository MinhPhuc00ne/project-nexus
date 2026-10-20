import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function StaffSession() {
  const { token, isLoading, isStaff } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <p role="status">Đang kiểm tra quyền nhân viên hỗ trợ…</p>
      </main>
    );
  }

  if (!isStaff) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
        <p role="alert" className="font-semibold text-slate-800">
          Tài khoản của bạn không có quyền truy cập khu vực nhân viên hỗ trợ.
        </p>
        <button
          type="button"
          onClick={() => window.location.assign('/')}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition"
        >
          Về trang chủ
        </button>
      </main>
    );
  }

  return <Outlet />;
}
