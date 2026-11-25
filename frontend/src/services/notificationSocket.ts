import { io, type Socket } from 'socket.io-client';
import i18n from '../i18n';
import { API_BASE_URL } from './api';
import { getStoredToken, getStoredUser } from './auth';
import type { UserNotification } from '../types/notification.types';

export interface NotificationUnreadCountEvent {
  userId: string;
  unreadCount: number;
}

export interface NotificationConnectedEvent extends NotificationUnreadCountEvent {
  role: string;
  timestamp: string;
}

export interface RealtimeNotification extends UserNotification {
  userId: string;
  unreadCount?: number;
}

interface NotificationServerEvents {
  'notification:connected': (event: NotificationConnectedEvent) => void;
  'notification:new': (notification: RealtimeNotification) => void;
  'notification:unread_count': (event: NotificationUnreadCountEvent) => void;
  'notification:error': (event: { message: string }) => void;
}

interface NotificationClientEvents {
  'notification:ping': () => void;
}

export type NotificationSocket = Socket<NotificationServerEvents, NotificationClientEvents>;

export interface NotificationSocketConnection {
  socket: NotificationSocket;
  connect: () => void;
  disconnect: () => void;
}

/** Opens the authenticated account-notification Socket.IO connection. */
export function createNotificationConnection(): NotificationSocketConnection {
  if (!getStoredToken())
    throw new Error(i18n.t('errors:services.notificationsRealtimeAuthRequired'));

  const backendUrl = new URL(API_BASE_URL, window.location.origin);
  const socket: NotificationSocket = io(`${backendUrl.origin}/ws/notifications`, {
    autoConnect: false,
    auth: (callback) => callback({ token: getStoredToken() }),
  });
  const userId = getStoredUser()?.id;
  const onAuthChange = (): void => {
    if (!getStoredToken() || getStoredUser()?.id !== userId) {
      socket.disconnect();
    } else {
      socket.disconnect().connect();
    }
  };
  window.addEventListener('nexus:auth-change', onAuthChange);

  return {
    socket,
    connect: () => socket.connect(),
    disconnect: () => {
      window.removeEventListener('nexus:auth-change', onAuthChange);
      socket.disconnect();
      socket.removeAllListeners();
    },
  };
}
