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
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { ChatService, ChatSocketBroadcaster } from '../services/chat.service';
import { StaffQueueService } from '../services/staff-queue.service';

@WebSocketGateway({
  cors: {
    origin: '*',
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
  ) {}

  afterInit() {
    this.chatService.setBroadcaster(this);
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

      if (user.role === 'SUPPORT_STAFF') {
        client.join('role:SUPPORT_STAFF');
        this.staffQueueService.registerOnlineStaff(userId, client.id);
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

  handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user?.role === 'SUPPORT_STAFF' && user.id) {
      this.staffQueueService.unregisterStaff(user.id, client.id);
    }
    this.logger.log(`Socket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data?.conversationId) return;
    client.join(`conversation:${data.conversationId}`);
    return { event: 'joined', conversationId: data.conversationId };
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data?.conversationId) return;
    client.leave(`conversation:${data.conversationId}`);
    return { event: 'left', conversationId: data.conversationId };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      body?: string;
      content?: string;
      attachments?: string[];
    },
  ) {
    const user = client.data.user;
    if (!user || !data?.conversationId) {
      return { status: 'error', message: 'Dữ liệu tin nhắn không hợp lệ.' };
    }

    try {
      const message = await this.chatService.sendMessage(user.id, user.role, {
        conversationId: data.conversationId,
        content: data.content || data.body,
        attachments: data.attachments,
      });

      return { status: 'ok', data: message };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi gửi tin nhắn';
      return { status: 'error', message: errMsg };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      isTyping: boolean;
    },
  ) {
    const user = client.data.user;
    if (!user || !data?.conversationId) return;

    const isStaff = user.role === 'SUPPORT_STAFF';
    const userName = isStaff ? 'Nhân viên Hỗ trợ' : user.fullName || user.email || 'Người dùng';

    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: isStaff ? 'SUPPORT_STAFF_DESK' : user.id,
      userName,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.conversationId) return;

    await this.chatService.markAsRead(data.conversationId, user.id, user.role);
    return { status: 'ok' };
  }
}
