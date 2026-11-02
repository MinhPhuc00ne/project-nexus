import { AuctionStatus, PenaltyType } from '../enums/index.js';

/**
 * Realtime WebSocket event contracts for live bidding rooms (/ws/auctions).
 */
export const WS_AUCTION_EVENTS = {
  CLIENT: {
    JOIN_ROOM: 'auction:join',
    LEAVE_ROOM: 'auction:leave',
    PLACE_BID: 'auction:bid:place',
    SYNC_VIEWPORT: 'auction:3d:sync',
  },
  SERVER: {
    ROOM_JOINED: 'auction:room_joined',
    BID_PLACED: 'auction:bid:placed',
    BID_REJECTED: 'auction:bid:rejected',
    TIMER_SYNC: 'auction:timer:sync',
    TIME_EXTENDED: 'auction:time_extended',
    AUCTION_ENDED: 'auction:ended',
    VIEWPORT_UPDATED: 'auction:3d:updated',
    ERROR: 'auction:error',
  },
} as const;

/**
 * Realtime WebSocket event contracts for direct and support messaging (/ws/chat).
 */
export const WS_CHAT_EVENTS = {
  CLIENT: {
    JOIN_CONVERSATION: 'join_conversation',
    LEAVE_CONVERSATION: 'leave_conversation',
    SEND_MESSAGE: 'send_message',
    TYPING: 'typing',
    MARK_READ: 'mark_read',
  },
  SERVER: {
    NEW_MESSAGE: 'new_message',
    USER_TYPING: 'user_typing',
    MESSAGE_READ: 'message_read',
    CONVERSATION_ASSIGNED: 'conversation_assigned',
    ERROR: 'chat_error',
  },
} as const;

export interface WsJoinRoomDto {
  auctionId: string;
}

export interface WsPlaceBidDto {
  auctionId: string;
  bidAmount: number;
}

export interface WsBidPlacedPayload {
  auctionId: string;
  bidId: string;
  bidderId: string;
  bidderName: string;
  bidAmount: number;
  placedAt: string;
  newMinimumBid: number;
}

export interface WsTimerSyncPayload {
  auctionId: string;
  remainingSeconds: number;
  endTime: string;
  status: AuctionStatus;
  isExtended: boolean;
}

export interface WsTimeExtendedPayload {
  auctionId: string;
  extendedBySeconds: number;
  newEndTime: string;
  reason: 'ANTI_SNIPING';
}

export interface Ws3dSyncPayload {
  auctionId: string;
  rotation: { x: number; y: number; z: number };
  zoom: number;
}

/**
 * Internal domain event payload dispatched upon order placement.
 */
export interface OrderCreatedEventPayload {
  orderId: string;
  buyerId: string;
  sellerId: string;
  totalAmount: number;
  currency: string;
  createdAt: Date;
}

/**
 * Internal domain event payload dispatched upon auction completion.
 */
export interface AuctionEndedEventPayload {
  auctionId: string;
  winnerId: string | null;
  sellerId: string;
  winningBidAmount: number | null;
  productId: string;
  endedAt: Date;
}

/**
 * Internal domain event payload dispatched upon escrow balance reservation.
 */
export interface EscrowLockedEventPayload {
  escrowId: string;
  orderId: string;
  amount: number;
  platformFeeAmount: number;
  sellerDisbursableAmount: number;
}

/**
 * Internal domain event payload dispatched when trust points are deducted.
 */
export interface ReputationPenaltyEventPayload {
  userId: string;
  penaltyType: PenaltyType;
  pointsDeducted: number;
  reason: string;
  referenceId: string;
}
