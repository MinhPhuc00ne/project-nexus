import { io, type Socket } from 'socket.io-client';
import i18n from '../i18n';
import { API_BASE_URL } from './api';
import { getStoredToken, getStoredUser } from './auth';
import { leaseSocket } from './socketPool';
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

/**
 * Takes a lease on this account's notification connection.
 *
 * Five places call this — the header dropdown, the seller notification hook,
 * the buyer wallet, the seller finance page and the staff header — and each
 * used to open its own socket. They share one now; it closes when the last of
 * them lets go.
 *
 * @returns A connection to subscribe on, and to release when done with it.
 */
export function createNotificationConnection(): NotificationSocketConnection {
  if (!getStoredToken())
    throw new Error(i18n.t('errors:services.notificationsRealtimeAuthRequired'));

  const userId = getStoredUser()?.id;
  return leaseSocket<NotificationSocket>(`notifications:${userId ?? 'anonymous'}`, () => {
    const backendUrl = new URL(API_BASE_URL, window.location.origin);
    const socket: NotificationSocket = io(`${backendUrl.origin}/ws/notifications`, {
      autoConnect: false,
      auth: (callback) => callback({ token: getStoredToken() }),
    });
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
      teardown: () => window.removeEventListener('nexus:auth-change', onAuthChange),
    };
  });
}
