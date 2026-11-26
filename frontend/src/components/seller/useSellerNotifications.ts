import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getStoredToken, getStoredUser } from '@/features/auth/services/auth';
import {
  createNotificationConnection,
  type NotificationSocket,
} from '@/features/notifications/services/notificationSocket';
import {
  getNotificationUnreadCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/services/notifications';
import type { NotificationsPage } from '@/features/notifications/types/notification.types';
import { useToast } from '../ToastNotification';

export default function useSellerNotifications(userId: string, isOpen: boolean) {
  const { t } = useTranslation('seller');
  const { token } = useAuth();
  const toast = useToast();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [data, setData] = useState<NotificationsPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const mounted = useRef(false);
  const loadedList = useRef(false);
  const isCurrentSession = () =>
    mounted.current && getStoredToken() === token && getStoredUser()?.id === userId;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token || !userId) return;

    let socket: NotificationSocket;
    let disconnect: (() => void) | undefined;
    try {
      const connection = createNotificationConnection();
      socket = connection.socket;
      disconnect = connection.disconnect;
    } catch {
      // REST remains available when Socket.IO cannot be initialized.
      return;
    }

    const updateUnreadCount = (nextUnreadCount: number): void => {
      if (!isCurrentSession()) return;
      setUnreadCount(nextUnreadCount);
      setData((current) => (current ? { ...current, unreadCount: nextUnreadCount } : current));
    };

    socket.on('notification:connected', (event) => updateUnreadCount(event.unreadCount));
    socket.on('notification:unread_count', (event) => updateUnreadCount(event.unreadCount));
    socket.on('notification:new', (notification) => {
      if (!isCurrentSession() || notification.userId !== userId) return;
      if (typeof notification.unreadCount === 'number') updateUnreadCount(notification.unreadCount);
      setData((current) => {
        if (
          !current ||
          current.page !== 1 ||
          current.items.some((item) => item.id === notification.id)
        ) {
          return current;
        }
        const { unreadCount: _unreadCount, ...item } = notification;
        return {
          ...current,
          items: [item, ...current.items].slice(0, current.limit),
          total: current.total + 1,
        };
      });
    });
    socket.connect();

    return () => disconnect?.();
  }, [token, userId]);

  useEffect(() => {
    let active = true;
    if (token) {
      void getNotificationUnreadCount().then(
        (result) => {
          if (active && isCurrentSession() && !loadedList.current)
            setUnreadCount(result.unreadCount);
        },
        (cause: unknown) => {
          if (active && isCurrentSession() && !loadedList.current)
            setError(cause instanceof Error ? cause.message : t('notifications.unreadCountFailed'));
        },
      );
    }
    return () => {
      active = false;
    };
  }, [token, userId]);

  useEffect(() => {
    if (!isOpen || !token) return;
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    void getNotifications({ page, limit: 10 }).then(
      (result) => {
        if (active && isCurrentSession()) {
          loadedList.current = true;
          setData(result);
          setUnreadCount(result.unreadCount);
          setLoading(false);
        }
      },
      (cause: unknown) => {
        if (active && isCurrentSession()) {
          setError(cause instanceof Error ? cause.message : t('notifications.loadFailed'));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [isOpen, page, revision, token, userId]);

  async function markRead(id?: string): Promise<void> {
    if (lock.current || loading || !isCurrentSession()) return;
    lock.current = true;
    setPending(id ?? 'all');
    setError('');
    try {
      const result = id ? await markNotificationRead(id) : await markAllNotificationsRead();
      if (!isCurrentSession()) return;
      toast.success(result.message);
      setUnreadCount((current) => (id ? (current === null ? null : Math.max(0, current - 1)) : 0));
      setLoading(true);
      setRevision((current) => current + 1);
    } catch (cause) {
      if (isCurrentSession()) {
        const message = cause instanceof Error ? cause.message : t('notifications.updateFailed');
        setError(message);
        toast.error(message);
      }
    } finally {
      lock.current = false;
      if (isCurrentSession()) setPending(null);
    }
  }

  return {
    unreadCount,
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
