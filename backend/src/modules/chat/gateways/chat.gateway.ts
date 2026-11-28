import { ChatPresenceService } from '../services/chat-presence.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CHAT_EVENTS,
  type ChatMessageEvent,
  type ChatReadEvent,
  type ChatStatusChangeEvent,
  type ChatToStaffEvent,
  type ChatToUserEvent,
} from '../services/chat-realtime.publisher';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  WS_CHAT_EVENTS,
  WsChatSendMessageSchema,
  WsChatTypingSchema,
  WsJoinConversationSchema,
  WsLeaveConversationSchema,
  WsMarkReadSchema,
} from '@nexus/contracts';
import { createCorsOriginCallback } from '../../../core/config/env.schema';
import { AuthenticatedUserPayload } from '../../../core/security/roles.decorator';
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { SocketMetricsService } from '../../../core/realtime/socket-metrics.service';
import { ChatService, ChatSocketBroadcaster } from '../services/chat.service';
import { StaffQueueService } from '../services/staff-queue.service';

@WebSocketGateway({
  cors: {
    origin: createCorsOriginCallback(),
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, ChatSocketBroadcaster
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly tokenAuth: TokenAuthService,
    private readonly staffQueueService: StaffQueueService,
    private readonly presence: ChatPresenceService,
    private readonly socketMetrics: SocketMetricsService,
    private readonly emitter: EventEmitter2,
  ) {}

  afterInit() {
    // The gateway subscribes to what the service publishes, rather than the
    // service holding a reference back to the gateway.
    this.emitter.on(CHAT_EVENTS.MESSAGE, ({ conversationId, message }: ChatMessageEvent) =>
      this.broadcastMessage(conversationId, message),
    );
    this.emitter.on(CHAT_EVENTS.READ, ({ conversationId, userId }: ChatReadEvent) =>
      this.broadcastRead(conversationId, userId),
    );
    this.emitter.on(CHAT_EVENTS.TO_USER, ({ userId, event, payload }: ChatToUserEvent) =>
      this.broadcastToUser(userId, event, payload),
    );
    this.emitter.on(CHAT_EVENTS.TO_STAFF, ({ event, payload }: ChatToStaffEvent) =>
      this.broadcastToStaff(event, payload),
    );
    this.emitter.on(
      CHAT_EVENTS.STATUS_CHANGE,
      ({ conversationId, status, assignedStaffId }: ChatStatusChangeEvent) =>
        this.broadcastStatusChange(conversationId, status, assignedStaffId),
    );

    this.socketMetrics.registerServer('/chat', this.server);
    this.logger.log('Chat WebSocket Gateway initialized successfully.');
  }

  async isUserOnline(userId: string): Promise<boolean | null> {
    return this.roomOnline(`user:${userId}`);
  }

  async isSupportOnline(): Promise<boolean | null> {
    return this.roomOnline('role:SUPPORT_STAFF');
  }

  private async roomOnline(room: string): Promise<boolean | null> {
    if (!this.server) return null;
    try {
      return (await this.server.in(room).fetchSockets()).length > 0;
    } catch {
      // An unavailable presence adapter does not establish that a shop is offline.
      return null;
    }
  }

  broadcastMessage(conversationId: string, message: unknown): void {
    try {
      this.server?.to(`conversation:${conversationId}`).emit('new_message', message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast new_message: ${msg}`);
    }
  }

  broadcastRead(conversationId: string, userId: string): void {
    try {
      this.server?.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        readBy: userId,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast messages_read: ${msg}`);
    }
  }

  broadcastToUser(userId: string, event: string, payload: unknown): void {
    try {
      this.server?.to(`user:${userId}`).emit(event, payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast ${event} to user ${userId}: ${msg}`);
    }
  }

  broadcastToStaff(event: string, payload: unknown): void {
    try {
      this.server?.to('role:SUPPORT_STAFF').emit(event, payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast ${event} to staff room: ${msg}`);
    }
  }

  broadcastStatusChange(
    conversationId: string,
    status: string,
    assignedStaffId?: string | null,
  ): void {
    try {
      this.server?.to(`conversation:${conversationId}`).emit('conversation_status_changed', {
        conversationId,
        status,
        assignedStaffId,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast conversation_status_changed: ${msg}`);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!rawToken) {
        this.logger.warn(`Socket client ${client.id} missing token, disconnecting.`);
        client.disconnect();
        return;
      }

      // Chat is never anonymous: a token that fails verification, or belongs to a
      // suspended or signed-out account, closes the socket.
      const user = await this.tokenAuth.authenticateOptional(rawToken);
      if (!user) {
        this.logger.warn(`Socket client ${client.id} invalid token, disconnecting.`);
        client.disconnect();
        return;
      }

      const userId = user.id;
      client.data.user = user;

      client.join(`user:${userId}`);
      await this.presence.connect(userId, client.id);

      if (user.role === 'SUPPORT_STAFF') {
        client.join('role:SUPPORT_STAFF');
        await this.staffQueueService.registerOnlineStaff(userId, client.id);
        void this.chatService.processQueueForStaff(userId);
      }

      this.logger.log(
        `User ${userId} (${user.role}) connected via WebSocket (socketId: ${client.id})`,
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error handling socket connection: ${errMsg}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user?.id) {
      await this.presence.disconnect(user.id, client.id);
    }
    if (user?.role === 'SUPPORT_STAFF' && user.id) {
      await this.staffQueueService.unregisterStaff(user.id, client.id);
    }
    this.logger.log(`Socket client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WS_CHAT_EVENTS.CLIENT.JOIN_CONVERSATION)
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<{ event?: string; conversationId?: string; status?: string; message?: string }> {
    const user = (client.data as { user?: AuthenticatedUserPayload }).user;
    if (!user?.id) {
      const message = 'Authentication is required.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    const parsed = WsJoinConversationSchema.safeParse(data);
    if (!parsed.success) {
      const message = 'Invalid conversation payload.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    try {
      await this.chatService.assertConversationAccess(
        parsed.data.conversationId,
        user.id,
        user.role,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Access denied.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    await client.join(`conversation:${parsed.data.conversationId}`);
    return { event: 'joined', conversationId: parsed.data.conversationId };
  }

  @SubscribeMessage(WS_CHAT_EVENTS.CLIENT.LEAVE_CONVERSATION)
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<{ event?: string; conversationId?: string; status?: string; message?: string }> {
    const parsed = WsLeaveConversationSchema.safeParse(data);
    if (!parsed.success) {
      const message = 'Invalid conversation payload.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    await client.leave(`conversation:${parsed.data.conversationId}`);
    return { event: 'left', conversationId: parsed.data.conversationId };
  }

  @SubscribeMessage(WS_CHAT_EVENTS.CLIENT.SEND_MESSAGE)
  async handleSendMessage(@ConnectedSocket() client: Socket, @MessageBody() data: unknown) {
    const user = (client.data as { user?: AuthenticatedUserPayload }).user;
    if (!user?.id) {
      const message = 'Authentication is required.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    const parsed = WsChatSendMessageSchema.safeParse(data);
    if (!parsed.success) {
      const message = 'Invalid message payload.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    try {
      const message = await this.chatService.sendMessage(user.id, user.role, {
        conversationId: parsed.data.conversationId,
        content: parsed.data.content || parsed.data.body,
        attachments: parsed.data.attachments,
      });

      return { status: 'ok', data: message };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to send message.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message: errMsg });
      return { status: 'error', message: errMsg };
    }
  }

  @SubscribeMessage(WS_CHAT_EVENTS.CLIENT.TYPING)
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<{ status?: string; message?: string } | void> {
    const user = (client.data as { user?: AuthenticatedUserPayload }).user;
    if (!user?.id) {
      const message = 'Authentication is required.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    const parsed = WsChatTypingSchema.safeParse(data);
    if (!parsed.success) {
      const message = 'Invalid typing payload.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    try {
      await this.chatService.assertConversationAccess(
        parsed.data.conversationId,
        user.id,
        user.role,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Access denied.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    const isStaff = user.role === 'SUPPORT_STAFF';
    const fullName = (user as AuthenticatedUserPayload & { fullName?: string }).fullName;
    const userName = isStaff ? 'Support Staff' : fullName || user.email || 'User';

    client
      .to(`conversation:${parsed.data.conversationId}`)
      .emit(WS_CHAT_EVENTS.SERVER.USER_TYPING, {
        conversationId: parsed.data.conversationId,
        userId: isStaff ? 'SUPPORT_STAFF_DESK' : user.id,
        userName,
        isTyping: parsed.data.isTyping,
      });
  }

  @SubscribeMessage(WS_CHAT_EVENTS.CLIENT.MARK_READ)
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<{ status: string; message?: string }> {
    const user = (client.data as { user?: AuthenticatedUserPayload }).user;
    if (!user?.id) {
      const message = 'Authentication is required.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    const parsed = WsMarkReadSchema.safeParse(data);
    if (!parsed.success) {
      const message = 'Invalid mark_read payload.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }

    try {
      await this.chatService.markAsRead(parsed.data.conversationId, user.id, user.role);
      return { status: 'ok' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark messages as read.';
      client.emit(WS_CHAT_EVENTS.SERVER.ERROR, { message });
      return { status: 'error', message };
    }
  }
}
