import { Navigate, useLocation } from 'react-router-dom';
import ProfileEditor from '../../components/profile/ProfileEditor';
import { useAuth } from '../../contexts/AuthContext';

export default function BuyerProfilePage() {
  const { user, token, isLoading, refreshProfile } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isLoading)
    return (
      <p role="status" className="p-10 text-center text-sm text-slate-600">
        Đang tải hồ sơ…
      </p>
    );
  if (!user)
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
        <p role="alert" className="text-sm text-slate-700">
          Chưa thể tải hồ sơ từ máy chủ.
        </p>
        <button
          onClick={() => void refreshProfile()}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Thử lại
        </button>
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#1c3973]">Hồ sơ cá nhân</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý thông tin tài khoản, ảnh đại diện cá nhân và bảo mật đăng nhập.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          Chế độ hoạt động: Khách hàng (Buyer)
        </span>
      </div>
      <ProfileEditor key={user.id} profile={user} />
    </div>
  );
}
