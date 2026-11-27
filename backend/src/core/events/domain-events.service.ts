import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/** Event names the platform publishes in-process. */
export const DOMAIN_EVENTS = {
  NOTIFICATIONS_CREATED: 'notifications.created',
  NOTIFICATIONS_UNREAD_SYNC: 'notifications.unread_sync',
  AUCTION_STATE_CHANGED: 'auction.state_changed',
} as const;

/** In-process auction lifecycle state transition signal used to invalidate timer caches. */
export interface AuctionStateChangedEvent {
  auctionId: string;
  reason: 'STARTED' | 'BID_PLACED' | 'EXTENDED' | 'LOT_ENDED' | 'ROOM_ENDED' | 'AWARD_SETTLED';
}

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
 * Publishes in-process domain events for side effects such as pushing a
 * notification to an open socket, refreshing a counter, or invalidating an
 * active-auction cache.
 *
 * This replaces a bare `node:events` emitter that sat in a module-level
 * singleton while `EventEmitterModule` was already registered globally and
 * unused.
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
    return this.subscribeBestEffort(DOMAIN_EVENTS.NOTIFICATIONS_UNREAD_SYNC, handler);
  }

  /**
   * Announces that an auction room or lot changed active/ended state.
   *
   * @param payload - The auction identifier and transition reason.
   */
  publishAuctionStateChanged(payload: AuctionStateChangedEvent): void {
    this.emitter.emit(DOMAIN_EVENTS.AUCTION_STATE_CHANGED, payload);
  }

  /**
   * Subscribes to auction state changes.
   *
   * @param handler - Called whenever an active auction starts, receives a bid/extension, or closes.
   * @returns A function that unsubscribes.
   */
  onAuctionStateChanged(
    handler: (payload: AuctionStateChangedEvent) => void | Promise<void>,
  ): () => void {
    return this.subscribeBestEffort(DOMAIN_EVENTS.AUCTION_STATE_CHANGED, handler);
  }

  private subscribeBestEffort<T>(
    eventName: string,
    handler: (payload: T) => void | Promise<void>,
  ): () => void {
    const listener = (payload: T) => {
      void Promise.resolve(handler(payload)).catch(() => {
        // Best-effort subscribers must never fail the publishing caller.
      });
    };
    this.emitter.on(eventName, listener);
    return () => this.emitter.off(eventName, listener);
  }
}
