import { HttpException, Logger } from '@nestjs/common';
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
  Ws3dSyncPayloadSchema,
  WsAuctionStartedPayload,
  WsBidPlacedPayload,
  WsBidRejectedPayload,
  WsJoinRoomSchema,
  WsLeaveRoomSchema,
  WsLotEndedPayload,
  WsPlaceBidSchema,
  WsTimeExtendedPayload,
  WsTimerSyncPayload,
} from '@nexus/contracts';
import { createCorsOriginCallback } from '../../../core/config/env.schema';
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { SocketMetricsService } from '../../../core/realtime/socket-metrics.service';
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
    origin: createCorsOriginCallback(),
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

  constructor(
    private readonly tokenAuth: TokenAuthService,
    private readonly socketMetrics: SocketMetricsService,
  ) {}

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
    this.socketMetrics.registerServer('/ws/auctions', this.server);
    this.logger.log('Auction WebSocket Gateway initialized on namespace /ws/auctions');
  }

  /**
   * Handles client connection attempt and authenticates optional user session.
   *
   * @param client Connecting socket instance
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      // Watching an auction is open to guests, so an absent or unusable token
      // leaves the socket connected but anonymous. A token that does resolve is
      // held to the same account checks as an HTTP request.
      const user = await this.tokenAuth.authenticateOptional(rawToken);
      if (user) {
        client.data.user = user;
        await client.join(`user:${user.id}`);
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
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: unknown): void {
    const parsed = WsJoinRoomSchema.safeParse(data);
    if (!parsed.success) {
      client.emit(WS_AUCTION_EVENTS.SERVER.ERROR, { message: 'Invalid auction room payload.' });
      return;
    }
    const room = `auction:${parsed.data.auctionId}`;
    void client.join(room);
    client.emit(WS_AUCTION_EVENTS.SERVER.ROOM_JOINED, {
      auctionId: parsed.data.auctionId,
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
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: unknown): void {
    const parsed = WsLeaveRoomSchema.safeParse(data);
    if (!parsed.success) {
      client.emit(WS_AUCTION_EVENTS.SERVER.ERROR, { message: 'Invalid auction room payload.' });
      return;
    }
    void client.leave(`auction:${parsed.data.auctionId}`);
  }

  /**
   * Handles real-time bid submissions over WebSocket, delegating validation and escrow locks
   * to the registered AuctionService handler and returning rejection feedback directly to caller.
   */
  @SubscribeMessage(WS_AUCTION_EVENTS.CLIENT.PLACE_BID)
  async handlePlaceBid(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): Promise<{ ok: boolean; data?: unknown; error?: string }> {
    const raw =
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined;
    const rawAuctionId = typeof raw?.auctionId === 'string' ? raw.auctionId : '';
    const rawAuctionItemId = typeof raw?.auctionItemId === 'string' ? raw.auctionItemId : undefined;

    const user = (client.data as { user?: AuthenticatedUserPayload }).user;
    if (!user?.id) {
      const rejection: WsBidRejectedPayload = {
        auctionId: rawAuctionId,
        auctionItemId: rawAuctionItemId,
        message: 'Authentication is required to place a bid.',
      };
      client.emit(WS_AUCTION_EVENTS.SERVER.BID_REJECTED, rejection);
      return { ok: false, error: rejection.message };
    }

    if (!this.placeBidHandler) {
      const rejection: WsBidRejectedPayload = {
        auctionId: rawAuctionId,
        auctionItemId: rawAuctionItemId,
        message: 'Live bidding is initializing; please try again.',
      };
      client.emit(WS_AUCTION_EVENTS.SERVER.BID_REJECTED, rejection);
      return { ok: false, error: rejection.message };
    }

    const parsed = WsPlaceBidSchema.safeParse(data);
    if (!parsed.success) {
      const rejection: WsBidRejectedPayload = {
        auctionId: rawAuctionId,
        auctionItemId: rawAuctionItemId,
        message: 'Invalid auction room or bid amount.',
      };
      client.emit(WS_AUCTION_EVENTS.SERVER.BID_REJECTED, rejection);
      return { ok: false, error: rejection.message };
    }

    try {
      const result = await this.placeBidHandler(
        parsed.data.auctionId,
        parsed.data.auctionItemId,
        user.id,
        parsed.data.bidAmount,
      );
      return { ok: true, data: result };
    } catch (err: unknown) {
      const message = this.formatGatewayError(err, 'Failed to place bid.');
      const rejection: WsBidRejectedPayload = {
        auctionId: parsed.data.auctionId,
        auctionItemId: parsed.data.auctionItemId,
        message,
      };
      client.emit(WS_AUCTION_EVENTS.SERVER.BID_REJECTED, rejection);
      return { ok: false, error: message };
    }
  }

  private formatGatewayError(err: unknown, fallback: string): string {
    if (err instanceof HttpException) {
      const response = err.getResponse();
      const rawMessage =
        typeof response === 'string'
          ? response
          : typeof response === 'object' && response !== null && 'message' in response
            ? (response as { message?: unknown }).message
            : undefined;
      const text = Array.isArray(rawMessage)
        ? rawMessage.find((item): item is string => typeof item === 'string')
        : typeof rawMessage === 'string'
          ? rawMessage
          : undefined;
      const trimmed = text?.trim();
      if (trimmed && /^[\x20-\x7E]+$/.test(trimmed)) {
        return trimmed;
      }
    }
    return fallback;
  }

  /**
   * Synchronizes viewport manipulation for interactive 3D inspection models (Admin only).
   *
   * @param client Originating socket connection
   * @param data 3D camera rotation and zoom coordinates
   */
  @SubscribeMessage(WS_AUCTION_EVENTS.CLIENT.SYNC_VIEWPORT)
  handleSyncViewport(@ConnectedSocket() client: Socket, @MessageBody() data: unknown): void {
    const user = (client.data as { user?: AuthenticatedUserPayload }).user;
    if (user?.role !== Role.ADMIN) {
      client.emit(WS_AUCTION_EVENTS.SERVER.ERROR, {
        message: 'Only administrators may synchronize the 3D viewport.',
      });
      return;
    }
    const parsed = Ws3dSyncPayloadSchema.safeParse(data);
    if (!parsed.success) {
      client.emit(WS_AUCTION_EVENTS.SERVER.ERROR, {
        message: 'Invalid 3D viewport synchronization payload.',
      });
      return;
    }
    client
      .to(`auction:${parsed.data.auctionId}`)
      .emit(WS_AUCTION_EVENTS.SERVER.VIEWPORT_UPDATED, parsed.data);
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
