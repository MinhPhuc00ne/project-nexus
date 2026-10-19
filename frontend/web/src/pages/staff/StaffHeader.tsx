import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown, LogOut, X } from 'lucide-react';
import { clearAuthSession, type AuthUser } from '../../services/auth';

interface StaffHeaderProps {
  account: AuthUser | null;
  searchText: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
}

export default function StaffHeader({
  account,
  searchText,
  onSearchChange,
  onOpenSidebar,
}: StaffHeaderProps) {
  const navigate = useNavigate();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handleOutsideClick = (event: PointerEvent): void => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
        notificationsRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (!isAccountOpen) return;
    const handleOutsideClick = (event: PointerEvent): void => {
      if (!accountRef.current?.contains(event.target as Node)) setIsAccountOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsAccountOpen(false);
        accountRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isAccountOpen]);

  const accountName = account?.fullName || 'Tài khoản Staff';
  const initials = accountName
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <header className="[min-height:64px] [gap:9px] px-4 max-[760px]:[min-height:58px] max-[760px]:px-2.5 sticky top-0 z-20 flex min-h-[70px] items-center gap-3 border-b border-slate-200 bg-white/95 px-5 backdrop-blur-sm">
      <button
        className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff] hidden max-[760px]:[display:inline-grid]"
        aria-label="Mở menu"
        onClick={onOpenSidebar}
      >
        <Menu size={20} />
      </button>

      <label className="flex h-11 min-w-0 max-w-xl flex-1 items-center gap-3 rounded-xl border border-transparent bg-slate-100 px-4 text-slate-500 transition focus-within:border-blue-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-50">
        <Search size={18} className="shrink-0" />
        <input
          aria-label="Tìm kiếm yêu cầu hỗ trợ"
          placeholder="Tìm khách hàng, mã yêu cầu hỗ trợ..."
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full min-w-0 border-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
        />
      </label>

      <div className="ml-auto flex items-center gap-3">
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            aria-expanded={isNotificationsOpen}
            aria-controls="staff-notifications-panel"
            onClick={() => {
              setIsNotificationsOpen((open) => !open);
              setIsAccountOpen(false);
            }}
            className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff] [&_i]:absolute [&_i]:[top:7px] [&_i]:[right:7px] [&_i]:w-1.5 [&_i]:h-1.5 [&_i]:[border:1px_solid_white] [&_i]:rounded-full [&_i]:[background:var(--staff-accent)]"
            aria-label="Thông báo"
          >
            <Bell size={18} />
          </button>
          {isNotificationsOpen && (
            <section
              id="staff-notifications-panel"
              aria-label="Thông báo của bạn"
              className="absolute right-0 top-full z-40 mt-3 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-100 bg-white shadow-xl max-[480px]:fixed max-[480px]:right-3 max-[480px]:top-[70px] max-[480px]:mt-0"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-800">Thông báo</h2>
                <button
                  type="button"
                  aria-label="Đóng thông báo"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
              <div role="status" className="px-6 py-10 text-center">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Bell size={22} />
                </span>
                <p className="text-sm font-semibold text-slate-700">Chưa có thông báo</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Thông báo mới sẽ hiển thị tại đây khi có dữ liệu từ hệ thống.
                </p>
              </div>
            </section>
          )}
        </div>

        <div ref={accountRef} className="relative border-l border-slate-100 pl-3">
          <button
            type="button"
            aria-label="Tài khoản Staff"
            aria-expanded={isAccountOpen}
            aria-controls="staff-account-panel"
            onClick={() => {
              setIsAccountOpen((open) => !open);
              setIsNotificationsOpen(false);
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl p-1.5 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700">
              {account?.avatarUrl ? (
                <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span className="max-[480px]:hidden">
              <span className="block max-w-40 truncate text-xs font-bold text-slate-800">
                {accountName}
              </span>
              <span className="mt-1 block text-[10px] text-slate-400">Nhân viên hỗ trợ</span>
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-500 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isAccountOpen && (
            <div
              id="staff-account-panel"
              className="absolute right-0 top-full z-40 mt-3 w-72 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-100 bg-white p-4 shadow-xl"
            >
              <div className="border-b border-slate-100 px-1 pb-4">
                <p className="font-bold text-slate-800">{accountName}</p>
                <p className="mt-1 break-all text-xs text-slate-500">
                  {account?.email || 'Chưa có thông tin email'}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                  Nhân viên hỗ trợ
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearAuthSession();
                  navigate('/login', { replace: true });
                }}
                className="mt-2 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-red-600 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-500"
              >
                <LogOut size={17} />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
