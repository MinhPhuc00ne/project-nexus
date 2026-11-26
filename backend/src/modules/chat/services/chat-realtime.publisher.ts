import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChatPresenceService } from './chat-presence.service';
import { StaffQueueService } from './staff-queue.service';

/** Realtime chat events the gateway listens for. */
export const CHAT_EVENTS = {
  MESSAGE: 'chat.message',
  READ: 'chat.read',
  TO_USER: 'chat.to_user',
  TO_STAFF: 'chat.to_staff',
  STATUS_CHANGE: 'chat.status_change',
} as const;

export interface ChatMessageEvent {
  conversationId: string;
  message: unknown;
}

export interface ChatReadEvent {
  conversationId: string;
  userId: string;
}

export interface ChatToUserEvent {
  userId: string;
  event: string;
  payload: unknown;
}

export interface ChatToStaffEvent {
  event: string;
  payload: unknown;
}

export interface ChatStatusChangeEvent {
  conversationId: string;
  status: string;
  assignedStaffId?: string | null;
}

/**
 * Carries chat updates from the service to the WebSocket gateway.
 *
 * The gateway needs `ChatService` to handle incoming messages, and the service
 * needed the gateway to push outgoing ones. That circle was broken with a
 * `setBroadcaster()` call from the gateway's `afterInit`, which left the service
 * holding a mutable reference that was null until the socket server happened to
 * start, and made the dependency invisible to Nest.
 *
 * Publishing events instead means the service depends on nothing but this
 * publisher, and the gateway subscribes. A message published while no gateway
 * is listening is dropped, which is correct: there is nobody connected to
 * receive it.
 *
 * Presence is answered from the staff queue in Redis rather than by asking the
 * socket server, so it is the same answer on every instance.
 */
@Injectable()
export class ChatRealtimePublisher {
  constructor(
    private readonly emitter: EventEmitter2,
    private readonly staffQueue: StaffQueueService,
    private readonly presence: ChatPresenceService,
  ) {}

  /** Announces a new message in a conversation. */
  message(conversationId: string, message: unknown): void {
    this.emitter.emit(CHAT_EVENTS.MESSAGE, { conversationId, message } satisfies ChatMessageEvent);
  }

  /** Announces that a participant has read a conversation. */
  read(conversationId: string, userId: string): void {
    this.emitter.emit(CHAT_EVENTS.READ, { conversationId, userId } satisfies ChatReadEvent);
  }

  /** Sends an event to one account's open sockets. */
  toUser(userId: string, event: string, payload: unknown): void {
    this.emitter.emit(CHAT_EVENTS.TO_USER, { userId, event, payload } satisfies ChatToUserEvent);
  }

  /** Sends an event to every member of support staff. */
  toStaff(event: string, payload: unknown): void {
    this.emitter.emit(CHAT_EVENTS.TO_STAFF, { event, payload } satisfies ChatToStaffEvent);
  }

  /** Announces a conversation's new lifecycle status. */
  statusChange(conversationId: string, status: string, assignedStaffId?: string | null): void {
    this.emitter.emit(CHAT_EVENTS.STATUS_CHANGE, {
      conversationId,
      status,
      assignedStaffId,
    } satisfies ChatStatusChangeEvent);
  }

  /**
   * Whether an account is reachable on chat.
   *
   * @param userId - Which account, shop owner or member of staff alike.
   * @returns True when they hold an open socket on any instance.
   */
  async isUserOnline(userId: string): Promise<boolean> {
    return this.presence.isOnline(userId);
  }

  /**
   * Whether a member of support staff is reachable.
   *
   * @param staffId - Which member of staff.
   * @returns True when they hold an open socket.
   */
  async isStaffOnline(staffId: string): Promise<boolean> {
    return this.staffQueue.isStaffOnline(staffId);
  }

  /**
   * Whether anybody on support is reachable.
   *
   * @returns True when at least one member of staff is online.
   */
  async isSupportOnline(): Promise<boolean> {
    return (await this.staffQueue.getOnlineStaffCount()) > 0;
  }
}
