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
import { Role } from '@prisma/client';
import { Server, Socket } from 'socket.io';
import {
  WS_AUCTION_EVENTS,
  Ws3dSyncPayload,
  WsAuctionStartedPayload,
  WsBidPlacedPayload,
  WsBidRejectedPayload,
  WsJoinRoomDto,
  WsLotEndedPayload,
  WsPlaceBidDto,
  WsTimeExtendedPayload,
  WsTimerSyncPayload,
} from '@nexus/types';
import { LightweightJwt } from '../../../core/security/jwt.util';
import { AuthenticatedUserPayload } from '../../../core/security/roles.decorator';

export type PlaceBidSocketHandler = (
  auctionId: string,
  auctionItemId: string | undefined,
  bidderId: string,
  bidAmount: number,
) => Promise<unknown>;

/**
 * Interface contract defining broadcasting capabilities for live auctions.
 */
export interface AuctionSocketBroadcaster {
  broadcastAuctionStarted(payload: WsAuctionStartedPayload): void;
  broadcastBidPlaced(payload: WsBidPlacedPayload): void;
  broadcastTimerSync(payload: WsTimerSyncPayload): void;
  broadcastTimeExtended(payload: WsTimeExtendedPayload): void;
  broadcastLotEnded(payload: WsLotEndedPayload): void;
  broadcastAuctionEnded(payload: {
    auctionId: string;
    winningBidderId?: string | null;
    winningPrice?: number;
  }): void;
}

