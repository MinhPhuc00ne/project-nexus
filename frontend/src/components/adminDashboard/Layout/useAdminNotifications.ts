import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import {
  WS_NOTIFICATION_EVENTS,
  type WsNotificationConnectedPayload,
  type WsNotificationNewPayload,
  type WsNotificationUnreadCountPayload,
} from '@nexus/types';
import { API_BASE_URL } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { getStoredToken, getStoredUser } from '@/features/auth/services/auth';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/services/notifications';
import type { NotificationsPage } from '../../../types/notification.types';
import { useToast } from '../../ToastNotification';
import {
  publishAdminAuctionNotification,
  setAdminNotificationConnection,
} from '../Auctions/adminAuctionRealtime';

export default function useAdminNotifications(userId: string, isOpen: boolean) {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const toast = useToast();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [data, setData] = useState<NotificationsPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const syncRef = useRef<(() => void) | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const mounted = useRef(false);
  const mutationVersion = useRef(0);
  const isCurrentSession = () =>
    mounted.current && getStoredToken() === token && getStoredUser()?.id === userId;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token || !isOpen) return;
    let active = true;
    let fetching = false;
    let queued = false;

    // Only fetch the open list; badge counts arrive through the socket.
    // Preserve changes arriving while a previous HTTP request is in flight.
    async function sync(showLoading = false) {
      if (!active) return;
      queued = true;
      if (fetching) return;
      if (lock.current || document.visibilityState === 'hidden') {
        return;
      }
      queued = false;
      fetching = true;
      const version = mutationVersion.current;
      const canApply = () => active && isCurrentSession() && version === mutationVersion.current;
      if (showLoading) setLoading(true);
      try {
        const result = await getNotifications({ page, limit: 10 });
        if (canApply()) {
          const lastPage = Math.max(1, result.totalPages);
          if (page > lastPage) setPage(lastPage);
          else setData(result);
          setUnreadCount(result.unreadCount);
          setError('');
        }
      } catch (cause) {
        if (canApply())
          setError(cause instanceof Error ? cause.message : t('notifications.loadErr'));
      } finally {
        fetching = false;
        if (canApply()) setLoading(false);
        if (active && queued) void sync();
      }
    }

    const refreshVisible = () => void sync();
    syncRef.current = refreshVisible;
    void sync(true);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      active = false;
      if (syncRef.current === refreshVisible) syncRef.current = null;
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
    };
  }, [isOpen, page, revision, token, userId]);

  // This connection remains mounted even when the notification dropdown is closed.
  useEffect(() => {
    if (!token) return;
    let active = true;
    const backend = new URL(API_BASE_URL, window.location.origin);
    const socket = io(`${backend.origin}/ws/notifications`, {
      autoConnect: false,
      transports: ['websocket'],
      auth: (callback) => callback({ token: getStoredToken() }),
    });
    const seen = new Set<string>();
    const currentSession = () =>
      active && getStoredToken() === token && getStoredUser()?.id === userId;
    const applyCount = (payload: { userId: string; unreadCount?: number }) => {
      if (!currentSession() || payload.userId !== userId) return;
      mutationVersion.current += 1;
      if (typeof payload.unreadCount === 'number') setUnreadCount(payload.unreadCount);
      syncRef.current?.();
    };
    socket.on(
      WS_NOTIFICATION_EVENTS.SERVER.CONNECTED,
      (payload: WsNotificationConnectedPayload) => {
        if (!currentSession() || payload.userId !== userId) return;
        setConnected(true);
        setAdminNotificationConnection(true);
        applyCount(payload);
      },
    );
    socket.on(WS_NOTIFICATION_EVENTS.SERVER.NEW, (payload: WsNotificationNewPayload) => {
      if (!currentSession() || payload.userId !== userId || seen.has(payload.id)) return;
      seen.add(payload.id);
      publishAdminAuctionNotification(payload);
      if (seen.size > 1000) seen.delete(seen.values().next().value!);
      // Prefer the server total to avoid adding twice when UNREAD_COUNT also arrives.
      if (typeof payload.unreadCount !== 'number' && !payload.isRead)
        setUnreadCount((current) => (current ?? 0) + 1);
      applyCount(payload);
    });
    socket.on(
      WS_NOTIFICATION_EVENTS.SERVER.UNREAD_COUNT,
      (payload: WsNotificationUnreadCountPayload) => applyCount(payload),
    );
    const disconnected = () => {
      if (active) {
        setConnected(false);
        setAdminNotificationConnection(false);
      }
    };
    socket.on('disconnect', disconnected);
    socket.on('connect_error', disconnected);
    socket.on(WS_NOTIFICATION_EVENTS.SERVER.ERROR, disconnected);
    socket.connect();
    return () => {
      active = false;
      socket.disconnect();
      socket.removeAllListeners();
      setConnected(false);
      setAdminNotificationConnection(false);
    };
  }, [token, userId]);

  async function markRead(id?: string): Promise<void> {
    if (lock.current || loading || !isCurrentSession()) return;
    lock.current = true;
    mutationVersion.current += 1;
    setPending(id ?? 'all');
    setError('');
    try {
      const result = id ? await markNotificationRead(id) : await markAllNotificationsRead();
      if (!isCurrentSession()) return;
      toast.success(result.message);
      // The backend broadcasts the authoritative count to every connected session.
    } catch (cause) {
      if (isCurrentSession()) {
        const message = cause instanceof Error ? cause.message : t('notifications.updateErr');
        setError(message);
        toast.error(message);
      }
    } finally {
      lock.current = false;
      if (isCurrentSession()) {
        setPending(null);
        setRevision((current) => current + 1);
      }
    }
  }

  return {
    unreadCount,
    connected,
    data,
    loading,
    error,
    pending,
    page,
    markRead,
    refresh: () => {
      if (!lock.current) setRevision((current) => current + 1);
    },
    changePage: (next: number) => {
      if (!lock.current && !loading && next >= 1 && next <= (data?.totalPages ?? 1)) setPage(next);
    },
  };
}
