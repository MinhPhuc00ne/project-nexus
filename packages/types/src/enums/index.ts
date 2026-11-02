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
 * Domain categorization for dispatching targeted notifications.
 */
export enum NotificationType {
  ORDER = 'ORDER',
  AUCTION = 'AUCTION',
  SYSTEM = 'SYSTEM',
  PAYMENT = 'PAYMENT',
  DISPUTE = 'DISPUTE',
}
