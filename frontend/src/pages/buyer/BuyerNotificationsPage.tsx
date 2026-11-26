import BuyerPageHeader from '../../components/buyer/BuyerPageHeader';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n/config';
import {
  Bell,
  CheckCheck,
  Filter,
  Mail,
  BellRing,
  Save,
  Loader2,
  Clock,
  Sparkles,
  ShoppingBag,
  Gavel,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ToastNotification';
import {
  getNotifications,
  getNotificationPreferences,
  saveNotificationPreferences,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/features/notifications/services/notifications';
import { getBuyerOrdersApi } from '@/features/orders/services/orders';
import type {
  UserNotification,
  NotificationPreference,
  NotificationChannel,
} from '@/features/notifications/types/notification.types';
import {
  getNotificationOrderReference,
  resolveNotificationTargetUrl,
} from '../../utils/notificationNavigation';

export const BuyerNotificationsPage: React.FC = () => {
  const { t, i18n } = useTranslation('buyer');
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'list' | 'preferences'>('list');
  const [filterRead, setFilterRead] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Preferences state
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    { channel: 'IN_APP', isEnabled: true },
    { channel: 'EMAIL', isEnabled: true },
    { channel: 'PUSH', isEnabled: false },
  ]);
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);
  const [loadingPrefs, setLoadingPrefs] = useState<boolean>(false);

  const fetchNotificationsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({
        page,
        limit: 10,
        isRead: filterRead === 'UNREAD' ? false : undefined,
      });
      if (res) {
        setNotifications(res.items || []);
        setTotalPages(res.totalPages || 1);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
      toast.error(err instanceof Error ? err.message : t('notificationsPage.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, filterRead, toast, t]);

  const fetchPrefs = useCallback(async () => {
    setLoadingPrefs(true);
    try {
      const res = await getNotificationPreferences();
      if (res?.preferences && Array.isArray(res.preferences)) {
        setPreferences(res.preferences);
      }
    } catch (err) {
      console.warn('Failed to load preferences:', err);
      toast.error(err instanceof Error ? err.message : t('notificationsPage.prefsLoadFailed'));
    } finally {
      setLoadingPrefs(false);
    }
  }, [toast, t]);

  useEffect(() => {
    if (activeTab === 'list') {
      void fetchNotificationsList();
    } else {
      void fetchPrefs();
    }
  }, [activeTab, fetchNotificationsList, fetchPrefs]);

  const handleMarkOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark as read:', err);
      toast.error(err instanceof Error ? err.message : t('notificationsPage.markOneFailed'));
    }
  };

  const handleNotificationClick = async (item: UserNotification) => {
    if (!item.isRead) {
      await handleMarkOne(item.id);
    }
    let buyerOrders: Awaited<ReturnType<typeof getBuyerOrdersApi>> | undefined;
    if (getNotificationOrderReference(item)) {
      try {
        buyerOrders = await getBuyerOrdersApi();
      } catch (error) {
        console.warn('Unable to resolve abbreviated order reference:', error);
        toast.error(t('notificationsPage.orderLookupFailed'));
      }
    }
    const destination = resolveNotificationTargetUrl(item, buyerOrders);
    if (destination.startsWith('/') && !destination.startsWith('//')) {
      navigate(destination);
    } else {
      window.location.assign(destination);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success(t('notificationsPage.markedAllToast'));
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
      toast.error(err instanceof Error ? err.message : t('notificationsPage.markAllFailed'));
    }
  };

  const handleTogglePref = (channel: NotificationChannel) => {
    setPreferences((prev) =>
      prev.map((p) => (p.channel === channel ? { ...p, isEnabled: !p.isEnabled } : p)),
    );
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      const res = await saveNotificationPreferences(preferences);
      toast.success(res.message || t('notificationsPage.prefsSavedToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('notificationsPage.prefsSaveError'));
    } finally {
      setSavingPrefs(false);
    }
  };

  const getIconForType = (type: string) => {
    const t = (type || '').toUpperCase();
    if (t.includes('AUCTION') || t.includes('BID')) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <Gavel size={18} />
        </div>
      );
    }
    if (t.includes('ORDER')) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <ShoppingBag size={18} />
        </div>
      );
    }
    if (t.includes('REPUTATION') || t.includes('TRUST')) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <Sparkles size={18} />
        </div>
      );
    }
    if (t.includes('DISPUTE') || t.includes('REPORT')) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <ShieldAlert size={18} />
        </div>
      );
    }
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Bell size={18} />
      </div>
    );
  };

  const formatTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleString(getIntlLocale(i18n.language), {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <BuyerPageHeader
        title={t('notificationsPage.title')}
        description={t('notificationsPage.subtitle')}
        icon={<Bell size={21} />}
        actions={
          activeTab === 'list' &&
          unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="flex min-h-11 items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer"
            >
              <CheckCheck size={14} />
              <span>{t('notificationsPage.markAllRead', { count: unreadCount })}</span>
            </button>
          )
        }
      />

      {/* Tab switch */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'list'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Bell size={14} />
          <span>{t('notificationsPage.tabList')}</span>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-[10px] font-semibold px-1.5 py-0.2 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'preferences'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings size={14} />
          <span>{t('notificationsPage.tabPreferences')}</span>
        </button>
      </div>

      {/* TAB 1: NOTIFICATIONS LIST */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Subfilter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Filter size={12} /> {t('notificationsPage.filterLabel')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFilterRead('ALL');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  filterRead === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('notificationsPage.filterAll')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterRead('UNREAD');
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  filterRead === 'UNREAD'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('notificationsPage.filterUnread', { count: unreadCount })}
              </button>
            </div>
          </div>

          {loading && (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <span>{t('notificationsPage.loading')}</span>
            </div>
          )}
          {!loading && notifications.length === 0 && (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <Bell size={36} className="mx-auto mb-3 text-slate-300" />
              <h3 className="text-sm font-semibold text-ink mb-1">
                {filterRead === 'UNREAD'
                  ? t('notificationsPage.emptyUnreadTitle')
                  : t('notificationsPage.emptyAllTitle')}
              </h3>
              <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                {t('notificationsPage.emptyDesc')}
              </p>
            </div>
          )}
          {!loading && notifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => void handleNotificationClick(item)}
                  className={`group flex items-start gap-4 p-4.5 transition hover:bg-slate-50/80 cursor-pointer ${
                    !item.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {getIconForType(item.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h4
                        className={`text-xs ${
                          !item.isRead ? 'font-semibold text-ink' : 'font-medium text-slate-700'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {!item.isRead && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                            {t('notificationsPage.unreadBadge')}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <span>{t('notificationsPage.openPage')}</span>
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{item.content}</p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {formatTime(item.createdAt)}
                      </span>
                      {item.channel && (
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono text-[10px]">
                          {t('notificationsPage.channelLabel', { channel: item.channel })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-xs text-muted">
                {t('notificationsPage.pageLabel', { page, totalPages })}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl">
          <h3 className="text-sm font-semibold text-ink mb-1">
            {t('notificationsPage.prefsTitle')}
          </h3>
          <p className="text-xs text-muted mb-6 leading-relaxed">
            {t('notificationsPage.prefsDesc')}
          </p>

          {loadingPrefs ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span>{t('notificationsPage.loadingPrefs')}</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* In App */}
              <div
                onClick={() => handleTogglePref('IN_APP')}
                className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer select-none"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-ink m-0">
                      {t('notificationsPage.inAppTitle')}
                    </h4>
                    <p className="text-[11px] text-muted m-0 mt-0.5 leading-relaxed">
                      {t('notificationsPage.inAppDesc')}
                    </p>
                  </div>
                </div>

                <div className="relative inline-flex items-center shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={preferences.find((p) => p.channel === 'IN_APP')?.isEnabled ?? true}
                    onChange={() => {}}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </div>

              {/* Email */}
              <div
                onClick={() => handleTogglePref('EMAIL')}
                className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer select-none"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0 mt-0.5">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-ink m-0">
                      {t('notificationsPage.emailTitle')}
                    </h4>
                    <p className="text-[11px] text-muted m-0 mt-0.5 leading-relaxed">
                      {t('notificationsPage.emailDesc')}
                    </p>
                  </div>
                </div>

                <div className="relative inline-flex items-center shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={preferences.find((p) => p.channel === 'EMAIL')?.isEnabled ?? true}
                    onChange={() => {}}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </div>

              {/* Push */}
              <div
                onClick={() => handleTogglePref('PUSH')}
                className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer select-none"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5">
                    <BellRing size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-ink m-0">
                      {t('notificationsPage.pushTitle')}
                    </h4>
                    <p className="text-[11px] text-muted m-0 mt-0.5 leading-relaxed">
                      {t('notificationsPage.pushDesc')}
                    </p>
                  </div>
                </div>

                <div className="relative inline-flex items-center shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={preferences.find((p) => p.channel === 'PUSH')?.isEnabled ?? false}
                    onChange={() => {}}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  disabled={savingPrefs}
                  onClick={handleSavePreferences}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {savingPrefs ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>
                    {savingPrefs
                      ? t('notificationsPage.savingPrefs')
                      : t('notificationsPage.savePrefs')}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BuyerNotificationsPage;
