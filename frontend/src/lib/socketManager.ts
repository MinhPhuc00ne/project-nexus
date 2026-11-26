import { WS_NOTIFICATION_EVENTS } from '@nexus/contracts';
import { queryClient } from './queryClient';
import {
  createNotificationConnection,
  type NotificationUnreadCountEvent,
  type RealtimeNotification,
} from '../services/notificationSocket';

export const notificationsQueryKey = ['notifications'] as const;
export const notificationUnreadCountQueryKey = ['notifications', 'unreadCount'] as const;

/**
 * Subscribes to the pooled `/ws/notifications` socket and keeps React Query
 * notification caches synchronized without polling.
 */
export function subscribeNotificationsToQueryCache(
  onNew?: (payload: RealtimeNotification) => void,
): () => void {
  const connection = createNotificationConnection();
  const { socket } = connection;

  const handleUnreadCount = (payload: NotificationUnreadCountEvent) => {
    if (typeof payload.unreadCount === 'number') {
      queryClient.setQueryData(notificationUnreadCountQueryKey, {
        unreadCount: payload.unreadCount,
      });
    }
    void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  };

  const handleNew = (payload: RealtimeNotification) => {
    if (typeof payload.unreadCount === 'number') {
      queryClient.setQueryData(notificationUnreadCountQueryKey, {
        unreadCount: payload.unreadCount,
      });
    } else if (!payload.isRead) {
      queryClient.setQueryData<{ unreadCount: number }>(
        notificationUnreadCountQueryKey,
        (prev) => ({ unreadCount: (prev?.unreadCount ?? 0) + 1 }),
      );
    }
    void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    onNew?.(payload);
  };

  socket.on(WS_NOTIFICATION_EVENTS.SERVER.CONNECTED, handleUnreadCount);
  socket.on(WS_NOTIFICATION_EVENTS.SERVER.UNREAD_COUNT, handleUnreadCount);
  socket.on(WS_NOTIFICATION_EVENTS.SERVER.NEW, handleNew);
  connection.connect();

  return () => {
    socket.off(WS_NOTIFICATION_EVENTS.SERVER.CONNECTED, handleUnreadCount);
    socket.off(WS_NOTIFICATION_EVENTS.SERVER.UNREAD_COUNT, handleUnreadCount);
    socket.off(WS_NOTIFICATION_EVENTS.SERVER.NEW, handleNew);
    connection.disconnect();
  };
}
