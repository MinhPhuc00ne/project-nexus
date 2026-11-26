import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import {
  Bell,
  CheckCheck,
  Settings,
  ArrowRight,
  Loader2,
  Clock,
  Sparkles,
  ShoppingBag,
  Gavel,
  ShieldAlert,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/features/notifications/services/notifications';
import { getStoredToken, getStoredUser } from '@/features/auth/services/auth';
import { createNotificationConnection } from '@/features/notifications/services/notificationSocket';
import { getBuyerOrdersApi } from '@/features/orders/services/orders';
import type { UserNotification } from '../../types/notification.types';
import NotificationPreferencesModal from '../notifications/NotificationPreferencesModal';
import {
  getNotificationOrderReference,
  resolveNotificationTargetUrl,
} from '../../utils/notificationNavigation';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose?: () => void;
  onCountChange?: (count: number) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onCountChange,
}) => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrefsModal, setShowPrefsModal] = useState(false);
  const token = getStoredToken();
  const onCountChangeRef = useRef(onCountChange);

  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const loadNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getNotifications({ page: 1, limit: 10 });
      if (res && Array.isArray(res.items)) {
        setNotifications(res.items);
        if (onCountChange && typeof res.unreadCount === 'number') {
          onCountChange(res.unreadCount);
        }
      }
    } catch (err) {
      console.warn('Failed to load notifications dropdown:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      void loadNotifications();
    }
  }, [isOpen, token]);

  useEffect(() => {
    const userId = getStoredUser()?.id;
    if (!token || !userId) return;

    const connection = createNotificationConnection();
    const appliesToCurrentUser = (eventUserId: string) => eventUserId === userId;

    connection.socket.on('notification:connected', (event) => {
      if (appliesToCurrentUser(event.userId)) onCountChangeRef.current?.(event.unreadCount);
    });
    connection.socket.on('notification:unread_count', (event) => {
      if (appliesToCurrentUser(event.userId)) onCountChangeRef.current?.(event.unreadCount);
    });
    connection.socket.on('notification:new', (notification) => {
      if (!appliesToCurrentUser(notification.userId)) return;
      setNotifications((current) =>
        [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 10),
      );
      if (typeof notification.unreadCount === 'number') {
        onCountChangeRef.current?.(notification.unreadCount);
      }
    });
    connection.connect();
    return () => connection.disconnect();
  }, [token]);

  if (!isOpen) return null;

  const handleMarkOne = async (item: UserNotification) => {
    if (item.isRead) return;
    try {
      await markNotificationRead(item.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
      );
      if (onCountChange) {
        onCountChange(
          Math.max(0, notifications.filter((n) => !n.isRead && n.id !== item.id).length),
        );
      }
    } catch (err) {
      console.warn('Failed to mark read:', err);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (onCountChange) onCountChange(0);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (item: UserNotification) => {
    void handleMarkOne(item);
    let buyerOrders: Awaited<ReturnType<typeof getBuyerOrdersApi>> | undefined;
    if (getNotificationOrderReference(item)) {
      try {
        buyerOrders = await getBuyerOrdersApi();
      } catch (error) {
        console.warn('Unable to resolve abbreviated order reference:', error);
      }
    }
    const destination = resolveNotificationTargetUrl(item, buyerOrders);
    if (destination.startsWith('/') && !destination.startsWith('//')) {
      navigate(destination);
    } else {
      window.location.assign(destination);
    }
    onClose?.();
  };

  const getIconForType = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('AUCTION') || t.includes('BID')) {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
          <Gavel size={14} />
        </div>
      );
    }
    if (t.includes('ORDER')) {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <ShoppingBag size={14} />
        </div>
      );
    }
    if (t.includes('REPUTATION') || t.includes('TRUST')) {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Sparkles size={14} />
        </div>
      );
    }
    if (t.includes('DISPUTE') || t.includes('REPORT')) {
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <ShieldAlert size={14} />
        </div>
      );
    }
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Bell size={14} />
      </div>
    );
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      const locale = getIntlLocale(i18n.language);
      return (
        d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) +
        ' ' +
        d.toLocaleDateString(locale)
      );
    } catch {
      return timeStr;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <div className="animate-home-popover-enter motion-reduce:animate-none absolute right-[-100px] sm:right-[-40px] md:right-0 top-[calc(100%+8px)] z-[1100] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="m-0 text-sm font-bold text-slate-800">
              {t('header.notificationsTitle')}
            </h4>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {t('header.newCount', { count: unreadCount })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                title={t('header.markAllRead')}
              >
                <CheckCheck size={13} />
                <span>{t('header.markAllReadShort')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPrefsModal(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
              title={t('header.notificationPrefsTitle')}
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
          {!token && (
            <div className="p-6 text-center text-xs text-slate-500">
              <p className="mb-3 font-semibold text-slate-700">
                {t('header.loginToViewNotifications')}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl transition"
              >
                {t('header.loginNow')}
              </Link>
            </div>
          )}
          {token && loading && (
            <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin text-blue-600" />
              <span>{t('header.loadingNotifications')}</span>
            </div>
          )}
          {token &&
            !loading &&
            notifications.length > 0 &&
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => void handleNotificationClick(item)}
                className={`group flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 cursor-pointer ${
                  !item.isRead ? 'bg-orange-50/40' : ''
                }`}
              >
                {getIconForType(item.type)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h5
                      className={`text-xs truncate ${
                        !item.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                      }`}
                    >
                      {item.title}
                    </h5>
                    {!item.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2 mb-1">
                    {item.content}
                  </p>

                  <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      <span>{formatTime(item.createdAt)}</span>
                    </span>
                    <span className="text-blue-600 font-semibold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      <span>{t('header.open')}</span>
                      <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          {token && !loading && notifications.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-400">
              <Bell size={24} className="mx-auto mb-2 text-slate-300 opacity-60" />
              <span>{t('header.noNotifications')}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {token && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center">
            <Link
              to="/buyer/notifications"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              <span>{t('header.viewAllNotificationsAndSettings')}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>

      <NotificationPreferencesModal
        isOpen={showPrefsModal}
        onClose={() => setShowPrefsModal(false)}
      />
    </>
  );
};

export default NotificationDropdown;
