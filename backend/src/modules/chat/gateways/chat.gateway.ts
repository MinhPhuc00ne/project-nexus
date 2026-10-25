import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LightweightJwt } from '../../../core/security/jwt.util';
import { AuthenticatedUserPayload } from '../../../core/security/roles.decorator';
import { ChatService } from '../services/chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Xác thực và đăng ký socket client khi kết nối
   */
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

      // Cho user tham gia phòng riêng cá nhân để nhận thông báo tin nhắn mới
      client.join(`user:${userId}`);
      this.logger.log(`User ${userId} connected via WebSocket (socketId: ${client.id})`);
    } catch (err: any) {
      this.logger.error(`Error handling socket connection: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket client disconnected: ${client.id}`);
  }

  /**
   * Tham gia vào phòng hội thoại cụ thể
   */
  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data?.conversationId) return;
    client.join(`conversation:${data.conversationId}`);
    return { event: 'joined', conversationId: data.conversationId };
  }

  /**
   * Rời khỏi phòng hội thoại
   */
  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data?.conversationId) return;
    client.leave(`conversation:${data.conversationId}`);
    return { event: 'left', conversationId: data.conversationId };
  }

  /**
   * Gửi tin nhắn qua WebSocket trong thời gian thực
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      body: string;
      attachments?: string[];
    },
  ) {
    const user = client.data.user;
    if (!user || !data?.conversationId || !data?.body?.trim()) {
      return { status: 'error', message: 'Dữ liệu tin nhắn không hợp lệ.' };
    }

    try {
      const message = await this.chatService.sendMessage(data.conversationId, user.id, user.role, {
        body: data.body,
        attachments: data.attachments,
      });

      // Broadcast tin nhắn mới tới tất cả các client đang mở conversation này
      this.server.to(`conversation:${data.conversationId}`).emit('new_message', message);

      return { status: 'ok', data: message };
    } catch (err: any) {
      return { status: 'error', message: err.message || 'Lỗi gửi tin nhắn' };
    }
  }

  /**
   * Trạng thái đang nhập văn bản (typing indicator)
   */
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

    client.to(`conversation:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId: user.id,
      userName: user.email || 'Người dùng',
      isTyping: data.isTyping,
    });
  }

  /**
   * Đánh dấu đã đọc qua WebSocket
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.conversationId) return;

    await this.chatService.markAsRead(data.conversationId, user.id);

    client.to(`conversation:${data.conversationId}`).emit('messages_read', {
      conversationId: data.conversationId,
      readBy: user.id,
    });

    return { status: 'ok' };
  }
}
