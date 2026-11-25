import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/** Event names the platform publishes in-process. */
export const DOMAIN_EVENTS = {
  NOTIFICATIONS_CREATED: 'notifications.created',
  NOTIFICATIONS_UNREAD_SYNC: 'notifications.unread_sync',
} as const;

/** A committed in-app notification, as the realtime gateways need it. */
export interface NotificationCreatedEvent {
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
  metadata?: Record<string, unknown> | null;
}

/** A user's unread counter, synchronised across their open sessions. */
export interface UnreadSyncEvent {
  userId: string;
  unreadCount: number;
}

/**
 * Publishes in-process domain events, for side effects that may be lost without
 * harm — pushing a notification to an open socket, refreshing a counter.
 *
 * This replaces a bare `node:events` emitter that sat in a module-level
 * singleton while `EventEmitterModule` was already registered globally and
 * unused. Anything that must survive a crash belongs in the outbox instead,
 * because an in-process emitter offers no delivery guarantee.
 */
@Injectable()
export class DomainEventsService {
  constructor(private readonly emitter: EventEmitter2) {}

  /**
   * Announces notifications that are already committed.
   *
   * @param records - The committed notifications.
   * @returns Completion.
   */
  publishNotificationsCreated(records: NotificationCreatedEvent[]): void {
    if (!records.length) return;
    this.emitter.emit(DOMAIN_EVENTS.NOTIFICATIONS_CREATED, records);
  }

  /**
   * Announces a user's new unread total.
   *
   * @param userId - Whose counter changed.
   * @param unreadCount - The new total.
   * @returns Completion.
   */
  publishUnreadSync(userId: string, unreadCount: number): void {
    this.emitter.emit(DOMAIN_EVENTS.NOTIFICATIONS_UNREAD_SYNC, { userId, unreadCount });
  }

  /**
   * Subscribes to committed notifications.
   *
   * @param handler - Called with each committed batch.
   * @returns A function that unsubscribes.
   */
  onNotificationsCreated(
    handler: (records: NotificationCreatedEvent[]) => void | Promise<void>,
  ): () => void {
    const listener = (records: NotificationCreatedEvent[]) => {
      void Promise.resolve(handler(records)).catch(() => {
        // A gateway that cannot deliver must not break the publisher.
      });
    };
    this.emitter.on(DOMAIN_EVENTS.NOTIFICATIONS_CREATED, listener);
    return () => this.emitter.off(DOMAIN_EVENTS.NOTIFICATIONS_CREATED, listener);
  }

  /**
   * Subscribes to unread counter updates.
   *
   * @param handler - Called with each update.
   * @returns A function that unsubscribes.
   */
  onUnreadSync(handler: (payload: UnreadSyncEvent) => void | Promise<void>): () => void {
    const listener = (payload: UnreadSyncEvent) => {
      void Promise.resolve(handler(payload)).catch(() => {
        // Same as above: delivery is best effort by design.
      });
    };
    this.emitter.on(DOMAIN_EVENTS.NOTIFICATIONS_UNREAD_SYNC, listener);
    return () => this.emitter.off(DOMAIN_EVENTS.NOTIFICATIONS_UNREAD_SYNC, listener);
  }
}
