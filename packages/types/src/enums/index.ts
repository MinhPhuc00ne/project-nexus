/**
 * System roles defining principal authorization boundaries across all portals.
 */
export enum Role {
  ADMIN = 'ADMIN',
  SUPPORT_STAFF = 'SUPPORT_STAFF',
  SELLER = 'SELLER',
  BUYER = 'BUYER',
  GUEST = 'GUEST',
}

/**
 * Lifecycle states of an e-commerce order from placement through fulfillment.
 */
export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PREPARING = 'PREPARING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Operational states of an auction room.
 */
export enum AuctionStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  EXTENDED = 'EXTENDED',
  ENDED = 'ENDED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

/**
 * Appraisal review states of an auction consignment item (lot).
 */
export enum AuctionItemStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Resolution tier of a post-auction purchase offer.
 */
export enum AuctionAwardTier {
  PRIMARY_WINNER = 'PRIMARY_WINNER',
  SECOND_CHANCE = 'SECOND_CHANCE',
}

/**
 * Lifecycle states of a post-auction purchase offer.
 */
export enum AuctionAwardStatus {
  AWAITING_ACCEPTANCE = 'AWAITING_ACCEPTANCE',
  AWAITING_DEPOSIT = 'AWAITING_DEPOSIT',
  AWAITING_CHECKOUT = 'AWAITING_CHECKOUT',
  PAID = 'PAID',
  PAYMENT_DEFAULT = 'PAYMENT_DEFAULT',
  BUYER_WITHDRAWN = 'BUYER_WITHDRAWN',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

/**
 * Status of an auction-related complaint submitted to Admin.
 */
export enum AuctionComplaintStatus {
  OPEN = 'OPEN',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

/**
 * Verification state of an individual bid placed in an auction.
 */
export enum BidStatus {
  ACCEPTED = 'ACCEPTED',
  SUPERSEDED = 'SUPERSEDED',
  WINNING = 'WINNING',
  REJECTED = 'REJECTED',
}

/**
 * Financial lifecycle status of held escrow transactions.
 */
export enum EscrowStatus {
  HELD = 'HELD',
  DISBURSED = 'DISBURSED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}

/**
 * Resolution states for buyer-initiated transaction disputes.
 */
export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED_SELLER_FAVOR = 'RESOLVED_SELLER_FAVOR',
  RESOLVED_BUYER_FAVOR = 'RESOLVED_BUYER_FAVOR',
  CANCELLED = 'CANCELLED',
}

/**
 * Officially supported payment providers.
 */
export enum PaymentProvider {
  PAYOS = 'PAYOS',
  WALLET = 'WALLET',
  COD = 'COD',
}

/**
 * Transaction processing outcome status.
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Integrated logistics carriers.
 */
export enum CarrierName {
  GHN = 'GHN',
}

/**
 * Physical shipment states reported by the logistics provider.
 */
export enum ShipmentStatus {
  CREATED = 'CREATED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
}

/**
 * Reputation tier corresponding to user trust score bands.
 */
export enum ReputationTrustLevel {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  STANDARD = 'STANDARD',
  PROBATION = 'PROBATION',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Infraction categories resulting in automated reputation penalties.
 */
export enum PenaltyType {
  PAYMENT_TIMEOUT = 'PAYMENT_TIMEOUT',
  ORDER_CANCELLATION = 'ORDER_CANCELLATION',
  AUCTION_DEFAULT = 'AUCTION_DEFAULT',
  MISREPRESENTATION = 'MISREPRESENTATION',
  FRAUD = 'FRAUD',
}

/**
 * Delivery channels supported by the notification dispatcher.
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

/**
 * Types of transactions recorded in the platform wallet ledger.
 */
export enum WalletTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  ESCROW_LOCK = 'ESCROW_LOCK',
  ESCROW_PAYOUT = 'ESCROW_PAYOUT',
  ESCROW_REFUND = 'ESCROW_REFUND',
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  PLATFORM_FEE = 'PLATFORM_FEE',
  AUCTION_BID_LOCK = 'AUCTION_BID_LOCK',
  AUCTION_BID_REFUND = 'AUCTION_BID_REFUND',
  AUCTION_DEPOSIT_FORFEIT = 'AUCTION_DEPOSIT_FORFEIT',
  AUCTION_DEPOSIT_COMPENSATION = 'AUCTION_DEPOSIT_COMPENSATION',
}

/**
 * Processing state for wallet ledger transactions.
 */
export enum WalletTransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

/**
 * Domain categorization for dispatching targeted notifications.
 */
export enum NotificationType {
  ORDER = 'ORDER',
  AUCTION = 'AUCTION',
  SYSTEM = 'SYSTEM',
  PAYMENT = 'PAYMENT',
  DISPUTE = 'DISPUTE',
}
