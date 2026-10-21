import { Navigate, useLocation } from 'react-router-dom';
import ProfileEditor from '../../components/profile/ProfileEditor';
import { useAuth } from '../../contexts/AuthContext';

export default function BuyerProfilePage() {
  const { user, token, isLoading, refreshProfile } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isLoading)
    return (
      <p role="status" className="p-10 text-center">
        Đang tải hồ sơ…
      </p>
    );
  if (!user)
    return (
      <div className="p-10 text-center">
        <p role="alert">Chưa thể tải hồ sơ từ máy chủ.</p>
        <button
          onClick={() => void refreshProfile()}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Thử lại
        </button>
      </div>
    );
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <h1 className="mb-1 text-xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
      <p className="mb-6 text-xs text-slate-500">Quản lý và cập nhật thông tin cá nhân của bạn.</p>
      <ProfileEditor key={user.id} profile={user} />
    </div>
  );
}
