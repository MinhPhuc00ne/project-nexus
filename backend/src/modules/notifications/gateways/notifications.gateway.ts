import { Logger, OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  WS_NOTIFICATION_EVENTS,
  type WsNotificationConnectedPayload,
  type WsNotificationNewPayload,
  type WsNotificationUnreadCountPayload,
} from '@nexus/types';
import { Server, Socket } from 'socket.io';
import {
  subscribeNotificationRealtime,
  type RealtimeNotificationRecord,
} from '../../../core/notifications/notification-realtime.bus';
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { SocketMetricsService } from '../../../core/realtime/socket-metrics.service';
import { AuthenticatedUserPayload } from '../../../core/security/roles.decorator';
import { NotificationsService } from '../services/notifications.service';

/**
 * Real-time WebSocket gateway delivering account-scoped notifications across Admin, Staff, Seller, and Buyer sessions.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ws/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleDestroy
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private unsubscribeBus: (() => void) | null = null;

  constructor(
    private readonly tokenAuth: TokenAuthService,
    private readonly notificationsService: NotificationsService,
    private readonly socketMetrics: SocketMetricsService,
  ) {}

  afterInit(): void {
    this.unsubscribeBus?.();
    this.unsubscribeBus = subscribeNotificationRealtime({
      onCreated: async (records) => {
        await this.dispatchCreatedBatch(records);
      },
      onUnreadSync: (payload) => {
        this.emitUnreadCount(payload.userId, payload.unreadCount);
      },
    });
    this.socketMetrics.registerServer('/ws/notifications', this.server);
    this.logger.log('Notifications WebSocket Gateway initialized on namespace /ws/notifications');
  }

  onModuleDestroy(): void {
    this.unsubscribeBus?.();
    this.unsubscribeBus = null;
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const rawToken =
        (typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : '') ||
        (typeof client.handshake.headers?.authorization === 'string'
          ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : '');

      if (!rawToken) {
        client.emit(WS_NOTIFICATION_EVENTS.SERVER.ERROR, {
          message: 'Authentication JWT token is required for /ws/notifications.',
        });
        client.disconnect(true);
        return;
      }

      // A notification stream is personal, so the token must resolve to a usable
      // account before the socket joins that account’s room.
      const user = await this.tokenAuth.authenticateOptional(rawToken);
      if (!user) {
        client.emit(WS_NOTIFICATION_EVENTS.SERVER.ERROR, {
          message: 'Invalid or expired JWT token.',
        });
        client.disconnect(true);
        return;
      }

      const userId = user.id;
      client.data.user = user;
      await client.join(`user:${userId}`);
      if (user.role) {
        await client.join(`role:${user.role}`);
      }

      const { unreadCount } = await this.notificationsService.getUnreadCount(userId);
      const connectedPayload: WsNotificationConnectedPayload = {
        userId,
        role: user.role,
        unreadCount,
        timestamp: new Date().toISOString(),
      };
      client.emit(WS_NOTIFICATION_EVENTS.SERVER.CONNECTED, connectedPayload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Notifications socket connection rejected: ${message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Notifications socket disconnected: ${client.id}`);
  }

  @SubscribeMessage(WS_NOTIFICATION_EVENTS.CLIENT.PING)
  async handlePing(
    @ConnectedSocket() client: Socket,
  ): Promise<WsNotificationUnreadCountPayload | void> {
    const userId = (client.data?.user as AuthenticatedUserPayload | undefined)?.id;
    if (!userId) return;
    const { unreadCount } = await this.notificationsService.getUnreadCount(userId);
    const payload: WsNotificationUnreadCountPayload = { userId, unreadCount };
    client.emit(WS_NOTIFICATION_EVENTS.SERVER.UNREAD_COUNT, payload);
    return payload;
  }

  private async dispatchCreatedBatch(records: RealtimeNotificationRecord[]): Promise<void> {
    if (!this.server || records.length === 0) return;

    const byUser = new Map<string, RealtimeNotificationRecord[]>();
    for (const rec of records) {
      if (!rec.userId) continue;
      const list = byUser.get(rec.userId) ?? [];
      list.push(rec);
      byUser.set(rec.userId, list);
    }

    for (const [userId, userRecords] of byUser.entries()) {
      let unreadCount = userRecords.length;
      try {
        const res = await this.notificationsService.getUnreadCount(userId);
        unreadCount = res.unreadCount;
      } catch {
        // Giữ fallback đếm theo batch nếu truy vấn count tạm thời lỗi
      }

      for (const rec of userRecords) {
        const payload: WsNotificationNewPayload = {
          id: rec.id,
          userId: rec.userId,
          title: rec.title,
          content: rec.content,
          type: rec.type,
          channel: rec.channel,
          isRead: rec.isRead,
          readAt: rec.readAt ? new Date(rec.readAt).toISOString() : null,
          createdAt: new Date(rec.createdAt).toISOString(),
          auctionId: rec.auctionId ?? null,
          targetUrl: rec.targetUrl ?? null,
          metadata: rec.metadata ?? null,
          unreadCount,
        };
        this.server.to(`user:${userId}`).emit(WS_NOTIFICATION_EVENTS.SERVER.NEW, payload);
      }

      this.emitUnreadCount(userId, unreadCount);
    }
  }

  private emitUnreadCount(userId: string, unreadCount: number): void {
    if (!this.server) return;
    const payload: WsNotificationUnreadCountPayload = { userId, unreadCount };
    this.server.to(`user:${userId}`).emit(WS_NOTIFICATION_EVENTS.SERVER.UNREAD_COUNT, payload);
  }
}
