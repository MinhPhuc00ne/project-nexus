import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { LightweightJwt } from '../../../core/security/jwt.util';
import { AuthenticatedUserPayload } from '../../../core/security/roles.decorator';
import { ChatService, ChatSocketBroadcaster } from '../services/chat.service';

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
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.chatService.setBroadcaster(this);
    this.logger.log('Chat WebSocket Gateway initialized successfully.');
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

  handleConnection(client: Socket) {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!rawToken) {
        this.logger.warn(`Socket client ${client.id} missing token, disconnecting.`);
        client.disconnect();
        return;
      }

      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'super-secret-jwt-key-nexus-change-in-production-2026';

      const verifyResult = LightweightJwt.verify<AuthenticatedUserPayload>(rawToken, secret);

      if (!verifyResult.valid || !verifyResult.payload) {
        this.logger.warn(`Socket client ${client.id} invalid token, disconnecting.`);
        client.disconnect();
        return;
      }

      const user = verifyResult.payload;
      const userId = user.id || user.sub;
      client.data.user = { ...user, id: userId };

      client.join(`user:${userId}`);
      this.logger.log(`User ${userId} connected via WebSocket (socketId: ${client.id})`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error handling socket connection: ${errMsg}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
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
    const userName = isStaff
      ? 'Nhân viên Hỗ trợ Nexus'
      : user.fullName || user.email || 'Người dùng';

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
