import { z } from 'zod';

/**
 * System roles defining principal authorization boundaries across all portals.
 */
export const RoleSchema = z.enum(['ADMIN', 'SUPPORT_STAFF', 'SELLER', 'BUYER', 'GUEST']);
export type Role = z.infer<typeof RoleSchema>;
export const Role = RoleSchema.enum;

/**
 * Lifecycle states of an e-commerce order from placement through fulfillment.
 */
export const OrderStatusSchema = z.enum([
  'PENDING_PAYMENT',
  'PAID',
  'PREPARING',
  'SHIPPING',
  'DELIVERED',
  'CONFIRMED',
  'CANCELLED',
  'REFUNDED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export const OrderStatus = OrderStatusSchema.enum;

/**
 * Operational states of an auction room.
 */
export const AuctionStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'EXTENDED',
  'ENDED',
  'SETTLED',
  'CANCELLED',
  'FAILED',
]);
export type AuctionStatus = z.infer<typeof AuctionStatusSchema>;
export const AuctionStatus = AuctionStatusSchema.enum;

/**
 * Appraisal review states of an auction consignment item (lot).
 */
export const AuctionItemStatusSchema = z.enum(['PENDING_REVIEW', 'APPROVED', 'REJECTED']);
export type AuctionItemStatus = z.infer<typeof AuctionItemStatusSchema>;
export const AuctionItemStatus = AuctionItemStatusSchema.enum;

/**
 * Resolution tier of a post-auction purchase offer.
 */
export const AuctionAwardTierSchema = z.enum(['PRIMARY_WINNER', 'SECOND_CHANCE']);
export type AuctionAwardTier = z.infer<typeof AuctionAwardTierSchema>;
export const AuctionAwardTier = AuctionAwardTierSchema.enum;

/**
 * Lifecycle states of a post-auction purchase offer.
 */
export const AuctionAwardStatusSchema = z.enum([
  'AWAITING_ACCEPTANCE',
  'AWAITING_DEPOSIT',
  'AWAITING_CHECKOUT',
  'PAID',
  'PAYMENT_DEFAULT',
  'BUYER_WITHDRAWN',
  'DECLINED',
  'EXPIRED',
]);
export type AuctionAwardStatus = z.infer<typeof AuctionAwardStatusSchema>;
export const AuctionAwardStatus = AuctionAwardStatusSchema.enum;

/**
 * Status of an auction-related complaint submitted to Admin.
 */
export const AuctionComplaintStatusSchema = z.enum(['OPEN', 'ACCEPTED', 'REJECTED']);
export type AuctionComplaintStatus = z.infer<typeof AuctionComplaintStatusSchema>;
export const AuctionComplaintStatus = AuctionComplaintStatusSchema.enum;

/**
 * Verification state of an individual bid placed in an auction.
 */
export const BidStatusSchema = z.enum(['ACCEPTED', 'SUPERSEDED', 'WINNING', 'REJECTED']);
export type BidStatus = z.infer<typeof BidStatusSchema>;
export const BidStatus = BidStatusSchema.enum;

/**
 * Financial lifecycle status of held escrow transactions.
 */
export const EscrowStatusSchema = z.enum(['HELD', 'DISBURSED', 'REFUNDED', 'DISPUTED']);
export type EscrowStatus = z.infer<typeof EscrowStatusSchema>;
export const EscrowStatus = EscrowStatusSchema.enum;

/**
 * Resolution states for buyer-initiated transaction disputes.
 */
export const DisputeStatusSchema = z.enum([
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_SELLER_FAVOR',
  'RESOLVED_BUYER_FAVOR',
  'CANCELLED',
]);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;
export const DisputeStatus = DisputeStatusSchema.enum;

/**
 * Officially supported payment providers.
 */
export const PaymentProviderSchema = z.enum(['PAYOS', 'WALLET', 'COD']);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;
export const PaymentProvider = PaymentProviderSchema.enum;

/**
 * Transaction processing outcome status.
 */
export const PaymentStatusSchema = z.enum(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export const PaymentStatus = PaymentStatusSchema.enum;

/**
 * Integrated logistics carriers.
 */
export const CarrierNameSchema = z.enum(['GHN']);
export type CarrierName = z.infer<typeof CarrierNameSchema>;
export const CarrierName = CarrierNameSchema.enum;

/**
 * Physical shipment states reported by the logistics provider.
 */
export const ShipmentStatusSchema = z.enum([
  'CREATED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
  'RETURNED',
]);
export type ShipmentStatus = z.infer<typeof ShipmentStatusSchema>;
export const ShipmentStatus = ShipmentStatusSchema.enum;

/**
 * Reputation tier corresponding to user trust score bands.
 */
export const ReputationTrustLevelSchema = z.enum([
  'EXCELLENT',
  'GOOD',
  'STANDARD',
  'PROBATION',
  'SUSPENDED',
]);
export type ReputationTrustLevel = z.infer<typeof ReputationTrustLevelSchema>;
export const ReputationTrustLevel = ReputationTrustLevelSchema.enum;

/**
 * Infraction categories resulting in automated reputation penalties.
 */
export const PenaltyTypeSchema = z.enum([
  'PAYMENT_TIMEOUT',
  'ORDER_CANCELLATION',
  'AUCTION_DEFAULT',
  'MISREPRESENTATION',
  'FRAUD',
]);
export type PenaltyType = z.infer<typeof PenaltyTypeSchema>;
export const PenaltyType = PenaltyTypeSchema.enum;

/**
 * Delivery channels supported by the notification dispatcher.
 */
export const NotificationChannelSchema = z.enum(['EMAIL', 'PUSH', 'IN_APP']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export const NotificationChannel = NotificationChannelSchema.enum;

/**
 * Types of transactions recorded in the platform wallet ledger.
 */
export const WalletTransactionTypeSchema = z.enum([
  'DEPOSIT',
  'WITHDRAW',
  'ESCROW_LOCK',
  'ESCROW_PAYOUT',
  'ESCROW_REFUND',
  'ORDER_PAYMENT',
  'PLATFORM_FEE',
  'AUCTION_BID_LOCK',
  'AUCTION_BID_REFUND',
  'AUCTION_DEPOSIT_FORFEIT',
  'AUCTION_DEPOSIT_COMPENSATION',
]);
export type WalletTransactionType = z.infer<typeof WalletTransactionTypeSchema>;
export const WalletTransactionType = WalletTransactionTypeSchema.enum;

/**
 * Processing state for wallet ledger transactions.
 */
export const WalletTransactionStatusSchema = z.enum(['PENDING', 'SUCCESS', 'FAILED']);
export type WalletTransactionStatus = z.infer<typeof WalletTransactionStatusSchema>;
export const WalletTransactionStatus = WalletTransactionStatusSchema.enum;

/**
 * Domain categorization for dispatching targeted notifications.
 */
export const NotificationTypeSchema = z.enum(['ORDER', 'AUCTION', 'SYSTEM', 'PAYMENT', 'DISPUTE']);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export const NotificationType = NotificationTypeSchema.enum;
