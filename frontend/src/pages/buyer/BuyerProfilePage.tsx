import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import ProfileEditor from '../../components/profile/ProfileEditor';
import { useAuth } from '../../contexts/AuthContext';
import BuyerBidsPage from './BuyerBidsPage';

export default function BuyerProfilePage() {
  const { user, token, isLoading, refreshProfile } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const showAuctionOffers = searchParams.get('tab') === 'auction-offers';
  if (!token)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
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
      <nav
        aria-label="Nội dung hồ sơ"
        className="flex gap-2 border-b border-slate-200 overflow-x-auto"
      >
        <Link
          to="/buyer/profile"
          aria-current={!showAuctionOffers ? 'page' : undefined}
          className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 ${!showAuctionOffers ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-blue-700'}`}
        >
          Thông tin cá nhân
        </Link>
        <Link
          to="/buyer/profile?tab=auction-offers"
          aria-current={showAuctionOffers ? 'page' : undefined}
          className={`whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 ${showAuctionOffers ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-blue-700'}`}
        >
          Xác nhận mua đấu giá
        </Link>
      </nav>
      {showAuctionOffers ? (
        <BuyerBidsPage key={user.id} purchasesOnly />
      ) : (
        <ProfileEditor key={user.id} profile={user} />
      )}
    </div>
  );
}
