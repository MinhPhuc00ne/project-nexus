import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getStoredToken, getStoredUser } from '../../../services/auth';
import {
  getNotificationUnreadCount,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../services/notifications';
import type { NotificationsPage } from '../../../types/notification.types';
import { useToast } from '../../ToastNotification';

export default function useAdminNotifications(userId: string, isOpen: boolean) {
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
    let active = true;
    let fetching = false;
    if (!token) return;

    async function refreshNotifications(): Promise<void> {
      if (!active || fetching || lock.current || document.visibilityState === 'hidden') return;
      if (isOpen) {
        setRevision((current) => current + 1);
        return;
      }
      fetching = true;
      const version = mutationVersion.current;
      try {
        const result = await getNotificationUnreadCount();
        if (active && isCurrentSession() && version === mutationVersion.current)
          setUnreadCount(result.unreadCount);
      } catch (cause) {
        if (active && isCurrentSession() && version === mutationVersion.current)
          setError(cause instanceof Error ? cause.message : 'Không thể tải số thông báo chưa đọc.');
      } finally {
        fetching = false;
      }
    }

    if (!isOpen) void refreshNotifications();
    const refresh = () => {
      void refreshNotifications();
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [token, userId, isOpen]);

  useEffect(() => {
    if (!isOpen || !token) return;
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    void getNotifications({ page, limit: 10 }).then(
      (result) => {
        if (active && isCurrentSession()) {
          setData(result);
          setUnreadCount(result.unreadCount);
          setLoading(false);
        }
      },
      (cause: unknown) => {
        if (active && isCurrentSession()) {
          setError(cause instanceof Error ? cause.message : 'Không thể tải thông báo.');
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
    mutationVersion.current += 1;
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
        const message = cause instanceof Error ? cause.message : 'Không thể cập nhật thông báo.';
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
