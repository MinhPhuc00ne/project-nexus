import { ChevronDown, Menu, ShieldCheck, Radio, LogOut, Settings2, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clearAuthSession } from '../../../services/auth';
import type { UserProfile } from '../../../services/users';
import LanguageSwitcher from '../../common/LanguageSwitcher';
import AdminNotifications from './AdminNotifications';

// Header nhận tài khoản đã được AdminLayout xác minh qua /users/me; không tự gọi API lần nữa.
// onMenu mở sidebar mobile; thông báo lấy từ API theo tài khoản hiện tại.
export default function AdminHeader({
  onMenu,
  user,
}: {
  onMenu: () => void;
  user: UserProfile;
  pendingCount?: number;
}) {
  // State cục bộ chỉ để mở/đóng danh sách thông báo, không sửa dữ liệu nghiệp vụ.
  const { t } = useTranslation(['admin', 'common']);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuId = useId();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Bấm ra ngoài đóng dropdown; Escape đóng và trả focus về nút tài khoản để dùng bàn phím.
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!userMenuRef.current?.contains(event.target)) setShowUserMenu(false);
      if (!notificationRef.current?.contains(event.target)) setShowNotifications(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showUserMenu) userButtonRef.current?.focus();
      setShowUserMenu(false);
      setShowNotifications(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showUserMenu]);

  // Chuyển trang thì đóng các bảng nổi, header vẫn được giữ trong AdminLayout.
  useEffect(() => {
    setShowUserMenu(false);
    setShowNotifications(false);
  }, [pathname]);

  const displayName = user.fullName || user.email;
  const initials = (user?.fullName || user?.email || '')
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    setShowUserMenu(false);
    // Dùng cùng hàm với HomeHeader: xóa user/token và gửi yêu cầu thu hồi refresh token.
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <header className="relative z-20 flex min-h-20 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          aria-label={t('admin:header.openMenu')}
          className="rounded-lg p-2 text-primary hover:bg-blue-50 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <span className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-[10px] font-bold text-primary">
          <ShieldCheck size={13} />
          {t('admin:header.panelTitle')}
        </span>
        <span className="hidden items-center gap-2 text-[11px] text-slate-500 xl:flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {t('admin:header.clusterStatus')}
        </span>
        <span className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-primary 2xl:flex">
          <Radio size={13} />
          {t('admin:header.broadcastReady')}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher compact />
        <div ref={notificationRef} className="relative">
          <AdminNotifications
            key={user.id}
            userId={user.id}
            isOpen={showNotifications}
            onToggle={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
          />
        </div>
        {/* Tài khoản: bấm tên/avatar mở bảng thông tin, điều hướng và đăng xuất. */}
        <div
          ref={userMenuRef}
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setShowUserMenu(false);
          }}
        >
          <button
            ref={userButtonRef}
            type="button"
            aria-label={t('admin:header.accountOptionsAria')}
            aria-expanded={showUserMenu}
            aria-controls={userMenuId}
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span className="hidden max-w-36 text-right sm:block">
              <span className="block truncate text-xs font-semibold text-slate-900">
                {displayName}
              </span>
              <span className="mt-0.5 block text-[9px] font-bold tracking-wider text-primary">
                {user.role}
              </span>
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-white">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initials || <UserRound size={18} />
              )}
            </span>
            <ChevronDown
              size={13}
              className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showUserMenu && (
            <div
              id={userMenuId}
              className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
            >
              {/* Thông tin tài khoản đang đăng nhập; vẫn hiển thị khi tên ở header bị ẩn trên mobile. */}
              <div className="mb-2 border-b border-slate-100 px-3 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                {user?.email && (
                  <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>
                )}
              </div>
              <Link
                to="/admin/settings"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-primary"
                onClick={() => setShowUserMenu(false)}
              >
                <Settings2 size={16} />
                {t('admin:header.settingsLink')}
              </Link>
              <div className="my-1.5 border-t border-slate-100" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-red-500 hover:bg-red-50"
              >
                <LogOut size={16} />
                {t('admin:header.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
