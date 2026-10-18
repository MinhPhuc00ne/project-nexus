import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSellerSession } from '../pages/seller/SellerSession';
import { clearAuthSession } from '../services/auth';
import { toggleSellerMode } from '../services/users';

const links = [
  ['/seller', 'Tổng quan'],
  ['/seller/products', 'Sản phẩm'],
  ['/seller/orders', 'Đơn hàng'],
  ['/seller/inventory', 'Kho hàng'],
  ['/seller/auctions', 'Đấu giá'],
  ['/seller/finance', 'Tài chính'],
  ['/seller/disputes', 'Khiếu nại'],
  ['/seller/settings', 'Cài đặt'],
] as const;

export default function SellerLayout() {
  const user = useSellerSession();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const switchToBuyer = async () => {
    setPending(true);
    setError('');
    try {
      await toggleSellerMode(false);
      navigate('/buyer');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể chuyển chế độ.');
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-6 py-4">
        <Link to="/seller" className="text-xl font-bold text-blue-700">
          NEXUS Seller
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">{user?.fullName}</span>
          <button
            disabled={pending}
            onClick={() => void switchToBuyer()}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            {pending ? 'Đang chuyển…' : 'Chuyển sang người mua'}
          </button>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              clearAuthSession();
              navigate('/login', { replace: true });
            }}
          >
            Đăng xuất
          </button>
        </div>
      </header>
      <nav
        aria-label="Điều hướng người bán"
        className="flex flex-wrap gap-2 border-b bg-white px-6 py-3"
      >
        {links.map(([to, title]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/seller'}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-blue-50'}`
            }
          >
            {title}
          </NavLink>
        ))}
      </nav>
      {error && (
        <p role="alert" className="px-6 py-3 text-red-600">
          {error}
        </p>
      )}
      <Outlet />
    </div>
  );
}
