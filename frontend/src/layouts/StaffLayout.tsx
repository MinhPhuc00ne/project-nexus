import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Role } from '../types';
import { useAuth } from '../contexts/AuthContext';

/**
 * Dedicated layout container for staff members (Support Staff and Admin).
 * Enforces role access and renders child staff routes via Outlet.
 */
export default function StaffLayout() {
  const { token, user, isLoading, refreshProfile } = useAuth();
  const [retrying, setRetrying] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  if (isLoading || retrying) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6">
        <p role="status" className="text-sm text-slate-600">
          Đang kiểm tra quyền truy cập…
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
          {user ? '403 — Không có quyền truy cập' : 'Không thể kiểm tra quyền truy cập'}
        </h1>
        <p role={!user ? 'alert' : undefined} className="mt-3 text-sm leading-6 text-slate-500">
          {user
            ? 'Chỉ nhân sự hỗ trợ (Staff) hoặc Quản trị viên (Admin) mới được truy cập khu vực này.'
            : 'Chưa thể lấy thông tin tài khoản từ máy chủ. Vui lòng thử lại.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!user && (
            <button
              onClick={() => void retry()}
              className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white cursor-pointer"
            >
              Thử lại
            </button>
          )}
          <a
            href="/"
            className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-semibold text-primary"
          >
            Về trang chủ
          </a>
          <a
            href="/login"
            className="rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600"
          >
            Đổi tài khoản
          </a>
        </div>
      </section>
    </main>
  );
}
