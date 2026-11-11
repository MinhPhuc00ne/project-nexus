import { EventEmitter } from 'node:events';

export interface RealtimeNotificationRecord {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  channel: string;
  isRead: boolean;
  readAt: Date | string | null;
  createdAt: Date | string;
  auctionId: string | null;
  targetUrl: string | null;
}

export interface NotificationRealtimeHandlers {
  onCreated: (records: RealtimeNotificationRecord[]) => void | Promise<void>;
  onUnreadSync: (payload: { userId: string; unreadCount: number }) => void | Promise<void>;
}

const busEmitter = new EventEmitter();
busEmitter.setMaxListeners(25);

const CREATED_EVENT = 'notifications.created';
const UNREAD_SYNC_EVENT = 'notifications.unread_sync';

/**
 * Emits committed in-app notification records to active WebSocket notification gateways.
 */
export function publishCreatedNotifications(records: RealtimeNotificationRecord[]): void {
  if (!records.length) return;
  busEmitter.emit(CREATED_EVENT, records);
}

/**
 * Emits synchronized unread counter updates across a user's active WebSocket sessions.
 */
export function publishUnreadCountSync(userId: string, unreadCount: number): void {
  busEmitter.emit(UNREAD_SYNC_EVENT, { userId, unreadCount });
}

/**
 * Registers real-time notification bus handlers and returns an unsubscribe callback.
 */
export function subscribeNotificationRealtime(handlers: NotificationRealtimeHandlers): () => void {
  const createdListener = (records: RealtimeNotificationRecord[]) => {
    void Promise.resolve(handlers.onCreated(records)).catch(() => {});
  };
  const unreadListener = (payload: { userId: string; unreadCount: number }) => {
    void Promise.resolve(handlers.onUnreadSync(payload)).catch(() => {});
  };

  busEmitter.on(CREATED_EVENT, createdListener);
  busEmitter.on(UNREAD_SYNC_EVENT, unreadListener);

  return () => {
    busEmitter.off(CREATED_EVENT, createdListener);
    busEmitter.off(UNREAD_SYNC_EVENT, unreadListener);
  };
}
