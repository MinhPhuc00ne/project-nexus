export * from './user.types';
export * from './cart.types';
export * from './product.types';
export * from './auction.types';
export * from './category.types';

export interface NotificationItem {
  id: string | number;
  title: string;
  desc?: string;
  time?: string;
  unread?: boolean;
}

// Re-export common monorepo types for convenient single-path imports in frontend
export {
  Role,
  OrderStatus,
  AuctionStatus,
  EscrowStatus,
  DisputeStatus,
  PaymentProvider,
  PaymentStatus,
  CarrierName,
  ShipmentStatus,
  ReputationTrustLevel,
  type ApiResponse,
  type PaginatedResponse,
  type UserSummaryDto,
  type ProductSummaryDto,
  type AuctionSummaryDto,
  type OrderSummaryDto,
  type EscrowSummaryDto,
  type DisputeSummaryDto,
} from '@nexus/types';
