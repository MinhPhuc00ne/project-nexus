import { useState, useRef, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import { getIntlLocale } from '../../i18n/config';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  X,
  User,
  KeyRound,
  ShieldCheck,
  Camera,
  Upload,
  Phone,
  Lock,
  Link2,
  CheckCircle2,
  AlertCircle,
  Loader2,
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
import {
  changeStaffPassword,
  getStaffProfile,
  updateStaffProfile,
  uploadStaffAvatarFile,
  type StaffProfile,
} from '../../services/staff';

interface StaffHeaderProps {
  account: AuthUser | null;
  searchText: string;
  onSearchChange: (value: string) => void;
  onOpenSidebar: () => void;
}

function resolveStaffNotificationTarget(notification: UserNotification): string | null {
  const metadata = notification.metadata ?? {};
  const readId = (...keys: string[]): string | null => {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  };
  const auctionId = notification.auctionId ?? readId('auctionId', 'auction_id');
  const orderId = readId('orderId', 'order_id', 'orderCode');
  const reviewId = readId('reviewId', 'review_id');
  const disputeId = readId('disputeId', 'complaintId', 'dispute_id');
  const resourceId = readId('resourceId', 'entityId', 'contextId');
  const action = [
    notification.type,
    notification.title,
    notification.content,
    metadata.actionType,
    metadata.entityType,
    metadata.resourceType,
  ]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLocaleLowerCase();
  const resourceType = [metadata.entityType, metadata.resourceType]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLocaleLowerCase();

  let target: URL | null = null;
  if (notification.targetUrl?.startsWith('/') && !notification.targetUrl.startsWith('//')) {
    target = new URL(notification.targetUrl, window.location.origin);
  }

  const path = target?.pathname ?? '';
  const matches = (route: string) => path === route || path.startsWith(`${route}/`);
  const adminOrderMatch = path.match(/^\/admin\/(?:orders|refunds)\/([^/]+)\/?$/);
  if (adminOrderMatch) return `/staff/orders?orderId=${encodeURIComponent(adminOrderMatch[1])}`;
  const adminAuctionMatch = path.match(/^\/admin\/auctions\/([^/]+)(?:\/lots)?\/?$/);
  if (adminAuctionMatch) {
    const params = new URLSearchParams(target?.search ?? '');
    params.set('auctionId', decodeURIComponent(adminAuctionMatch[1]));
    return `/staff/auction-support?${params.toString()}${target?.hash ?? ''}`;
  }
  if (path === '/admin' || path.startsWith('/admin/')) {
    let staffPath: string | null = null;
    if (matches('/admin/reports')) staffPath = '/staff/disputes';
    else if (matches('/admin/reviews')) staffPath = '/staff/reviews';
    else if (matches('/admin/refunds') || matches('/admin/orders')) staffPath = '/staff/orders';
    else if (matches('/admin/banners')) staffPath = '/staff/banners';
    else if (matches('/admin/auctions')) staffPath = '/staff/auction-support';
    return staffPath ? `${staffPath}${target?.search ?? ''}${target?.hash ?? ''}` : null;
  }
  const auctionMatch = path.match(/^\/(?:auction|auctions|seller\/auctions)\/([^/]+)\/?$/);
  if (auctionMatch) {
    const params = new URLSearchParams(target?.search ?? '');
    params.set('auctionId', decodeURIComponent(auctionMatch[1]));
    return `/staff/auction-support?${params.toString()}${target?.hash ?? ''}`;
  }
  const orderRouteMatch = path.match(
    /^\/(?:commerce\/orders|seller\/orders|buyer\/orders)\/([^/]+)\/?$/,
  );
  if (orderRouteMatch) return `/staff/orders?orderId=${encodeURIComponent(orderRouteMatch[1])}`;
  if (path === '/seller/auctions' || path === '/auctions') return '/staff/auction-support';
  if (target) return `${path}${target.search}${target.hash}`;

  if (
    auctionId ||
    (resourceId && /auction|consignment|đấu giá|ký gửi/.test(resourceType || action))
  ) {
    const id = auctionId ?? resourceId;
    return id
      ? `/staff/auction-support?auctionId=${encodeURIComponent(id)}`
      : '/staff/auction-support';
  }
  if (
    orderId ||
    (resourceId &&
      /order|refund|after.?sales|đơn hàng|hoàn tiền|trả hàng|hủy đơn/.test(resourceType || action))
  ) {
    const id = orderId ?? resourceId;
    return id ? `/staff/orders?orderId=${encodeURIComponent(id)}` : '/staff/orders';
  }
  if (reviewId || (resourceId && /review|rating|đánh giá/.test(resourceType || action)))
    return '/staff/reviews';
  if (
    disputeId ||
    (resourceId && /dispute|complaint|khiếu nại|tranh chấp/.test(resourceType || action))
  )
    return '/staff/disputes';
  if (/auction|consignment|đấu giá|ký gửi/.test(action)) return '/staff/auction-support';
  if (/order|refund|after.?sales|đơn hàng|hoàn tiền|trả hàng|hủy đơn/.test(action))
    return '/staff/orders';
  if (/review|rating|đánh giá/.test(action)) return '/staff/reviews';
  if (/dispute|complaint|khiếu nại|tranh chấp/.test(action)) return '/staff/disputes';
  if (/banner/.test(action)) return '/staff/banners';
  return null;
}

export default function StaffHeader({
  account,
  searchText,
  onSearchChange,
  onOpenSidebar,
}: StaffHeaderProps) {
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
    <header className="[min-height:64px] [gap:9px] px-4 max-[760px]:[min-height:58px] max-[760px]:px-2.5 sticky top-0 z-20 flex min-h-[70px] items-center gap-3 border-b border-slate-200 bg-white/95 px-5 backdrop-blur-sm">
      <button
        className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff] hidden max-[760px]:[display:inline-grid]"
        aria-label={t('header.openMenuAria')}
        onClick={onOpenSidebar}
      >
        <Menu size={20} />
      </button>

      <div className="flex h-11 min-w-0 max-w-xl flex-1 items-center gap-3 rounded-xl border border-transparent bg-slate-100 px-4 text-slate-500 transition focus-within:border-blue-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-50">
        <Search size={18} className="shrink-0" />
        <input
          aria-label={t('header.searchAria')}
          placeholder={t('header.searchPlaceholder')}
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full min-w-0 border-0 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
        />
        {searchText && (
          <button
            type="button"
            aria-label={t('header.clearSearchAria')}
            onClick={() => onSearchChange('')}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
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
            className="relative [display:inline-grid] [width:35px] [height:35px] [place-items:center] [border:1px_solid_#eceef5] [border-radius:9px] [color:#68758d] [background:white] cursor-pointer [transition:0.15s_ease] hover:[color:var(--staff-primary)] hover:[border-color:#c8d8ff] hover:[background:#f2f6ff] [&_i]:absolute [&_i]:[top:7px] [&_i]:[right:7px] [&_i]:w-1.5 [&_i]:h-1.5 [&_i]:[border:1px_solid_white] [&_i]:rounded-full [&_i]:[background:var(--staff-accent)]"
            aria-label={t('header.notificationsAria')}
          >
            <Bell size={18} />
            {unreadCount > 0 && <i />}
          </button>
          {isNotificationsOpen && (
            <section
              id="staff-notifications-panel"
              aria-label={t('header.yourNotificationsAria')}
              className="absolute right-0 top-full z-40 mt-3 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-100 bg-white shadow-xl max-[480px]:fixed max-[480px]:right-3 max-[480px]:top-[70px] max-[480px]:mt-0"
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

        <div ref={accountRef} className="relative border-l border-slate-100 pl-3">
          <button
            type="button"
            aria-label={t('header.staffAccountAria')}
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
              <span className="mt-1 block text-[10px] text-slate-400">
                {t('header.supportStaffRole')}
              </span>
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-500 transition-transform ${isAccountOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isAccountOpen && (
            <div
              id="staff-account-panel"
              className="absolute right-0 top-full z-40 mt-2.5 w-76 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-2xl animate-fade-in"
            >
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
      {isProfileEditorOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget && !profileSaving && !isUploadingAvatar) {
                setIsProfileEditorOpen(false);
              }
            }}
          >
            <div className="w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {t('header.profileModalTitle')}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t('header.profileModalSubtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t('header.closeAria')}
                  disabled={profileSaving || isUploadingAvatar}
                  onClick={() => setIsProfileEditorOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={saveProfile}
                className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1"
              >
                {/* Avatar Selector Card */}
                <div className="flex flex-col items-center gap-3 rounded-xl bg-slate-50/70 p-4 border border-slate-100">
                  <div className="relative group">
                    <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-white shadow-md ring-2 ring-blue-500/20 bg-slate-200">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt={t('header.avatarPreviewAlt')}
                          className="h-full w-full object-cover"
                          onError={() => setAvatarPreview('')}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 text-xl font-bold text-white">
                          {initials || <User size={30} />}
                        </div>
                      )}
                    </div>

                    {/* Hover Camera Overlay */}
                    <button
                      type="button"
                      disabled={profileSaving || isUploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      title={t('header.choosePhotoTitle')}
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-slate-950/50 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Camera size={20} />
                      <span className="mt-0.5 text-[10px] font-medium">
                        {t('header.changePhoto')}
                      </span>
                    </button>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={profileSaving || isUploadingAvatar}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 cursor-pointer disabled:opacity-50"
                      >
                        <Upload size={13} />
                        <span>
                          {avatarFile ? t('header.chooseOtherPhoto') : t('header.uploadFromDevice')}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={profileSaving || isUploadingAvatar}
                        onClick={() => setShowManualUrl(!showManualUrl)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Link2 size={13} className="inline mr-1" />
                        {showManualUrl ? t('header.hideUrl') : t('header.pasteUrl')}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {avatarFile
                        ? t('header.selectedFile', { name: avatarFile.name })
                        : t('header.photoHint')}
                    </p>
                  </div>

                  {/* Optional manual URL input if toggled */}
                  {showManualUrl && (
                    <div className="w-full mt-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {t('header.avatarUrlLabel')}
                      </label>
                      <input
                        type="url"
                        value={profileAvatar}
                        onChange={(e) => {
                          setProfileAvatar(e.target.value);
                          if (!avatarFile) setAvatarPreview(e.target.value);
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Form Input: Họ tên */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {t('header.fullNameLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      required
                      minLength={2}
                      maxLength={100}
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      placeholder={t('header.fullNamePlaceholder')}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 transition placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Form Input: Số điện thoại */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {t('header.phoneLabel')}
                  </label>
                  <div className="relative">
                    <Phone
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      value={profilePhone}
                      onChange={(event) => setProfilePhone(event.target.value)}
                      placeholder="0901234567"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 transition placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {profileFormError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100 animate-in fade-in"
                  >
                    <AlertCircle size={15} className="shrink-0 text-red-500" />
                    <span>{profileFormError}</span>
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={profileSaving || isUploadingAvatar}
                    onClick={() => setIsProfileEditorOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    {t('header.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving || isUploadingAvatar}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>{t('header.uploadingPhoto')}</span>
                      </>
                    ) : profileSaving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>{t('header.saving')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} />
                        <span>{t('header.saveProfile')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Đổi Mật Khẩu Staff */}
      {isPasswordEditorOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget && !passwordSaving) {
                setIsPasswordEditorOpen(false);
              }
            }}
          >
            <div className="w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {t('header.passwordModalTitle')}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t('header.passwordModalSubtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t('header.closeAria')}
                  disabled={passwordSaving}
                  onClick={() => setIsPasswordEditorOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={savePassword}
                className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {t('header.currentPasswordLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 transition placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    {t('header.newPasswordLabel')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      required
                      minLength={6}
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder={t('header.newPasswordPlaceholder')}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 transition placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {passwordFormError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100 animate-in fade-in"
                  >
                    <AlertCircle size={15} className="shrink-0 text-red-500" />
                    <span>{passwordFormError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={passwordSaving}
                    onClick={() => setIsPasswordEditorOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    {t('header.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                  >
                    {passwordSaving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>{t('header.saving')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} />
                        <span>{t('header.changePasswordSubmit')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal Xác Nhận Đăng Xuất Staff */}
      {isLogoutConfirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsLogoutConfirmOpen(false);
              }
            }}
          >
            <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/50 mb-4">
                  <LogOut size={22} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {t('header.logoutModalTitle')}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {t('header.logoutModalBody')}
                  <strong className="text-slate-700 font-semibold">{accountName}</strong>?
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
                >
                  {t('header.stayWorking')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogoutConfirmOpen(false);
                    clearAuthSession();
                    toast.success(t('header.logoutSuccess'));
                    navigate('/login', { replace: true });
                  }}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700 cursor-pointer"
                >
                  {t('header.logoutConfirm')}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
}
