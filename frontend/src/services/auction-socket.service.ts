import { io, type Socket } from 'socket.io-client';
import { WS_AUCTION_EVENTS } from '@nexus/types';
import { API_BASE_URL } from './api';
import { getStoredToken } from './auth';
import type { AuctionSocketClient } from '../types/auction-socket.types';

/**
 * Establishes a WebSocket connection to the auction namespace for real-time auction events.
 *
 * @param auctionId - Optional auction room to join immediately after connecting.
 * @returns Socket client with room, viewport, and auction event helpers.
 */
export function createAuctionSocket(auctionId?: string): AuctionSocketClient {
  const backendUrl = new URL(API_BASE_URL, window.location.origin);
  const socket: Socket = io(`${backendUrl.origin}/ws/auctions`, {
    autoConnect: true,
    auth: { token: getStoredToken() },
  });

  if (auctionId) socket.emit(WS_AUCTION_EVENTS.CLIENT.JOIN_ROOM, { auctionId });

  return {
    socket,
    joinRoom: (id) => socket.emit(WS_AUCTION_EVENTS.CLIENT.JOIN_ROOM, { auctionId: id }),
    leaveRoom: (id) => socket.emit(WS_AUCTION_EVENTS.CLIENT.LEAVE_ROOM, { auctionId: id }),
    syncViewport: (id, rotation, zoom) =>
      socket.emit(WS_AUCTION_EVENTS.CLIENT.SYNC_VIEWPORT, { auctionId: id, rotation, zoom }),
    onAuctionStarted: (handler) => socket.on(WS_AUCTION_EVENTS.SERVER.AUCTION_STARTED, handler),
    onBidPlaced: (handler) => socket.on(WS_AUCTION_EVENTS.SERVER.BID_PLACED, handler),
    onTimeExtended: (handler) => socket.on(WS_AUCTION_EVENTS.SERVER.TIME_EXTENDED, handler),
    onTimerSync: (handler) => socket.on(WS_AUCTION_EVENTS.SERVER.TIMER_SYNC, handler),
    disconnect: () => {
      if (auctionId) socket.emit(WS_AUCTION_EVENTS.CLIENT.LEAVE_ROOM, { auctionId });
      socket.disconnect();
    },
  };
}
