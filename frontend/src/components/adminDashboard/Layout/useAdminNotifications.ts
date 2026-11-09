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
    if (!token) return;
    let active = true;
    let fetching = false;
    let timer: number | undefined;

    // Badge cập nhật cả khi đóng chuông; chỉ lấy danh sách khi đang mở.
    // Lên lịch sau khi request kết thúc để không chồng request lúc mạng chậm.
    async function sync(showLoading = false) {
      if (!active || fetching) return;
      window.clearTimeout(timer);
      if (lock.current || document.visibilityState === 'hidden') {
        timer = window.setTimeout(() => void sync(), 5000);
        return;
      }
      fetching = true;
      const version = mutationVersion.current;
      const canApply = () => active && isCurrentSession() && version === mutationVersion.current;
      if (showLoading && isOpen) setLoading(true);
      try {
        if (isOpen) {
          const result = await getNotifications({ page, limit: 10 });
          if (canApply()) {
            const lastPage = Math.max(1, result.totalPages);
            if (page > lastPage) setPage(lastPage);
            else setData(result);
            setUnreadCount(result.unreadCount);
            setError('');
          }
        } else {
          const result = await getNotificationUnreadCount();
          if (canApply()) {
            setUnreadCount(result.unreadCount);
            setError('');
          }
        }
      } catch (cause) {
        if (canApply())
          setError(cause instanceof Error ? cause.message : 'Không thể tải thông báo.');
      } finally {
        fetching = false;
        if (canApply()) setLoading(false);
        if (active) timer = window.setTimeout(() => void sync(), 5000);
      }
    }

    const refreshVisible = () => void sync();
    void sync(true);
    window.addEventListener('focus', refreshVisible);
    document.addEventListener('visibilitychange', refreshVisible);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.removeEventListener('focus', refreshVisible);
      document.removeEventListener('visibilitychange', refreshVisible);
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
      setData((current) =>
        current
          ? {
              ...current,
              unreadCount: id ? Math.max(0, current.unreadCount - 1) : 0,
              items: current.items.map((item) =>
                !id || item.id === id ? { ...item, isRead: true } : item,
              ),
            }
          : current,
      );
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
