import { useState, useRef, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { getIntlLocale } from '../../i18n/config';
import {
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  X,
  User,
  KeyRound,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { clearAuthSession, getStoredToken, type AuthUser } from '../../services/auth';
import { createNotificationConnection } from '../../services/notificationSocket';
import { useToast } from '../../components/ToastNotification';
import {
  getNotifications,
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications';
import type { UserNotification } from '../../types/notification.types';
import { resolveStaffNotificationTarget } from './staffNotificationNavigation';
import StaffHeaderDialogs from './StaffHeaderDialogs';
import { dashboardChrome } from '../../components/dashboard/dashboardChrome';
import {
  changeStaffPassword,
  getStaffProfile,
  updateStaffProfile,
  uploadStaffAvatarFile,
  type StaffProfile,
} from '../../services/staff';

interface StaffHeaderProps {
  account: AuthUser | null;
  onOpenSidebar: () => void;
}

export default function StaffHeader({ account, onOpenSidebar }: StaffHeaderProps) {
  const { t, i18n } = useTranslation('staff');
  const locale = getIntlLocale(i18n.language);
  const navigate = useNavigate();
  const toast = useToast();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setNotificationError(
        error instanceof Error ? error.message : t('header.loadNotificationsErr'),
      );
    } finally {
      setNotificationLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void getStaffProfile()
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setProfileError(error instanceof Error ? error.message : t('header.loadProfileErr'));
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
    const userId = account?.id;
    if (!userId || !getStoredToken()) return;

    const connection = createNotificationConnection();
    const isForCurrentUser = (eventUserId: string) => eventUserId === userId;
    connection.socket.on('notification:connected', (event) => {
      if (isForCurrentUser(event.userId)) setUnreadCount(event.unreadCount);
    });
    connection.socket.on('notification:unread_count', (event) => {
      if (isForCurrentUser(event.userId)) setUnreadCount(event.unreadCount);
    });
    connection.socket.on('notification:new', (notification) => {
      if (!isForCurrentUser(notification.userId)) return;
      setNotifications((items) =>
        [notification, ...items.filter((item) => item.id !== notification.id)].slice(0, 6),
      );
      if (typeof notification.unreadCount === 'number') setUnreadCount(notification.unreadCount);
    });
    connection.connect();
    return () => connection.disconnect();
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

  const accountName = profile?.fullName || account?.fullName || t('header.defaultAccountName');
  const accountEmail = profile?.email || account?.email || '';
  const accountAvatar = profile?.avatarUrl || account?.avatarUrl;
  const canEditProfile = (profile?.role || account?.role) === 'SUPPORT_STAFF';

  function openProfileEditor() {
    setProfileName(profile?.fullName || account?.fullName || '');
    setProfilePhone(profile?.phoneNumber || '');
    const currentAvatar = profile?.avatarUrl || account?.avatarUrl || '';
    setProfileAvatar(currentAvatar);
    setAvatarPreview(currentAvatar);
    setAvatarFile(null);
    setShowManualUrl(false);
    setProfileFormError('');
    setIsProfileEditorOpen(true);
    setIsAccountOpen(false);
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setProfileFormError(t('header.invalidImageTypeErr'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setProfileFormError(t('header.imageTooLargeErr'));
      return;
    }

    setProfileFormError('');
    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileSaving || isUploadingAvatar) return;
    setProfileSaving(true);
    setProfileFormError('');
    try {
      let finalAvatarUrl = profileAvatar.trim();

      // Nếu có chọn file ảnh từ máy tính, upload lên máy chủ trước
      if (avatarFile) {
        setIsUploadingAvatar(true);
        try {
          finalAvatarUrl = await uploadStaffAvatarFile(avatarFile);
        } finally {
          setIsUploadingAvatar(false);
        }
      }

      if (finalAvatarUrl) {
        finalAvatarUrl = finalAvatarUrl.replace('://localhost', '://127.0.0.1');
      }

      const updated = await updateStaffProfile({
        fullName: profileName.trim(),
        phoneNumber: profilePhone.trim() || null,
        avatarUrl: finalAvatarUrl || null,
      });
      setProfile(updated);
      setIsProfileEditorOpen(false);
    } catch (error) {
      setProfileFormError(error instanceof Error ? error.message : t('header.updateProfileErr'));
    } finally {
      setProfileSaving(false);
      setIsUploadingAvatar(false);
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
      setPasswordFormError(error instanceof Error ? error.message : t('header.changePasswordErr'));
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
    <header className={`sticky top-0 ${dashboardChrome.header}`}>
      <button
        className={dashboardChrome.menuButton}
        aria-label={t('header.openMenuAria')}
        onClick={onOpenSidebar}
      >
        <Menu size={20} />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary sm:inline-flex">
          <Headphones size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary">
            STAFF
          </span>
          <p
            className="mt-0.5 truncate text-sm font-semibold leading-5 text-slate-800 max-[480px]:text-xs"
            title={t('sidebar.subtitle')}
          >
            {t('sidebar.subtitle')}
          </p>
        </div>
      </div>
      <div className={`ml-auto ${dashboardChrome.headerActions}`}>
        <LanguageSwitcher compact />
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
            className={`${dashboardChrome.notificationButton} [&_i]:absolute [&_i]:right-1 [&_i]:top-1 [&_i]:size-1.5 [&_i]:rounded-full [&_i]:bg-primary`}
            aria-label={t('header.notificationsAria')}
          >
            <Bell size={24} />
            {unreadCount > 0 && <i />}
          </button>
          {isNotificationsOpen && (
            <section
              id="staff-notifications-panel"
              aria-label={t('header.yourNotificationsAria')}
              className="absolute right-0 top-full z-40 mt-3 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-100 bg-white shadow-xl max-[480px]:fixed max-[480px]:right-3 max-[480px]:top-20 max-[480px]:mt-0"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">
                    {t('header.notificationsTitle')}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {t('header.unreadCount', { count: unreadCount })}
                  </p>
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
                          error instanceof Error
                            ? error.message
                            : t('header.updateNotificationErr'),
                        );
                      }
                    }}
                  >
                    {t('header.markAllRead')}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={t('header.closeNotificationsAria')}
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
                    {t('header.loadingNotifications')}
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
                                : t('header.updateNotificationErr'),
                            );
                          }
                        }
                        const destination = resolveStaffNotificationTarget(item);
                        if (destination) navigate(destination);
                        setIsNotificationsOpen(false);
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
                        {new Date(item.createdAt).toLocaleString(locale)}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="p-6 text-center text-xs text-slate-500">
                    {t('header.noNotifications')}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        <div ref={accountRef} className="relative">
          <button
            type="button"
            aria-label={t('header.staffAccountAria')}
            aria-expanded={isAccountOpen}
            aria-controls="staff-account-panel"
            onClick={() => {
              setIsAccountOpen((open) => !open);
              setIsNotificationsOpen(false);
            }}
            className={dashboardChrome.accountButton}
          >
            <span className={`${dashboardChrome.avatar} order-2`}>
              {accountAvatar ? (
                <img src={accountAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </span>
            <span className="order-1 hidden max-w-36 text-right sm:block">
              <span className="block max-w-36 truncate text-xs font-semibold text-slate-900">
                {accountName}
              </span>
              <span className="mt-0.5 block text-[9px] font-bold tracking-wider text-primary">
                {t('header.supportStaffRole')}
              </span>
            </span>
            <ChevronDown
              size={13}
              className={`order-3 text-slate-400 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isAccountOpen && (
            <div id="staff-account-panel" className={dashboardChrome.accountMenu}>
              {/* Profile Card Header */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-200 bg-blue-100 text-xs font-bold text-blue-700 shadow-xs">
                  {accountAvatar ? (
                    <img src={accountAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[13px] text-slate-900 truncate m-0">{accountName}</p>
                  <p className="mt-0.5 break-all text-[11px] text-slate-500 truncate m-0">
                    {accountEmail || t('header.noEmail')}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blue-100/70 px-2 py-0.5 text-[9.5px] font-bold text-blue-700">
                    <ShieldCheck size={11} /> {t('header.supportStaffRole')}
                  </span>
                </div>
              </div>

              {profileError && (
                <p role="status" className="mx-2 mt-2 text-[11px] text-amber-700">
                  {profileError}
                </p>
              )}

              {/* Menu items */}
              <div className="mt-2 space-y-0.5">
                {canEditProfile && (
                  <>
                    <button
                      type="button"
                      onClick={openProfileEditor}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100/80 hover:text-slate-900"
                    >
                      <User size={15} className="text-slate-500" />
                      <span>{t('header.editProfile')}</span>
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
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-100/80 hover:text-slate-900"
                    >
                      <KeyRound size={15} className="text-slate-500" />
                      <span>{t('header.changePassword')}</span>
                    </button>
                  </>
                )}
              </div>

              {/* Destructive Action Divider */}
              <div className="my-1.5 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setIsAccountOpen(false);
                  setIsLogoutConfirmOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700 cursor-pointer"
              >
                <LogOut size={15} />
                <span>{t('header.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Modal Chỉnh Sửa Hồ Sơ Staff */}
      <StaffHeaderDialogs
        t={t}
        initials={initials}
        accountName={accountName}
        onConfirmLogout={() => {
          setIsLogoutConfirmOpen(false);
          clearAuthSession();
          toast.success(i18n.t('common:logoutDialog.successToast'));
          navigate('/login', { replace: true });
        }}
        isProfileEditorOpen={isProfileEditorOpen}
        setIsProfileEditorOpen={setIsProfileEditorOpen}
        profileSaving={profileSaving}
        isUploadingAvatar={isUploadingAvatar}
        fileInputRef={fileInputRef}
        avatarPreview={avatarPreview}
        setAvatarPreview={setAvatarPreview}
        handleFileSelect={handleFileSelect}
        avatarFile={avatarFile}
        showManualUrl={showManualUrl}
        setShowManualUrl={setShowManualUrl}
        profileAvatar={profileAvatar}
        setProfileAvatar={setProfileAvatar}
        profileName={profileName}
        setProfileName={setProfileName}
        profilePhone={profilePhone}
        setProfilePhone={setProfilePhone}
        profileFormError={profileFormError}
        saveProfile={saveProfile}
        isPasswordEditorOpen={isPasswordEditorOpen}
        setIsPasswordEditorOpen={setIsPasswordEditorOpen}
        passwordSaving={passwordSaving}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        passwordFormError={passwordFormError}
        savePassword={savePassword}
        isLogoutConfirmOpen={isLogoutConfirmOpen}
        setIsLogoutConfirmOpen={setIsLogoutConfirmOpen}
      />{' '}
    </header>
  );
}
