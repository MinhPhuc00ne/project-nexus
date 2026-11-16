import type { Socket } from 'socket.io-client';
import type {
  WsAuctionStartedPayload,
  WsBidPlacedPayload,
  WsTimeExtendedPayload,
  WsTimerSyncPayload,
} from '@nexus/types';

/**
 * Client-side socket operations available for real-time auction sessions.
 */
export interface AuctionSocketClient {
  socket: Socket;
  joinRoom: (auctionId: string) => void;
  leaveRoom: (auctionId: string) => void;
  syncViewport: (
    auctionId: string,
    rotation: { x: number; y: number; z: number },
    zoom: number,
  ) => void;
  onAuctionStarted: (handler: (payload: WsAuctionStartedPayload) => void) => void;
  onBidPlaced: (handler: (payload: WsBidPlacedPayload) => void) => void;
  onTimeExtended: (handler: (payload: WsTimeExtendedPayload) => void) => void;
  onTimerSync: (handler: (payload: WsTimerSyncPayload) => void) => void;
  disconnect: () => void;
}
