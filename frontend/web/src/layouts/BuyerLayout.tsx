import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Role } from '@nexus/types';
import {
  LayoutDashboard,
  User,
  Package,
  MapPin,
  Wallet,
  Heart,
  Gavel,
  ShieldAlert,
  Store,
  ChevronRight,
  Award,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UpgradeSellerModal } from '../components/headers/UpgradeSellerModal';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

const navItems: NavItem[] = [
  {
    to: '/buyer',
    label: 'Tổng quan tài khoản',
    icon: <LayoutDashboard size={18} />,
    end: true,
  },
  {
    to: '/buyer/profile',
    label: 'Hồ sơ cá nhân',
    icon: <User size={18} />,
  },
  {
    to: '/buyer/orders',
    label: 'Đơn hàng của tôi',
    icon: <Package size={18} />,
  },
  {
    to: '/buyer/addresses',
    label: 'Sổ địa chỉ nhận hàng',
    icon: <MapPin size={18} />,
  },
  {
    to: '/buyer/wallet',
    label: 'Ví NEXUS Pay',
    icon: <Wallet size={18} />,
  },
  {
    to: '/buyer/wishlist',
    label: 'Sản phẩm yêu thích',
    icon: <Heart size={18} />,
  },
  {
    to: '/buyer/bids',
    label: 'Phiên đấu giá',
    icon: <Gavel size={18} />,
  },
  {
    to: '/buyer/disputes',
    label: 'Khiếu nại & Tranh chấp',
    icon: <ShieldAlert size={18} />,
  },
];

export default function BuyerLayout() {
  const { user: profile } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const location = useLocation();

  const isSeller = profile?.role === Role.SELLER;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50/70 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <NavLink to="/" className="hover:text-blue-600 transition-colors">
            Trang chủ
          </NavLink>
          <ChevronRight size={13} />
          <span className="font-semibold text-slate-800">Tài khoản Buyer</span>
          {location.pathname !== '/buyer' && (
            <>
              <ChevronRight size={13} />
              <span className="text-slate-600">
                {navItems.find((item) => item.to === location.pathname)?.label || 'Chi tiết'}
              </span>
            </>
          )}
        </nav>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Buyer Navigation Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* User Profile Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3.5 mb-4">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="h-12 w-12 rounded-full object-cover border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-lg shadow-sm">
                    {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-900">
                    {profile?.fullName || 'Người dùng NEXUS'}
                  </h3>
                  <p className="truncate text-xs text-slate-500">
                    {profile?.email || 'Chưa cập nhật email'}
                  </p>
                  <span className="mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                    {isSeller ? 'Người bán (Seller)' : 'Khách hàng (Buyer)'}
                  </span>
                </div>
              </div>

              {/* Balance & Reputation Pills */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
                    <Wallet size={12} className="text-amber-600" />
                    <span>Số dư ví</span>
                  </div>
                  <span className="font-bold text-emerald-600 text-xs truncate block">
                    {profile?.wallet?.balance
                      ? `${Number(profile.wallet.balance).toLocaleString('vi-VN')} ₫`
                      : '0 ₫'}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-0.5">
                    <Award size={12} className="text-blue-600" />
                    <span>Điểm uy tín</span>
                  </div>
                  <span className="font-bold text-slate-800 text-xs truncate block">
                    {profile?.reputationScore ?? 100} ({profile?.trustLevel ?? 'STANDARD'})
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Upgrade to Seller Promo Card */}
            {!isSeller && (
              <div className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/60 via-amber-50/40 to-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-orange-600 font-bold text-xs mb-1">
                  <Store size={16} />
                  <span>Mở gian hàng kinh doanh</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  Nâng cấp lên tài khoản Người bán để mở shop và tổ chức đấu giá trực tiếp 3D!
                </p>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="w-full py-2 px-3 rounded-xl bg-[#f24e1e] hover:bg-[#d63b0e] text-white font-bold text-xs transition shadow-sm cursor-pointer"
                >
                  Nộp hồ sơ ngay
                </button>
              </div>
            )}
          </aside>

          {/* Right Column: Dynamic Content Outlet */}
          <section className="lg:col-span-8 xl:col-span-9 min-h-[500px]">
            <Outlet />
          </section>
        </div>
      </div>

      {/* Upgrade Seller Modal */}
      <UpgradeSellerModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        profile={profile}
      />
    </div>
  );
}
