import { z } from 'zod';
import { AuctionStatusSchema, PenaltyTypeSchema } from '../enums/index.js';

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

export const WsJoinRoomSchema = z.object({
  auctionId: z.string().trim().min(1),
});
export type WsJoinRoomDto = z.infer<typeof WsJoinRoomSchema>;

export const WsLeaveRoomSchema = z.object({
  auctionId: z.string().trim().min(1),
});
export type WsLeaveRoomDto = z.infer<typeof WsLeaveRoomSchema>;

export const WsPlaceBidSchema = z.object({
  auctionId: z.string().trim().min(1),
  auctionItemId: z.string().trim().min(1).optional(),
  bidAmount: z.number().positive(),
});
export type WsPlaceBidDto = z.infer<typeof WsPlaceBidSchema>;

export const WsJoinConversationSchema = z.object({
  conversationId: z.string().trim().min(1),
});
export type WsJoinConversationDto = z.infer<typeof WsJoinConversationSchema>;

export const WsLeaveConversationSchema = z.object({
  conversationId: z.string().trim().min(1),
});
export type WsLeaveConversationDto = z.infer<typeof WsLeaveConversationSchema>;

export const WsChatSendMessageSchema = z
  .object({
    conversationId: z.string().trim().min(1),
    content: z.preprocess(
      (value) => (value === null ? undefined : value),
      z.string().max(4000).optional(),
    ),
    body: z.preprocess(
      (value) => (value === null ? undefined : value),
      z.string().max(4000).optional(),
    ),
    attachments: z.preprocess(
      (value) => (value === null ? undefined : value),
      z.array(z.string().trim().min(1)).max(10).optional(),
    ),
  })
  .refine(
    (data) =>
      Boolean(data.content?.trim()) ||
      Boolean(data.body?.trim()) ||
      (data.attachments?.length ?? 0) > 0,
    { message: 'Message content or attachments must not be empty' },
  );
export type WsChatSendMessageDto = z.infer<typeof WsChatSendMessageSchema>;

export const WsChatTypingSchema = z.object({
  conversationId: z.string().trim().min(1),
  isTyping: z.boolean(),
});
export type WsChatTypingDto = z.infer<typeof WsChatTypingSchema>;

export const WsMarkReadSchema = z.object({
  conversationId: z.string().trim().min(1),
});
export type WsMarkReadDto = z.infer<typeof WsMarkReadSchema>;

export const WsBidPlacedPayloadSchema = z.object({
  auctionId: z.string(),
  auctionItemId: z.string(),
  lotNumber: z.number().int().nullable().optional(),
  bidId: z.string(),
  bidderId: z.string(),
  bidderName: z.string(),
  bidAmount: z.number(),
  placedAt: z.string(),
  newMinimumBid: z.number(),
  totalBidsCount: z.number().int().nonnegative().optional(),
});
export type WsBidPlacedPayload = z.infer<typeof WsBidPlacedPayloadSchema>;

export const WsBidRejectedPayloadSchema = z.object({
  auctionId: z.string(),
  auctionItemId: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});
export type WsBidRejectedPayload = z.infer<typeof WsBidRejectedPayloadSchema>;

export const WsLotTimerSyncItemSchema = z.object({
  auctionItemId: z.string(),
  remainingSeconds: z.number().nonnegative(),
  endTime: z.string(),
  status: AuctionStatusSchema,
  isExtended: z.boolean(),
});
export type WsLotTimerSyncItem = z.infer<typeof WsLotTimerSyncItemSchema>;

export const WsTimerSyncPayloadSchema = z.object({
  auctionId: z.string(),
  auctionItemId: z.string().optional(),
  remainingSeconds: z.number().nonnegative(),
  endTime: z.string(),
  status: AuctionStatusSchema,
  isExtended: z.boolean(),
  lotTimers: z.array(WsLotTimerSyncItemSchema).optional(),
});
export type WsTimerSyncPayload = z.infer<typeof WsTimerSyncPayloadSchema>;

export const WsTimeExtendedPayloadSchema = z.object({
  auctionId: z.string(),
  auctionItemId: z.string(),
  extendedBySeconds: z.number().positive(),
  newEndTime: z.string(),
  reason: z.literal('ANTI_SNIPING'),
});
export type WsTimeExtendedPayload = z.infer<typeof WsTimeExtendedPayloadSchema>;

export const WsLotEndedPayloadSchema = z.object({
  auctionId: z.string(),
  auctionItemId: z.string(),
  lotNumber: z.number().int().nullable().optional(),
  status: AuctionStatusSchema,
  winningBidderId: z.string().nullable().optional(),
  winningPrice: z.number().optional(),
});
export type WsLotEndedPayload = z.infer<typeof WsLotEndedPayloadSchema>;

export const WsAuctionIntroSellerPayloadSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  shopAvatarUrl: z.string().nullable().optional(),
});
export type WsAuctionIntroSellerPayload = z.infer<typeof WsAuctionIntroSellerPayloadSchema>;

export const WsAuctionIntroItemPayloadSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  images: z.array(z.string()),
  threeModelKey: z.string().nullable().optional(),
  lotNumber: z.number().int().nullable().optional(),
  startingPrice: z.number(),
  proposedStartingPrice: z.number(),
  reservePrice: z.number().nullable().optional(),
  proposedReservePrice: z.number().nullable().optional(),
  bidIncrement: z.number(),
  proposedBidIncrement: z.number(),
  appraisalCertificateNumber: z.string().nullable().optional(),
  appraisalAgency: z.string().nullable().optional(),
  certificateImages: z.array(z.string()),
  certificateIssueDate: z.string().nullable().optional(),
  lotStatus: AuctionStatusSchema.optional(),
  currentHighestBid: z.number().optional(),
  currentHighestBidderId: z.string().nullable().optional(),
  totalBidsCount: z.number().int().nonnegative().optional(),
  endTime: z.string().nullable().optional(),
  isExtended: z.boolean().optional(),
  weightGrams: z.number().optional(),
  lengthCm: z.number().optional(),
  widthCm: z.number().optional(),
  heightCm: z.number().optional(),
  seller: WsAuctionIntroSellerPayloadSchema.optional(),
});
export type WsAuctionIntroItemPayload = z.infer<typeof WsAuctionIntroItemPayloadSchema>;

export const WsAuctionStartedPayloadSchema = z.object({
  auctionId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  startedAt: z.string(),
  endTime: z.string(),
  serverTime: z.string(),
  introDurationMs: z.number().nonnegative(),
  items: z.array(WsAuctionIntroItemPayloadSchema),
});
export type WsAuctionStartedPayload = z.infer<typeof WsAuctionStartedPayloadSchema>;

export const Ws3dSyncPayloadSchema = z.object({
  auctionId: z.string().trim().min(1),
  rotation: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  zoom: z.number().positive(),
});
export type Ws3dSyncPayload = z.infer<typeof Ws3dSyncPayloadSchema>;

export const WsNotificationNewPayloadSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  type: z.string(),
  channel: z.string(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  auctionId: z.string().nullable(),
  targetUrl: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  unreadCount: z.number().int().nonnegative().optional(),
});
export type WsNotificationNewPayload = z.infer<typeof WsNotificationNewPayloadSchema>;

export const WsNotificationConnectedPayloadSchema = z.object({
  userId: z.string(),
  role: z.string(),
  unreadCount: z.number().int().nonnegative(),
  timestamp: z.string(),
});
export type WsNotificationConnectedPayload = z.infer<typeof WsNotificationConnectedPayloadSchema>;

export const WsNotificationUnreadCountPayloadSchema = z.object({
  userId: z.string(),
  unreadCount: z.number().int().nonnegative(),
});
export type WsNotificationUnreadCountPayload = z.infer<
  typeof WsNotificationUnreadCountPayloadSchema
>;

/**
 * Internal domain event payload dispatched upon order placement.
 */
export const OrderCreatedEventPayloadSchema = z.object({
  orderId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  totalAmount: z.number(),
  currency: z.string(),
  createdAt: z.date(),
});
export type OrderCreatedEventPayload = z.infer<typeof OrderCreatedEventPayloadSchema>;

/**
 * Internal domain event payload dispatched upon auction completion.
 */
export const AuctionEndedEventPayloadSchema = z.object({
  auctionId: z.string(),
  winnerId: z.string().nullable(),
  sellerId: z.string(),
  winningBidAmount: z.number().nullable(),
  productId: z.string(),
  endedAt: z.date(),
});
export type AuctionEndedEventPayload = z.infer<typeof AuctionEndedEventPayloadSchema>;

/**
 * Internal domain event payload dispatched upon escrow balance reservation.
 */
export const EscrowLockedEventPayloadSchema = z.object({
  escrowId: z.string(),
  orderId: z.string(),
  amount: z.number(),
  platformFeeAmount: z.number(),
  sellerDisbursableAmount: z.number(),
});
export type EscrowLockedEventPayload = z.infer<typeof EscrowLockedEventPayloadSchema>;

/**
 * Internal domain event payload dispatched when trust points are deducted.
 */
export const ReputationPenaltyEventPayloadSchema = z.object({
  userId: z.string(),
  penaltyType: PenaltyTypeSchema,
  pointsDeducted: z.number(),
  reason: z.string(),
  referenceId: z.string(),
});
export type ReputationPenaltyEventPayload = z.infer<typeof ReputationPenaltyEventPayloadSchema>;
