import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, ChevronDown, LogOut, X } from 'lucide-react';
import { clearAuthSession, type AuthUser } from '../../services/auth';
import {
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications';
import type { UserNotification } from '../../types/notification.types';
import {
  changeStaffPassword,
  getStaffProfile,
  updateStaffProfile,
  type StaffProfile,
} from '../../services/staff';

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
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [profileError, setProfileError] = useState('');
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFormError, setProfileFormError] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [isPasswordEditorOpen, setIsPasswordEditorOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFormError, setPasswordFormError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const loadNotifications = useCallback(async () => {
    setNotificationLoading(true);
    setNotificationError('');
    try {
      const [page, count] = await Promise.all([
        getNotifications({ page: 1, limit: 6 }),
        getNotificationUnreadCount(),
      ]);
      setNotifications(page.items);
      setUnreadCount(count.unreadCount);
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Không tải được thông báo.');
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getStaffProfile()
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setProfileError(error instanceof Error ? error.message : 'Không tải được hồ sơ Staff.');
      });
    void getNotificationUnreadCount()
      .then((result) => {
        if (!cancelled) setUnreadCount(result.unreadCount);
      })
      .catch(() => {
        // Notifications are optional to the staff workspace.
      });
    return () => {
      cancelled = true;
    };
  }, [account?.id]);

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

  const accountName = profile?.fullName || account?.fullName || 'Tài khoản Staff';
  const accountEmail = profile?.email || account?.email || '';
  const accountAvatar = profile?.avatarUrl || account?.avatarUrl;
  const canEditProfile = (profile?.role || account?.role) === 'SUPPORT_STAFF';

  function openProfileEditor() {
    setProfileName(profile?.fullName || account?.fullName || '');
    setProfilePhone(profile?.phoneNumber || '');
    setProfileAvatar(profile?.avatarUrl || '');
    setProfileFormError('');
    setIsProfileEditorOpen(true);
    setIsAccountOpen(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileFormError('');
    try {
      const updated = await updateStaffProfile({
        fullName: profileName.trim(),
        phoneNumber: profilePhone.trim() || null,
        avatarUrl: profileAvatar.trim() || null,
      });
      setProfile(updated);
      setIsProfileEditorOpen(false);
    } catch (error) {
      setProfileFormError(error instanceof Error ? error.message : 'Không cập nhật được hồ sơ.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordSaving) return;
    setPasswordSaving(true);
    setPasswordFormError('');
    try {
      await changeStaffPassword(currentPassword, newPassword);
      clearAuthSession();
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch (error) {
      setPasswordFormError(error instanceof Error ? error.message : 'Không đổi được mật khẩu.');
    } finally {
      setPasswordSaving(false);
    }
  }
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
              const nextOpen = !isNotificationsOpen;
              setIsNotificationsOpen(nextOpen);
              setIsAccountOpen(false);
              if (nextOpen) void loadNotifications();
            }}
            className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff] [&_i]:absolute [&_i]:[top:7px] [&_i]:[right:7px] [&_i]:w-1.5 [&_i]:h-1.5 [&_i]:[border:1px_solid_white] [&_i]:rounded-full [&_i]:[background:var(--staff-accent)]"
            aria-label="Thông báo"
          >
            <Bell size={18} />
            {unreadCount > 0 && <i />}
          </button>
          {isNotificationsOpen && (
            <section
              id="staff-notifications-panel"
              aria-label="Thông báo của bạn"
              className="absolute right-0 top-full z-40 mt-3 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-100 bg-white shadow-xl max-[480px]:fixed max-[480px]:right-3 max-[480px]:top-[70px] max-[480px]:mt-0"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Thông báo</h2>
                  <p className="text-[11px] text-slate-500">{unreadCount} chưa đọc</p>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                    onClick={async () => {
                      try {
                        await markAllNotificationsRead();
                        setNotifications((items) =>
                          items.map((item) => ({ ...item, isRead: true })),
                        );
                        setUnreadCount(0);
                      } catch (error) {
                        setNotificationError(
                          error instanceof Error ? error.message : 'Không cập nhật được thông báo.',
                        );
                      }
                    }}
                  >
                    Đọc tất cả
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Đóng thông báo"
                  onClick={() => setIsNotificationsOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationError ? (
                  <p role="alert" className="p-4 text-xs text-red-700">
                    {notificationError}
                  </p>
                ) : notificationLoading ? (
                  <p role="status" className="p-6 text-center text-xs text-slate-500">
                    Đang tải thông báo…
                  </p>
                ) : notifications.length ? (
                  notifications.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={async () => {
                        if (!item.isRead) {
                          try {
                            await markNotificationRead(item.id);
                            setNotifications((items) =>
                              items.map((row) =>
                                row.id === item.id ? { ...row, isRead: true } : row,
                              ),
                            );
                            setUnreadCount((count) => Math.max(0, count - 1));
                          } catch (error) {
                            setNotificationError(
                              error instanceof Error
                                ? error.message
                                : 'Không cập nhật được thông báo.',
                            );
                          }
                        }
                      }}
                      className={`block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${item.isRead ? 'bg-white' : 'bg-blue-50/50'}`}
                    >
                      <span className="block text-xs font-semibold text-slate-800">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-slate-600">
                        {item.content}
                      </span>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-6 text-center text-xs text-slate-500">Chưa có thông báo.</p>
                )}
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
              {accountAvatar ? (
                <img src={accountAvatar} alt="" className="h-full w-full object-cover" />
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
                  {accountEmail || 'Chưa có thông tin email'}
                </p>
                {profileError && (
                  <p role="status" className="mt-2 text-[11px] text-amber-700">
                    {profileError}
                  </p>
                )}
                <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                  Nhân viên hỗ trợ
                </span>
              </div>
              {canEditProfile && (
                <>
                  <button
                    type="button"
                    onClick={openProfileEditor}
                    className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
                  >
                    Chỉnh sửa hồ sơ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPassword('');
                      setNewPassword('');
                      setPasswordFormError('');
                      setIsPasswordEditorOpen(true);
                      setIsAccountOpen(false);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
                  >
                    Đổi mật khẩu
                  </button>
                </>
              )}
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
      {isProfileEditorOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={saveProfile}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hồ sơ Staff</h2>
              <p className="mt-1 text-xs text-slate-500">
                Thông tin được lưu vào tài khoản của bạn.
              </p>
            </div>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Họ tên
              <input
                required
                minLength={2}
                maxLength={100}
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Số điện thoại
              <input
                value={profilePhone}
                onChange={(event) => setProfilePhone(event.target.value)}
                placeholder="+84901234567"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Đường dẫn ảnh đại diện
              <input
                type="url"
                value={profileAvatar}
                onChange={(event) => setProfileAvatar(event.target.value)}
                placeholder="https://…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            {profileFormError && (
              <p role="alert" className="text-sm text-red-700">
                {profileFormError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={profileSaving}
                onClick={() => setIsProfileEditorOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {profileSaving ? 'Đang lưu…' : 'Lưu hồ sơ'}
              </button>
            </div>
          </form>
        </div>
      )}
      {isPasswordEditorOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            onSubmit={savePassword}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-900">Đổi mật khẩu Staff</h2>
              <p className="mt-1 text-xs text-slate-500">Sau khi đổi, bạn sẽ cần đăng nhập lại.</p>
            </div>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Mật khẩu hiện tại
              <input
                required
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Mật khẩu mới
              <input
                required
                minLength={6}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            {passwordFormError && (
              <p role="alert" className="text-sm text-red-700">
                {passwordFormError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={passwordSaving}
                onClick={() => setIsPasswordEditorOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={passwordSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {passwordSaving ? 'Đang lưu…' : 'Đổi mật khẩu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
