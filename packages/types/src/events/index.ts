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
    AUCTION_STARTED: 'auction:started',
    BID_PLACED: 'auction:bid:placed',
    BID_REJECTED: 'auction:bid:rejected',
    TIMER_SYNC: 'auction:timer:sync',
    TIME_EXTENDED: 'auction:time_extended',
    LOT_ENDED: 'auction:lot:ended',
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
  auctionItemId?: string;
  bidAmount: number;
}

export interface WsBidPlacedPayload {
  auctionId: string;
  auctionItemId: string;
  lotNumber?: number | null;
  bidId: string;
  bidderId: string;
  bidderName: string;
  bidAmount: number;
  placedAt: string;
  newMinimumBid: number;
  totalBidsCount?: number;
}

export interface WsBidRejectedPayload {
  auctionId: string;
  auctionItemId?: string;
  message: string;
  code?: string;
}

export interface WsLotTimerSyncItem {
  auctionItemId: string;
  remainingSeconds: number;
  endTime: string;
  status: AuctionStatus;
  isExtended: boolean;
}

export interface WsTimerSyncPayload {
  auctionId: string;
  auctionItemId?: string;
  remainingSeconds: number;
  endTime: string;
  status: AuctionStatus;
  isExtended: boolean;
  lotTimers?: WsLotTimerSyncItem[];
}

export interface WsTimeExtendedPayload {
  auctionId: string;
  auctionItemId: string;
  extendedBySeconds: number;
  newEndTime: string;
  reason: 'ANTI_SNIPING';
}

export interface WsLotEndedPayload {
  auctionId: string;
  auctionItemId: string;
  lotNumber?: number | null;
  status: AuctionStatus;
  winningBidderId?: string | null;
  winningPrice?: number;
}

export interface WsAuctionIntroSellerPayload {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  shopAvatarUrl?: string | null;
}

export interface WsAuctionIntroItemPayload {
  id: string;
  title: string;
  description: string;
  images: string[];
  threeModelKey?: string | null;
  lotNumber?: number | null;
  startingPrice: number;
  proposedStartingPrice: number;
  reservePrice?: number | null;
  proposedReservePrice?: number | null;
  bidIncrement: number;
  proposedBidIncrement: number;
  appraisalCertificateNumber?: string | null;
  appraisalAgency?: string | null;
  certificateImages: string[];
  certificateIssueDate?: string | null;
  lotStatus?: AuctionStatus;
  currentHighestBid?: number;
  currentHighestBidderId?: string | null;
  totalBidsCount?: number;
  endTime?: string | null;
  isExtended?: boolean;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  seller?: WsAuctionIntroSellerPayload;
}

export interface WsAuctionStartedPayload {
  auctionId: string;
  title: string;
  description?: string | null;
  startedAt: string;
  endTime: string;
  serverTime: string;
  introDurationMs: number;
  items: WsAuctionIntroItemPayload[];
}

export interface Ws3dSyncPayload {
  auctionId: string;
  rotation: { x: number; y: number; z: number };
  zoom: number;
}

/**
 * Realtime WebSocket event contracts for account notifications (/ws/notifications).
 */
export const WS_NOTIFICATION_EVENTS = {
  CLIENT: {
    PING: 'notification:ping',
  },
  SERVER: {
    CONNECTED: 'notification:connected',
    NEW: 'notification:new',
    UNREAD_COUNT: 'notification:unread_count',
    ERROR: 'notification:error',
  },
} as const;

export interface WsNotificationNewPayload {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  channel: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  auctionId: string | null;
  targetUrl: string | null;
  metadata?: Record<string, unknown> | null;
  unreadCount?: number;
}

export interface WsNotificationConnectedPayload {
  userId: string;
  role: string;
  unreadCount: number;
  timestamp: string;
}

export interface WsNotificationUnreadCountPayload {
  userId: string;
  unreadCount: number;
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