/**
 * WebSocket gateway orchestrating real-time room events and 3D synchronizations for live bidding.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ws/auctions',
})
export class AuctionGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, AuctionSocketBroadcaster
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AuctionGateway.name);
  private placeBidHandler: PlaceBidSocketHandler | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Registers the domain bid placement handler called when a client submits `auction:place_bid`.
   */
  registerPlaceBidHandler(handler: PlaceBidSocketHandler): void {
    this.placeBidHandler = handler;
  }

  /**
   * Lifecycle hook executed after the gateway initializes.
   */
  afterInit(): void {
    this.logger.log('Auction WebSocket Gateway initialized on namespace /ws/auctions');
  }

  /**
   * Handles client connection attempt and authenticates optional user session.
   *
   * @param client Connecting socket instance
   */
  handleConnection(client: Socket): void {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (rawToken) {
        const secret = this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        const verifyResult = LightweightJwt.verify<AuthenticatedUserPayload>(rawToken, secret);
        if (verifyResult.valid && verifyResult.payload) {
          const user = verifyResult.payload;
          const userId = user.id || user.sub;
          client.data.user = { ...user, id: userId };
          client.join(`user:${userId}`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Handshake token verification failed: ${message}`);
    }
  }

  /**
   * Cleans up room subscriptions when a client disconnects.
   *
   * @param client Disconnecting socket instance
   */
  handleDisconnect(client: Socket): void {
    this.logger.debug(`Socket client disconnected: ${client.id}`);
  }

  /**
   * Subscribes a client socket to an auction specific broadcast room.
   *
   * @param client Active socket connection
   * @param data Room specification payload
   */
  @SubscribeMessage(WS_AUCTION_EVENTS.CLIENT.JOIN_ROOM)
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: WsJoinRoomDto): void {
    if (!data?.auctionId) {
      client.emit(WS_AUCTION_EVENTS.SERVER.ERROR, { message: 'Missing auctionId in payload' });
      return;
    }
    const room = `auction:${data.auctionId}`;
    void client.join(room);
    client.emit(WS_AUCTION_EVENTS.SERVER.ROOM_JOINED, {
      auctionId: data.auctionId,
      socketId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Unsubscribes a client socket from an auction room.
   *
   * @param client Active socket connection
   * @param data Room specification payload
   */
  @SubscribeMessage(WS_AUCTION_EVENTS.CLIENT.LEAVE_ROOM)
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: WsJoinRoomDto): void {
    if (data?.auctionId) {
      void client.leave(`auction:${data.auctionId}`);
    }
  }

  /**
   * Handles real-time bid submissions over WebSocket, delegating validation and escrow locks
   * to the registered AuctionService handler and returning rejection feedback directly to caller.
   */
  @SubscribeMessage(WS_AUCTION_EVENTS.CLIENT.PLACE_BID)
  async handlePlaceBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsPlaceBidDto,
  ): Promise<{ ok: boolean; data?: unknown; error?: string }> {
    const user = (client.data as { user?: AuthenticatedUserPayload }).user;
    if (!user?.id) {
      const rejection: WsBidRejectedPayload = {
        auctionId: data?.auctionId ?? '',
        auctionItemId: data?.auctionItemId,
        message: 'Vui lòng đăng nhập để tham gia đặt giá.',
      };
      client.emit(WS_AUCTION_EVENTS.SERVER.BID_REJECTED, rejection);
      return { ok: false, error: rejection.message };
    }

    if (!this.placeBidHandler) {
      const rejection: WsBidRejectedPayload = {
        auctionId: data?.auctionId ?? '',
        auctionItemId: data?.auctionItemId,
        message: 'Hệ thống đặt giá trực tuyến đang khởi tạo, vui lòng thử lại.',
      };
      client.emit(WS_AUCTION_EVENTS.SERVER.BID_REJECTED, rejection);
      return { ok: false, error: rejection.message };
    }

    const amount = Number(data?.bidAmount);
    if (!data?.auctionId || !Number.isFinite(amount) || amount <= 0) {
      const rejection: WsBidRejectedPayload = {
        auctionId: data?.auctionId ?? '',
        auctionItemId: data?.auctionItemId,
        message: 'Thông tin phòng đấu giá hoặc mức giá không hợp lệ.',
      };
      client.emit(WS_AUCTION_EVENTS.SERVER.BID_REJECTED, rejection);
      return { ok: false, error: rejection.message };
    }

    try {
      const result = await this.placeBidHandler(
        data.auctionId,
        data.auctionItemId,
        user.id,
        amount,
      );
      return { ok: true, data: result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đặt giá không thành công.';
      const rejection: WsBidRejectedPayload = {
        auctionId: data.auctionId,
        auctionItemId: data.auctionItemId,
        message,
      };
      client.emit(WS_AUCTION_EVENTS.SERVER.BID_REJECTED, rejection);
      return { ok: false, error: message };
    }
  }

  /**
   * Synchronizes viewport manipulation for interactive 3D inspection models (Admin only).
   *
   * @param client Originating socket connection
   * @param data 3D camera rotation and zoom coordinates
   */
  @SubscribeMessage(WS_AUCTION_EVENTS.CLIENT.SYNC_VIEWPORT)
  handleSyncViewport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: Ws3dSyncPayload,
  ): void {
    const user = (client.data as { user?: AuthenticatedUserPayload }).user;
    if (user?.role !== Role.ADMIN) {
      client.emit(WS_AUCTION_EVENTS.SERVER.ERROR, {
        message: 'Chỉ Admin mới có quyền điều khiển đồng bộ góc nhìn 3D.',
      });
      return;
    }
    if (data?.auctionId) {
      client.to(`auction:${data.auctionId}`).emit(WS_AUCTION_EVENTS.SERVER.VIEWPORT_UPDATED, data);
    }
  }

  /**
   * Broadcasts auction start event so connected roles immediately play the 3D showcase intro.
   *
   * @param payload Auction start telemetry
   */
  broadcastAuctionStarted(payload: WsAuctionStartedPayload): void {
    try {
      this.server?.emit(WS_AUCTION_EVENTS.SERVER.AUCTION_STARTED, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast auction start: ${message}`);
    }
  }

  /**
   * Broadcasts an accepted bid event to all observers of the auction room.
   *
   * @param payload Bid event metadata and new minimum increment
   */
  broadcastBidPlaced(payload: WsBidPlacedPayload): void {
    try {
      this.server
        ?.to(`auction:${payload.auctionId}`)
        .emit(WS_AUCTION_EVENTS.SERVER.BID_PLACED, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast bid placement: ${message}`);
    }
  }

  /**
   * Synchronizes the auction countdown clock across observer clients.
   *
   * @param payload Timer synchronization telemetry
   */
  broadcastTimerSync(payload: WsTimerSyncPayload): void {
    try {
      this.server
        ?.to(`auction:${payload.auctionId}`)
        .emit(WS_AUCTION_EVENTS.SERVER.TIMER_SYNC, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast timer synchronization: ${message}`);
    }
  }

  /**
   * Notifies participants when anti-sniping protection extends the auction duration.
   *
   * @param payload Extension parameters and updated deadline
   */
  broadcastTimeExtended(payload: WsTimeExtendedPayload): void {
    try {
      this.server
        ?.to(`auction:${payload.auctionId}`)
        .emit(WS_AUCTION_EVENTS.SERVER.TIME_EXTENDED, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast anti-sniping extension: ${message}`);
    }
  }

  /**
   * Broadcasts lot completion event when Admin ends a single lot or its timer expires.
   *
   * @param payload Lot conclusion telemetry
   */
  broadcastLotEnded(payload: WsLotEndedPayload): void {
    try {
      this.server
        ?.to(`auction:${payload.auctionId}`)
        .emit(WS_AUCTION_EVENTS.SERVER.LOT_ENDED, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast lot ending: ${message}`);
    }
  }

  /**
   * Broadcasts auction conclusion event to all room participants.
   *
   * @param payload Auction settlement outcome
   */
  broadcastAuctionEnded(payload: {
    auctionId: string;
    winningBidderId?: string | null;
    winningPrice?: number;
  }): void {
    try {
      this.server
        ?.to(`auction:${payload.auctionId}`)
        .emit(WS_AUCTION_EVENTS.SERVER.AUCTION_ENDED, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to broadcast auction ending: ${message}`);
    }
  }
}
