Object.defineProperty(exports, '__esModule', { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime,
  createParam,
} = require('./runtime/library.js');

const Prisma = {};

exports.Prisma = Prisma;
exports.$Enums = {};

/**
 * Prisma Client JS version: 6.4.0
 * Query Engine version: a9055b89e58b4b5bfb59600785423b1db3d0e75d
 */
Prisma.prismaVersion = {
  client: '6.4.0',
  engine: 'a9055b89e58b4b5bfb59600785423b1db3d0e75d',
};

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError;
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError;
Prisma.PrismaClientInitializationError = PrismaClientInitializationError;
Prisma.PrismaClientValidationError = PrismaClientValidationError;
Prisma.Decimal = Decimal;

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag;
Prisma.empty = empty;
Prisma.join = join;
Prisma.raw = raw;
Prisma.validator = Public.validator;

/**
 * Extensions
 */
Prisma.getExtensionContext = Extensions.getExtensionContext;
Prisma.defineExtension = Extensions.defineExtension;

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull;
Prisma.JsonNull = objectEnumValues.instances.JsonNull;
Prisma.AnyNull = objectEnumValues.instances.AnyNull;

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull,
};

const path = require('path');

/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable',
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  fullName: 'fullName',
  phoneNumber: 'phoneNumber',
  avatarUrl: 'avatarUrl',
  role: 'role',
  isSellerActive: 'isSellerActive',
  reputationScore: 'reputationScore',
  trustLevel: 'trustLevel',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.UserAddressScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  recipientName: 'recipientName',
  phone: 'phone',
  street: 'street',
  ward: 'ward',
  district: 'district',
  city: 'city',
  country: 'country',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  isRevoked: 'isRevoked',
  createdAt: 'createdAt',
};

exports.Prisma.WalletScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  balance: 'balance',
  lockedBalance: 'lockedBalance',
  currency: 'currency',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  amount: 'amount',
  type: 'type',
  status: 'status',
  referenceId: 'referenceId',
  description: 'description',
  createdAt: 'createdAt',
};

exports.Prisma.ReputationLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  deltaPoints: 'deltaPoints',
  balanceAfter: 'balanceAfter',
  reason: 'reason',
  penaltyType: 'penaltyType',
  referenceId: 'referenceId',
  createdAt: 'createdAt',
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  parentId: 'parentId',
  level: 'level',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  sellerId: 'sellerId',
  categoryId: 'categoryId',
  title: 'title',
  description: 'description',
  basePrice: 'basePrice',
  weightGrams: 'weightGrams',
  lengthCm: 'lengthCm',
  widthCm: 'widthCm',
  heightCm: 'heightCm',
  threeModelKey: 'threeModelKey',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.ProductImageScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  imageUrl: 'imageUrl',
  isThumbnail: 'isThumbnail',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
};

exports.Prisma.WarehouseScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  address: 'address',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.InventoryScalarFieldEnum = {
  id: 'id',
  warehouseId: 'warehouseId',
  productId: 'productId',
  totalQty: 'totalQty',
  availableQty: 'availableQty',
  reservedQty: 'reservedQty',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.InventoryReservationScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  quantity: 'quantity',
  referenceId: 'referenceId',
  status: 'status',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.InventoryLedgerScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  changeQty: 'changeQty',
  balanceAfter: 'balanceAfter',
  reason: 'reason',
  referenceId: 'referenceId',
  createdAt: 'createdAt',
};

exports.Prisma.CartScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.CartItemScalarFieldEnum = {
  id: 'id',
  cartId: 'cartId',
  productId: 'productId',
  quantity: 'quantity',
  priceAtAdded: 'priceAtAdded',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  buyerId: 'buyerId',
  sellerId: 'sellerId',
  subtotal: 'subtotal',
  shippingFee: 'shippingFee',
  totalAmount: 'totalAmount',
  status: 'status',
  shippingAddressSnapshot: 'shippingAddressSnapshot',
  idempotencyKey: 'idempotencyKey',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalPrice: 'totalPrice',
  createdAt: 'createdAt',
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  provider: 'provider',
  amount: 'amount',
  status: 'status',
  transactionCode: 'transactionCode',
  idempotencyKey: 'idempotencyKey',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.AuctionScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  sellerId: 'sellerId',
  title: 'title',
  startingPrice: 'startingPrice',
  reservePrice: 'reservePrice',
  currentHighestBid: 'currentHighestBid',
  currentHighestBidderId: 'currentHighestBidderId',
  bidIncrement: 'bidIncrement',
  status: 'status',
  startTime: 'startTime',
  endTime: 'endTime',
  originalEndTime: 'originalEndTime',
  isExtended: 'isExtended',
  totalBidsCount: 'totalBidsCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.BidScalarFieldEnum = {
  id: 'id',
  auctionId: 'auctionId',
  bidderId: 'bidderId',
  bidAmount: 'bidAmount',
  status: 'status',
  placedAt: 'placedAt',
};

exports.Prisma.EscrowRecordScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  totalAmount: 'totalAmount',
  platformFee: 'platformFee',
  sellerPayout: 'sellerPayout',
  status: 'status',
  heldAt: 'heldAt',
  disbursedAt: 'disbursedAt',
  refundedAt: 'refundedAt',
};

exports.Prisma.ShipmentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  carrier: 'carrier',
  trackingNumber: 'trackingNumber',
  shippingFee: 'shippingFee',
  chargeableWeight: 'chargeableWeight',
  isInternational: 'isInternational',
  customsFee: 'customsFee',
  status: 'status',
  waybillCode: 'waybillCode',
  metadata: 'metadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.DisputeScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  openedByUserId: 'openedByUserId',
  reason: 'reason',
  evidenceUrls: 'evidenceUrls',
  status: 'status',
  resolutionNotes: 'resolutionNotes',
  resolvedByUserId: 'resolvedByUserId',
  resolvedAt: 'resolvedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  reviewerId: 'reviewerId',
  targetUserId: 'targetUserId',
  rating: 'rating',
  comment: 'comment',
  isShopReview: 'isShopReview',
  createdAt: 'createdAt',
};

exports.Prisma.EventLogScalarFieldEnum = {
  id: 'id',
  eventName: 'eventName',
  payload: 'payload',
  operatorId: 'operatorId',
  traceId: 'traceId',
  createdAt: 'createdAt',
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  content: 'content',
  type: 'type',
  channel: 'channel',
  isRead: 'isRead',
  readAt: 'readAt',
  createdAt: 'createdAt',
};

exports.Prisma.NotificationPreferenceScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  channel: 'channel',
  isEnabled: 'isEnabled',
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc',
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull,
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive',
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last',
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull,
};
exports.Role = exports.$Enums.Role = {
  ADMIN: 'ADMIN',
  SUPPORT_STAFF: 'SUPPORT_STAFF',
  SELLER: 'SELLER',
  BUYER: 'BUYER',
  GUEST: 'GUEST',
};

exports.OrderStatus = exports.$Enums.OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  PREPARING: 'PREPARING',
  SHIPPING: 'SHIPPING',
  DELIVERED: 'DELIVERED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

exports.AuctionStatus = exports.$Enums.AuctionStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  EXTENDED: 'EXTENDED',
  ENDED: 'ENDED',
  SETTLED: 'SETTLED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
};

exports.EscrowStatus = exports.$Enums.EscrowStatus = {
  HELD: 'HELD',
  DISBURSED: 'DISBURSED',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED',
};

exports.DisputeStatus = exports.$Enums.DisputeStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED_SELLER_FAVOR: 'RESOLVED_SELLER_FAVOR',
  RESOLVED_BUYER_FAVOR: 'RESOLVED_BUYER_FAVOR',
  CANCELLED: 'CANCELLED',
};

exports.PaymentProvider = exports.$Enums.PaymentProvider = {
  PAYOS: 'PAYOS',
  STRIPE: 'STRIPE',
  WALLET: 'WALLET',
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

exports.CarrierName = exports.$Enums.CarrierName = {
  GHN: 'GHN',
  GHTK: 'GHTK',
};

exports.ShipmentStatus = exports.$Enums.ShipmentStatus = {
  CREATED: 'CREATED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETURNED: 'RETURNED',
};

exports.ReputationTrustLevel = exports.$Enums.ReputationTrustLevel = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  STANDARD: 'STANDARD',
  PROBATION: 'PROBATION',
  SUSPENDED: 'SUSPENDED',
};

exports.PenaltyType = exports.$Enums.PenaltyType = {
  PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',
  ORDER_CANCELLATION: 'ORDER_CANCELLATION',
  AUCTION_DEFAULT: 'AUCTION_DEFAULT',
  MISREPRESENTATION: 'MISREPRESENTATION',
  FRAUD: 'FRAUD',
};

exports.NotificationChannel = exports.$Enums.NotificationChannel = {
  EMAIL: 'EMAIL',
  PUSH: 'PUSH',
  IN_APP: 'IN_APP',
};

exports.NotificationType = exports.$Enums.NotificationType = {
  ORDER: 'ORDER',
  AUCTION: 'AUCTION',
  SYSTEM: 'SYSTEM',
  PAYMENT: 'PAYMENT',
  DISPUTE: 'DISPUTE',
};

exports.WalletTransactionType = exports.$Enums.WalletTransactionType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAW: 'WITHDRAW',
  ESCROW_LOCK: 'ESCROW_LOCK',
  ESCROW_PAYOUT: 'ESCROW_PAYOUT',
  ESCROW_REFUND: 'ESCROW_REFUND',
};

exports.WalletTransactionStatus = exports.$Enums.WalletTransactionStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
};

exports.ProductStatus = exports.$Enums.ProductStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
};

exports.ReservationStatus = exports.$Enums.ReservationStatus = {
  PENDING: 'PENDING',
  COMMITTED: 'COMMITTED',
  RELEASED: 'RELEASED',
};

exports.BidStatus = exports.$Enums.BidStatus = {
  ACCEPTED: 'ACCEPTED',
  SUPERSEDED: 'SUPERSEDED',
  WINNING: 'WINNING',
  REJECTED: 'REJECTED',
};

exports.Prisma.ModelName = {
  User: 'User',
  UserAddress: 'UserAddress',
  RefreshToken: 'RefreshToken',
  Wallet: 'Wallet',
  WalletTransaction: 'WalletTransaction',
  ReputationLog: 'ReputationLog',
  Category: 'Category',
  Product: 'Product',
  ProductImage: 'ProductImage',
  Warehouse: 'Warehouse',
  Inventory: 'Inventory',
  InventoryReservation: 'InventoryReservation',
  InventoryLedger: 'InventoryLedger',
  Cart: 'Cart',
  CartItem: 'CartItem',
  Order: 'Order',
  OrderItem: 'OrderItem',
  Payment: 'Payment',
  Auction: 'Auction',
  Bid: 'Bid',
  EscrowRecord: 'EscrowRecord',
  Shipment: 'Shipment',
  Dispute: 'Dispute',
  Review: 'Review',
  EventLog: 'EventLog',
  Notification: 'Notification',
  NotificationPreference: 'NotificationPreference',
};
/**
 * Create the Client
 */
const config = {
  generator: {
    name: 'client',
    provider: {
      fromEnvVar: null,
      value: 'prisma-client-js',
    },
    output: {
      value: 'D:\\project-nexus-dev\\project-nexus-dev\\backend\\src\\generated\\client',
      fromEnvVar: null,
    },
    config: {
      engineType: 'library',
    },
    binaryTargets: [
      {
        fromEnvVar: null,
        value: 'windows',
        native: true,
      },
    ],
    previewFeatures: [],
    sourceFilePath: 'D:\\project-nexus-dev\\project-nexus-dev\\backend\\prisma\\schema.prisma',
    isCustomOutput: true,
  },
  relativeEnvPaths: {
    rootEnvPath: null,
  },
  relativePath: '../../../prisma',
  clientVersion: '6.4.0',
  engineVersion: 'a9055b89e58b4b5bfb59600785423b1db3d0e75d',
  datasourceNames: ['db'],
  activeProvider: 'postgresql',
  postinstall: false,
  inlineDatasources: {
    db: {
      url: {
        fromEnvVar: 'DATABASE_URL',
        value: null,
      },
    },
  },
  inlineSchema:
    'generator client {\n  provider = "prisma-client-js"\n  output   = "../src/generated/client"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\nenum Role {\n  ADMIN\n  SUPPORT_STAFF\n  SELLER\n  BUYER\n  GUEST\n}\n\nenum OrderStatus {\n  PENDING_PAYMENT\n  PAID\n  PREPARING\n  SHIPPING\n  DELIVERED\n  CONFIRMED\n  CANCELLED\n  REFUNDED\n}\n\nenum AuctionStatus {\n  DRAFT\n  SCHEDULED\n  ACTIVE\n  EXTENDED\n  ENDED\n  SETTLED\n  CANCELLED\n  FAILED\n}\n\nenum EscrowStatus {\n  HELD\n  DISBURSED\n  REFUNDED\n  DISPUTED\n}\n\nenum DisputeStatus {\n  OPEN\n  UNDER_REVIEW\n  RESOLVED_SELLER_FAVOR\n  RESOLVED_BUYER_FAVOR\n  CANCELLED\n}\n\nenum PaymentProvider {\n  PAYOS\n  STRIPE\n  WALLET\n}\n\nenum PaymentStatus {\n  PENDING\n  SUCCESS\n  FAILED\n  CANCELLED\n}\n\nenum CarrierName {\n  GHN\n  GHTK\n}\n\nenum ShipmentStatus {\n  CREATED\n  PICKED_UP\n  IN_TRANSIT\n  DELIVERED\n  FAILED\n  RETURNED\n}\n\nenum ReputationTrustLevel {\n  EXCELLENT\n  GOOD\n  STANDARD\n  PROBATION\n  SUSPENDED\n}\n\nenum PenaltyType {\n  PAYMENT_TIMEOUT\n  ORDER_CANCELLATION\n  AUCTION_DEFAULT\n  MISREPRESENTATION\n  FRAUD\n}\n\nenum NotificationChannel {\n  EMAIL\n  PUSH\n  IN_APP\n}\n\nenum NotificationType {\n  ORDER\n  AUCTION\n  SYSTEM\n  PAYMENT\n  DISPUTE\n}\n\nenum WalletTransactionType {\n  DEPOSIT\n  WITHDRAW\n  ESCROW_LOCK\n  ESCROW_PAYOUT\n  ESCROW_REFUND\n}\n\nenum WalletTransactionStatus {\n  PENDING\n  SUCCESS\n  FAILED\n}\n\nenum ProductStatus {\n  DRAFT\n  ACTIVE\n  INACTIVE\n}\n\nenum ReservationStatus {\n  PENDING\n  COMMITTED\n  RELEASED\n}\n\nenum BidStatus {\n  ACCEPTED\n  SUPERSEDED\n  WINNING\n  REJECTED\n}\n\nmodel User {\n  id              String               @id @default(uuid())\n  email           String               @unique\n  passwordHash    String               @map("password_hash")\n  fullName        String               @map("full_name")\n  phoneNumber     String?              @map("phone_number")\n  avatarUrl       String?              @map("avatar_url")\n  role            Role                 @default(BUYER)\n  isSellerActive  Boolean              @default(false) @map("is_seller_active")\n  reputationScore Int                  @default(100) @map("reputation_score")\n  trustLevel      ReputationTrustLevel @default(EXCELLENT) @map("trust_level")\n  createdAt       DateTime             @default(now()) @map("created_at")\n  updatedAt       DateTime             @updatedAt @map("updated_at")\n\n  wallet                  Wallet?\n  addresses               UserAddress[]\n  refreshTokens           RefreshToken[]\n  products                Product[]\n  ordersAsBuyer           Order[]                  @relation("BuyerOrders")\n  ordersAsSeller          Order[]                  @relation("SellerOrders")\n  auctions                Auction[]\n  bids                    Bid[]\n  cart                    Cart?\n  reputationLogs          ReputationLog[]\n  notifications           Notification[]\n  notificationPreferences NotificationPreference[]\n  reviewsGiven            Review[]                 @relation("Reviewer")\n  reviewsReceived         Review[]                 @relation("Reviewee")\n  disputesOpened          Dispute[]                @relation("DisputeOpener")\n  disputesResolved        Dispute[]                @relation("DisputeResolver")\n\n  @@map("users")\n}\n\nmodel UserAddress {\n  id            String   @id @default(uuid())\n  userId        String   @map("user_id")\n  recipientName String   @map("recipient_name")\n  phone         String\n  street        String\n  ward          String?\n  district      String?\n  city          String\n  country       String   @default("VN")\n  isDefault     Boolean  @default(false) @map("is_default")\n  createdAt     DateTime @default(now()) @map("created_at")\n  updatedAt     DateTime @updatedAt @map("updated_at")\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@map("user_addresses")\n}\n\nmodel RefreshToken {\n  id        String   @id @default(uuid())\n  userId    String   @map("user_id")\n  tokenHash String   @map("token_hash")\n  expiresAt DateTime @map("expires_at")\n  isRevoked Boolean  @default(false) @map("is_revoked")\n  createdAt DateTime @default(now()) @map("created_at")\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@map("refresh_tokens")\n}\n\nmodel Wallet {\n  id            String   @id @default(uuid())\n  userId        String   @unique @map("user_id")\n  balance       Decimal  @default(0) @db.Decimal(14, 2)\n  lockedBalance Decimal  @default(0) @map("locked_balance") @db.Decimal(14, 2)\n  currency      String   @default("VND")\n  createdAt     DateTime @default(now()) @map("created_at")\n  updatedAt     DateTime @updatedAt @map("updated_at")\n\n  user         User                @relation(fields: [userId], references: [id], onDelete: Cascade)\n  transactions WalletTransaction[]\n\n  @@map("wallets")\n}\n\nmodel WalletTransaction {\n  id          String                  @id @default(uuid())\n  walletId    String                  @map("wallet_id")\n  amount      Decimal                 @db.Decimal(14, 2)\n  type        WalletTransactionType\n  status      WalletTransactionStatus @default(SUCCESS)\n  referenceId String?                 @map("reference_id")\n  description String?\n  createdAt   DateTime                @default(now()) @map("created_at")\n\n  wallet Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)\n\n  @@map("wallet_transactions")\n}\n\nmodel ReputationLog {\n  id           String       @id @default(uuid())\n  userId       String       @map("user_id")\n  deltaPoints  Int          @map("delta_points")\n  balanceAfter Int          @map("balance_after")\n  reason       String\n  penaltyType  PenaltyType? @map("penalty_type")\n  referenceId  String?      @map("reference_id")\n  createdAt    DateTime     @default(now()) @map("created_at")\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@map("reputation_logs")\n}\n\nmodel Category {\n  id        String   @id @default(uuid())\n  name      String\n  slug      String   @unique\n  parentId  String?  @map("parent_id")\n  level     Int      @default(1)\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n\n  parent   Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: Restrict)\n  children Category[] @relation("CategoryHierarchy")\n  products Product[]\n\n  @@map("categories")\n}\n\nmodel Product {\n  id            String        @id @default(uuid())\n  sellerId      String        @map("seller_id")\n  categoryId    String        @map("category_id")\n  title         String\n  description   String        @db.Text\n  basePrice     Decimal       @map("base_price") @db.Decimal(14, 2)\n  weightGrams   Int           @default(500) @map("weight_grams")\n  lengthCm      Int           @default(10) @map("length_cm")\n  widthCm       Int           @default(10) @map("width_cm")\n  heightCm      Int           @default(10) @map("height_cm")\n  threeModelKey String?       @map("three_model_key")\n  status        ProductStatus @default(ACTIVE)\n  createdAt     DateTime      @default(now()) @map("created_at")\n  updatedAt     DateTime      @updatedAt @map("updated_at")\n\n  seller      User           @relation(fields: [sellerId], references: [id], onDelete: Restrict)\n  category    Category       @relation(fields: [categoryId], references: [id], onDelete: Restrict)\n  images      ProductImage[]\n  inventories Inventory[]\n  cartItems   CartItem[]\n  orderItems  OrderItem[]\n  auctions    Auction[]\n\n  @@map("products")\n}\n\nmodel ProductImage {\n  id          String   @id @default(uuid())\n  productId   String   @map("product_id")\n  imageUrl    String   @map("image_url")\n  isThumbnail Boolean  @default(false) @map("is_thumbnail")\n  sortOrder   Int      @default(0) @map("sort_order")\n  createdAt   DateTime @default(now()) @map("created_at")\n\n  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)\n\n  @@map("product_images")\n}\n\nmodel Warehouse {\n  id        String   @id @default(uuid())\n  code      String   @unique @default("WH_001")\n  name      String\n  address   String?\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n\n  inventories Inventory[]\n\n  @@map("warehouses")\n}\n\nmodel Inventory {\n  id           String   @id @default(uuid())\n  warehouseId  String   @map("warehouse_id")\n  productId    String   @map("product_id")\n  totalQty     Int      @default(0) @map("total_qty")\n  availableQty Int      @default(0) @map("available_qty")\n  reservedQty  Int      @default(0) @map("reserved_qty")\n  createdAt    DateTime @default(now()) @map("created_at")\n  updatedAt    DateTime @updatedAt @map("updated_at")\n\n  warehouse    Warehouse              @relation(fields: [warehouseId], references: [id], onDelete: Restrict)\n  product      Product                @relation(fields: [productId], references: [id], onDelete: Restrict)\n  reservations InventoryReservation[]\n  ledgers      InventoryLedger[]\n\n  @@unique([warehouseId, productId])\n  @@map("inventories")\n}\n\nmodel InventoryReservation {\n  id          String            @id @default(uuid())\n  inventoryId String            @map("inventory_id")\n  quantity    Int\n  referenceId String            @map("reference_id")\n  status      ReservationStatus @default(PENDING)\n  expiresAt   DateTime          @map("expires_at")\n  createdAt   DateTime          @default(now()) @map("created_at")\n  updatedAt   DateTime          @updatedAt @map("updated_at")\n\n  inventory Inventory @relation(fields: [inventoryId], references: [id], onDelete: Cascade)\n\n  @@map("inventory_reservations")\n}\n\nmodel InventoryLedger {\n  id           String   @id @default(uuid())\n  inventoryId  String   @map("inventory_id")\n  changeQty    Int      @map("change_qty")\n  balanceAfter Int      @map("balance_after")\n  reason       String\n  referenceId  String?  @map("reference_id")\n  createdAt    DateTime @default(now()) @map("created_at")\n\n  inventory Inventory @relation(fields: [inventoryId], references: [id], onDelete: Cascade)\n\n  @@map("inventory_ledgers")\n}\n\nmodel Cart {\n  id        String   @id @default(uuid())\n  userId    String   @unique @map("user_id")\n  expiresAt DateTime @map("expires_at")\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n\n  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)\n  items CartItem[]\n\n  @@map("carts")\n}\n\nmodel CartItem {\n  id           String   @id @default(uuid())\n  cartId       String   @map("cart_id")\n  productId    String   @map("product_id")\n  quantity     Int      @default(1)\n  priceAtAdded Decimal  @map("price_at_added") @db.Decimal(14, 2)\n  createdAt    DateTime @default(now()) @map("created_at")\n  updatedAt    DateTime @updatedAt @map("updated_at")\n\n  cart    Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)\n  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)\n\n  @@unique([cartId, productId])\n  @@map("cart_items")\n}\n\nmodel Order {\n  id                      String      @id @default(uuid())\n  buyerId                 String      @map("buyer_id")\n  sellerId                String      @map("seller_id")\n  subtotal                Decimal     @db.Decimal(14, 2)\n  shippingFee             Decimal     @default(0) @map("shipping_fee") @db.Decimal(14, 2)\n  totalAmount             Decimal     @map("total_amount") @db.Decimal(14, 2)\n  status                  OrderStatus @default(PENDING_PAYMENT)\n  shippingAddressSnapshot Json        @map("shipping_address_snapshot")\n  idempotencyKey          String?     @unique @map("idempotency_key")\n  createdAt               DateTime    @default(now()) @map("created_at")\n  updatedAt               DateTime    @updatedAt @map("updated_at")\n\n  buyer        User          @relation("BuyerOrders", fields: [buyerId], references: [id], onDelete: Restrict)\n  seller       User          @relation("SellerOrders", fields: [sellerId], references: [id], onDelete: Restrict)\n  items        OrderItem[]\n  payments     Payment[]\n  escrowRecord EscrowRecord?\n  shipment     Shipment?\n  dispute      Dispute?\n  review       Review?\n\n  @@map("orders")\n}\n\nmodel OrderItem {\n  id         String   @id @default(uuid())\n  orderId    String   @map("order_id")\n  productId  String   @map("product_id")\n  quantity   Int      @default(1)\n  unitPrice  Decimal  @map("unit_price") @db.Decimal(14, 2)\n  totalPrice Decimal  @map("total_price") @db.Decimal(14, 2)\n  createdAt  DateTime @default(now()) @map("created_at")\n\n  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)\n  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)\n\n  @@map("order_items")\n}\n\nmodel Payment {\n  id              String          @id @default(uuid())\n  orderId         String          @map("order_id")\n  provider        PaymentProvider\n  amount          Decimal         @db.Decimal(14, 2)\n  status          PaymentStatus   @default(PENDING)\n  transactionCode String?         @map("transaction_code")\n  idempotencyKey  String?         @unique @map("idempotency_key")\n  metadata        Json?\n  createdAt       DateTime        @default(now()) @map("created_at")\n  updatedAt       DateTime        @updatedAt @map("updated_at")\n\n  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)\n\n  @@map("payments")\n}\n\nmodel Auction {\n  id                     String        @id @default(uuid())\n  productId              String        @map("product_id")\n  sellerId               String        @map("seller_id")\n  title                  String\n  startingPrice          Decimal       @map("starting_price") @db.Decimal(14, 2)\n  reservePrice           Decimal?      @map("reserve_price") @db.Decimal(14, 2)\n  currentHighestBid      Decimal       @default(0) @map("current_highest_bid") @db.Decimal(14, 2)\n  currentHighestBidderId String?       @map("current_highest_bidder_id")\n  bidIncrement           Decimal       @default(10.0) @map("bid_increment") @db.Decimal(14, 2)\n  status                 AuctionStatus @default(SCHEDULED)\n  startTime              DateTime      @map("start_time")\n  endTime                DateTime      @map("end_time")\n  originalEndTime        DateTime      @map("original_end_time")\n  isExtended             Boolean       @default(false) @map("is_extended")\n  totalBidsCount         Int           @default(0) @map("total_bids_count")\n  createdAt              DateTime      @default(now()) @map("created_at")\n  updatedAt              DateTime      @updatedAt @map("updated_at")\n\n  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)\n  seller  User    @relation(fields: [sellerId], references: [id], onDelete: Restrict)\n  bids    Bid[]\n\n  @@index([status, endTime])\n  @@map("auctions")\n}\n\nmodel Bid {\n  id        String    @id @default(uuid())\n  auctionId String    @map("auction_id")\n  bidderId  String    @map("bidder_id")\n  bidAmount Decimal   @map("bid_amount") @db.Decimal(14, 2)\n  status    BidStatus @default(ACCEPTED)\n  placedAt  DateTime  @default(now()) @map("placed_at")\n\n  auction Auction @relation(fields: [auctionId], references: [id], onDelete: Cascade)\n  bidder  User    @relation(fields: [bidderId], references: [id], onDelete: Restrict)\n\n  @@index([auctionId, placedAt])\n  @@map("bids")\n}\n\nmodel EscrowRecord {\n  id           String       @id @default(uuid())\n  orderId      String       @unique @map("order_id")\n  totalAmount  Decimal      @map("total_amount") @db.Decimal(14, 2)\n  platformFee  Decimal      @map("platform_fee") @db.Decimal(14, 2)\n  sellerPayout Decimal      @map("seller_payout") @db.Decimal(14, 2)\n  status       EscrowStatus @default(HELD)\n  heldAt       DateTime     @default(now()) @map("held_at")\n  disbursedAt  DateTime?    @map("disbursed_at")\n  refundedAt   DateTime?    @map("refunded_at")\n\n  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)\n\n  @@map("escrow_records")\n}\n\nmodel Shipment {\n  id               String         @id @default(uuid())\n  orderId          String         @unique @map("order_id")\n  carrier          CarrierName    @default(GHN)\n  trackingNumber   String?        @map("tracking_number")\n  shippingFee      Decimal        @map("shipping_fee") @db.Decimal(14, 2)\n  chargeableWeight Decimal        @map("chargeable_weight") @db.Decimal(10, 2)\n  isInternational  Boolean        @default(false) @map("is_international")\n  customsFee       Decimal        @default(0) @map("customs_fee") @db.Decimal(14, 2)\n  status           ShipmentStatus @default(CREATED)\n  waybillCode      String?        @map("waybill_code")\n  metadata         Json?\n  createdAt        DateTime       @default(now()) @map("created_at")\n  updatedAt        DateTime       @updatedAt @map("updated_at")\n\n  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)\n\n  @@map("shipments")\n}\n\nmodel Dispute {\n  id               String        @id @default(uuid())\n  orderId          String        @unique @map("order_id")\n  openedByUserId   String        @map("opened_by_user_id")\n  reason           String        @db.Text\n  evidenceUrls     Json?         @map("evidence_urls")\n  status           DisputeStatus @default(OPEN)\n  resolutionNotes  String?       @map("resolution_notes") @db.Text\n  resolvedByUserId String?       @map("resolved_by_user_id")\n  resolvedAt       DateTime?     @map("resolved_at")\n  createdAt        DateTime      @default(now()) @map("created_at")\n  updatedAt        DateTime      @updatedAt @map("updated_at")\n\n  order      Order @relation(fields: [orderId], references: [id], onDelete: Cascade)\n  openedBy   User  @relation("DisputeOpener", fields: [openedByUserId], references: [id], onDelete: Restrict)\n  resolvedBy User? @relation("DisputeResolver", fields: [resolvedByUserId], references: [id], onDelete: Restrict)\n\n  @@map("disputes")\n}\n\nmodel Review {\n  id           String   @id @default(uuid())\n  orderId      String   @unique @map("order_id")\n  reviewerId   String   @map("reviewer_id")\n  targetUserId String   @map("target_user_id")\n  rating       Decimal  @db.Decimal(2, 1)\n  comment      String?  @db.Text\n  isShopReview Boolean  @default(true) @map("is_shop_review")\n  createdAt    DateTime @default(now()) @map("created_at")\n\n  order      Order @relation(fields: [orderId], references: [id], onDelete: Cascade)\n  reviewer   User  @relation("Reviewer", fields: [reviewerId], references: [id], onDelete: Restrict)\n  targetUser User  @relation("Reviewee", fields: [targetUserId], references: [id], onDelete: Restrict)\n\n  @@map("reviews")\n}\n\nmodel EventLog {\n  id         String   @id @default(uuid())\n  eventName  String   @map("event_name")\n  payload    Json\n  operatorId String?  @map("operator_id")\n  traceId    String?  @map("trace_id")\n  createdAt  DateTime @default(now()) @map("created_at")\n\n  @@index([eventName, createdAt])\n  @@map("event_logs")\n}\n\nmodel Notification {\n  id        String              @id @default(uuid())\n  userId    String              @map("user_id")\n  title     String\n  content   String              @db.Text\n  type      NotificationType    @default(SYSTEM)\n  channel   NotificationChannel @default(IN_APP)\n  isRead    Boolean             @default(false) @map("is_read")\n  readAt    DateTime?           @map("read_at")\n  createdAt DateTime            @default(now()) @map("created_at")\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@map("notifications")\n}\n\nmodel NotificationPreference {\n  id        String              @id @default(uuid())\n  userId    String              @map("user_id")\n  channel   NotificationChannel\n  isEnabled Boolean             @default(true) @map("is_enabled")\n\n  user User @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@unique([userId, channel])\n  @@map("notification_preferences")\n}\n',
  inlineSchemaHash: 'c94dc99c4cb7682aab477a439a054d229dc829a78f8cc61f1f645af9d61aa9c0',
  copyEngine: true,
};

const fs = require('fs');

config.dirname = __dirname;
if (!fs.existsSync(path.join(__dirname, 'schema.prisma'))) {
  const alternativePaths = ['src/generated/client', 'generated/client'];

  const alternativePath =
    alternativePaths.find((altPath) => {
      return fs.existsSync(path.join(process.cwd(), altPath, 'schema.prisma'));
    }) ?? alternativePaths[0];

  config.dirname = path.join(process.cwd(), alternativePath);
  config.isBundled = true;
}

config.runtimeDataModel = JSON.parse(
  '{"models":{"User":{"dbName":"users","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"email","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"passwordHash","dbName":"password_hash","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"fullName","dbName":"full_name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phoneNumber","dbName":"phone_number","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"avatarUrl","dbName":"avatar_url","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"role","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Role","nativeType":null,"default":"BUYER","isGenerated":false,"isUpdatedAt":false},{"name":"isSellerActive","dbName":"is_seller_active","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"reputationScore","dbName":"reputation_score","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":100,"isGenerated":false,"isUpdatedAt":false},{"name":"trustLevel","dbName":"trust_level","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"ReputationTrustLevel","nativeType":null,"default":"EXCELLENT","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"wallet","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Wallet","nativeType":null,"relationName":"UserToWallet","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"addresses","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"UserAddress","nativeType":null,"relationName":"UserToUserAddress","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"refreshTokens","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"RefreshToken","nativeType":null,"relationName":"RefreshTokenToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"products","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"ProductToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"ordersAsBuyer","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"BuyerOrders","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"ordersAsSeller","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"SellerOrders","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"auctions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Auction","nativeType":null,"relationName":"AuctionToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"bids","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Bid","nativeType":null,"relationName":"BidToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"cart","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Cart","nativeType":null,"relationName":"CartToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"reputationLogs","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"ReputationLog","nativeType":null,"relationName":"ReputationLogToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"notifications","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Notification","nativeType":null,"relationName":"NotificationToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"notificationPreferences","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NotificationPreference","nativeType":null,"relationName":"NotificationPreferenceToUser","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"reviewsGiven","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Review","nativeType":null,"relationName":"Reviewer","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"reviewsReceived","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Review","nativeType":null,"relationName":"Reviewee","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"disputesOpened","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Dispute","nativeType":null,"relationName":"DisputeOpener","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"disputesResolved","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Dispute","nativeType":null,"relationName":"DisputeResolver","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"UserAddress":{"dbName":"user_addresses","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"recipientName","dbName":"recipient_name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"phone","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"street","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"ward","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"district","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"city","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"country","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"VN","isGenerated":false,"isUpdatedAt":false},{"name":"isDefault","dbName":"is_default","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"UserToUserAddress","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"RefreshToken":{"dbName":"refresh_tokens","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"tokenHash","dbName":"token_hash","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"expiresAt","dbName":"expires_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isRevoked","dbName":"is_revoked","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"RefreshTokenToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Wallet":{"dbName":"wallets","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"balance","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Decimal","nativeType":["Decimal",["14","2"]],"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"lockedBalance","dbName":"locked_balance","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Decimal","nativeType":["Decimal",["14","2"]],"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"currency","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"VND","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"UserToWallet","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"transactions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WalletTransaction","nativeType":null,"relationName":"WalletToWalletTransaction","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"WalletTransaction":{"dbName":"wallet_transactions","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"walletId","dbName":"wallet_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"WalletTransactionType","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"WalletTransactionStatus","nativeType":null,"default":"SUCCESS","isGenerated":false,"isUpdatedAt":false},{"name":"referenceId","dbName":"reference_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"wallet","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Wallet","nativeType":null,"relationName":"WalletToWalletTransaction","relationFromFields":["walletId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"ReputationLog":{"dbName":"reputation_logs","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"deltaPoints","dbName":"delta_points","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"balanceAfter","dbName":"balance_after","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"reason","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"penaltyType","dbName":"penalty_type","kind":"enum","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"PenaltyType","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"referenceId","dbName":"reference_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"ReputationLogToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Category":{"dbName":"categories","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"slug","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"parentId","dbName":"parent_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"level","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"parent","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Category","nativeType":null,"relationName":"CategoryHierarchy","relationFromFields":["parentId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"children","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Category","nativeType":null,"relationName":"CategoryHierarchy","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"products","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"CategoryToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Product":{"dbName":"products","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"sellerId","dbName":"seller_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"categoryId","dbName":"category_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"title","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"description","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":["Text",[]],"isGenerated":false,"isUpdatedAt":false},{"name":"basePrice","dbName":"base_price","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"weightGrams","dbName":"weight_grams","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":500,"isGenerated":false,"isUpdatedAt":false},{"name":"lengthCm","dbName":"length_cm","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":10,"isGenerated":false,"isUpdatedAt":false},{"name":"widthCm","dbName":"width_cm","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":10,"isGenerated":false,"isUpdatedAt":false},{"name":"heightCm","dbName":"height_cm","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":10,"isGenerated":false,"isUpdatedAt":false},{"name":"threeModelKey","dbName":"three_model_key","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"ProductStatus","nativeType":null,"default":"ACTIVE","isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"seller","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"ProductToUser","relationFromFields":["sellerId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"category","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Category","nativeType":null,"relationName":"CategoryToProduct","relationFromFields":["categoryId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"images","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"ProductImage","nativeType":null,"relationName":"ProductToProductImage","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"inventories","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Inventory","nativeType":null,"relationName":"InventoryToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"cartItems","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"CartItem","nativeType":null,"relationName":"CartItemToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"orderItems","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OrderItem","nativeType":null,"relationName":"OrderItemToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"auctions","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Auction","nativeType":null,"relationName":"AuctionToProduct","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"ProductImage":{"dbName":"product_images","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"productId","dbName":"product_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"imageUrl","dbName":"image_url","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isThumbnail","dbName":"is_thumbnail","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"sortOrder","dbName":"sort_order","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"product","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"ProductToProductImage","relationFromFields":["productId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Warehouse":{"dbName":"warehouses","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"code","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":"WH_001","isGenerated":false,"isUpdatedAt":false},{"name":"name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"address","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"inventories","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Inventory","nativeType":null,"relationName":"InventoryToWarehouse","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Inventory":{"dbName":"inventories","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"warehouseId","dbName":"warehouse_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"productId","dbName":"product_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"totalQty","dbName":"total_qty","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"availableQty","dbName":"available_qty","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"reservedQty","dbName":"reserved_qty","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"warehouse","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Warehouse","nativeType":null,"relationName":"InventoryToWarehouse","relationFromFields":["warehouseId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"product","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"InventoryToProduct","relationFromFields":["productId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"reservations","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"InventoryReservation","nativeType":null,"relationName":"InventoryToInventoryReservation","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"ledgers","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"InventoryLedger","nativeType":null,"relationName":"InventoryToInventoryLedger","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["warehouseId","productId"]],"uniqueIndexes":[{"name":null,"fields":["warehouseId","productId"]}],"isGenerated":false},"InventoryReservation":{"dbName":"inventory_reservations","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"inventoryId","dbName":"inventory_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"quantity","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"referenceId","dbName":"reference_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"ReservationStatus","nativeType":null,"default":"PENDING","isGenerated":false,"isUpdatedAt":false},{"name":"expiresAt","dbName":"expires_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"inventory","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Inventory","nativeType":null,"relationName":"InventoryToInventoryReservation","relationFromFields":["inventoryId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"InventoryLedger":{"dbName":"inventory_ledgers","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"inventoryId","dbName":"inventory_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"changeQty","dbName":"change_qty","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"balanceAfter","dbName":"balance_after","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Int","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"reason","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"referenceId","dbName":"reference_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"inventory","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Inventory","nativeType":null,"relationName":"InventoryToInventoryLedger","relationFromFields":["inventoryId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Cart":{"dbName":"carts","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"expiresAt","dbName":"expires_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"CartToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"items","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"CartItem","nativeType":null,"relationName":"CartToCartItem","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"CartItem":{"dbName":"cart_items","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"cartId","dbName":"cart_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"productId","dbName":"product_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"quantity","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"priceAtAdded","dbName":"price_at_added","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"cart","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Cart","nativeType":null,"relationName":"CartToCartItem","relationFromFields":["cartId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"product","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"CartItemToProduct","relationFromFields":["productId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["cartId","productId"]],"uniqueIndexes":[{"name":null,"fields":["cartId","productId"]}],"isGenerated":false},"Order":{"dbName":"orders","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"buyerId","dbName":"buyer_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"sellerId","dbName":"seller_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"subtotal","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"shippingFee","dbName":"shipping_fee","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Decimal","nativeType":["Decimal",["14","2"]],"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"totalAmount","dbName":"total_amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"OrderStatus","nativeType":null,"default":"PENDING_PAYMENT","isGenerated":false,"isUpdatedAt":false},{"name":"shippingAddressSnapshot","dbName":"shipping_address_snapshot","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"idempotencyKey","dbName":"idempotency_key","kind":"scalar","isList":false,"isRequired":false,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"buyer","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"BuyerOrders","relationFromFields":["buyerId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"seller","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"SellerOrders","relationFromFields":["sellerId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"items","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"OrderItem","nativeType":null,"relationName":"OrderToOrderItem","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"payments","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Payment","nativeType":null,"relationName":"OrderToPayment","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"escrowRecord","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"EscrowRecord","nativeType":null,"relationName":"EscrowRecordToOrder","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"shipment","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Shipment","nativeType":null,"relationName":"OrderToShipment","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"dispute","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Dispute","nativeType":null,"relationName":"DisputeToOrder","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false},{"name":"review","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Review","nativeType":null,"relationName":"OrderToReview","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"OrderItem":{"dbName":"order_items","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"orderId","dbName":"order_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"productId","dbName":"product_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"quantity","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":1,"isGenerated":false,"isUpdatedAt":false},{"name":"unitPrice","dbName":"unit_price","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"totalPrice","dbName":"total_price","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"order","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToOrderItem","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"product","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"OrderItemToProduct","relationFromFields":["productId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Payment":{"dbName":"payments","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"orderId","dbName":"order_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"provider","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"PaymentProvider","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"PaymentStatus","nativeType":null,"default":"PENDING","isGenerated":false,"isUpdatedAt":false},{"name":"transactionCode","dbName":"transaction_code","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"idempotencyKey","dbName":"idempotency_key","kind":"scalar","isList":false,"isRequired":false,"isUnique":true,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"order","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToPayment","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Auction":{"dbName":"auctions","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"productId","dbName":"product_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"sellerId","dbName":"seller_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"title","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"startingPrice","dbName":"starting_price","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"reservePrice","dbName":"reserve_price","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"currentHighestBid","dbName":"current_highest_bid","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Decimal","nativeType":["Decimal",["14","2"]],"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"currentHighestBidderId","dbName":"current_highest_bidder_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"bidIncrement","dbName":"bid_increment","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Decimal","nativeType":["Decimal",["14","2"]],"default":10,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"AuctionStatus","nativeType":null,"default":"SCHEDULED","isGenerated":false,"isUpdatedAt":false},{"name":"startTime","dbName":"start_time","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"endTime","dbName":"end_time","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"originalEndTime","dbName":"original_end_time","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isExtended","dbName":"is_extended","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"totalBidsCount","dbName":"total_bids_count","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Int","nativeType":null,"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"product","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Product","nativeType":null,"relationName":"AuctionToProduct","relationFromFields":["productId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"seller","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"AuctionToUser","relationFromFields":["sellerId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"bids","kind":"object","isList":true,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Bid","nativeType":null,"relationName":"AuctionToBid","relationFromFields":[],"relationToFields":[],"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Bid":{"dbName":"bids","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"auctionId","dbName":"auction_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"bidderId","dbName":"bidder_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"bidAmount","dbName":"bid_amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"BidStatus","nativeType":null,"default":"ACCEPTED","isGenerated":false,"isUpdatedAt":false},{"name":"placedAt","dbName":"placed_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"auction","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Auction","nativeType":null,"relationName":"AuctionToBid","relationFromFields":["auctionId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"bidder","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"BidToUser","relationFromFields":["bidderId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"EscrowRecord":{"dbName":"escrow_records","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"orderId","dbName":"order_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"totalAmount","dbName":"total_amount","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"platformFee","dbName":"platform_fee","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"sellerPayout","dbName":"seller_payout","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"EscrowStatus","nativeType":null,"default":"HELD","isGenerated":false,"isUpdatedAt":false},{"name":"heldAt","dbName":"held_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"disbursedAt","dbName":"disbursed_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"refundedAt","dbName":"refunded_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"order","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"EscrowRecordToOrder","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Shipment":{"dbName":"shipments","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"orderId","dbName":"order_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"carrier","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"CarrierName","nativeType":null,"default":"GHN","isGenerated":false,"isUpdatedAt":false},{"name":"trackingNumber","dbName":"tracking_number","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"shippingFee","dbName":"shipping_fee","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["14","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"chargeableWeight","dbName":"chargeable_weight","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["10","2"]],"isGenerated":false,"isUpdatedAt":false},{"name":"isInternational","dbName":"is_international","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"customsFee","dbName":"customs_fee","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Decimal","nativeType":["Decimal",["14","2"]],"default":0,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"ShipmentStatus","nativeType":null,"default":"CREATED","isGenerated":false,"isUpdatedAt":false},{"name":"waybillCode","dbName":"waybill_code","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"metadata","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"order","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToShipment","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Dispute":{"dbName":"disputes","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"orderId","dbName":"order_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"openedByUserId","dbName":"opened_by_user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"reason","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":["Text",[]],"isGenerated":false,"isUpdatedAt":false},{"name":"evidenceUrls","dbName":"evidence_urls","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"status","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DisputeStatus","nativeType":null,"default":"OPEN","isGenerated":false,"isUpdatedAt":false},{"name":"resolutionNotes","dbName":"resolution_notes","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":["Text",[]],"isGenerated":false,"isUpdatedAt":false},{"name":"resolvedByUserId","dbName":"resolved_by_user_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"resolvedAt","dbName":"resolved_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"updatedAt","dbName":"updated_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":true},{"name":"order","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"DisputeToOrder","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"openedBy","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"DisputeOpener","relationFromFields":["openedByUserId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"resolvedBy","kind":"object","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"DisputeResolver","relationFromFields":["resolvedByUserId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Review":{"dbName":"reviews","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"orderId","dbName":"order_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":true,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"reviewerId","dbName":"reviewer_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"targetUserId","dbName":"target_user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"rating","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Decimal","nativeType":["Decimal",["2","1"]],"isGenerated":false,"isUpdatedAt":false},{"name":"comment","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":["Text",[]],"isGenerated":false,"isUpdatedAt":false},{"name":"isShopReview","dbName":"is_shop_review","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"order","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Order","nativeType":null,"relationName":"OrderToReview","relationFromFields":["orderId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false},{"name":"reviewer","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"Reviewer","relationFromFields":["reviewerId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false},{"name":"targetUser","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"Reviewee","relationFromFields":["targetUserId"],"relationToFields":["id"],"relationOnDelete":"Restrict","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"EventLog":{"dbName":"event_logs","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"eventName","dbName":"event_name","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"payload","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"Json","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"operatorId","dbName":"operator_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"traceId","dbName":"trace_id","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"Notification":{"dbName":"notifications","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"title","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"content","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"String","nativeType":["Text",[]],"isGenerated":false,"isUpdatedAt":false},{"name":"type","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"NotificationType","nativeType":null,"default":"SYSTEM","isGenerated":false,"isUpdatedAt":false},{"name":"channel","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"NotificationChannel","nativeType":null,"default":"IN_APP","isGenerated":false,"isUpdatedAt":false},{"name":"isRead","dbName":"is_read","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":false,"isGenerated":false,"isUpdatedAt":false},{"name":"readAt","dbName":"read_at","kind":"scalar","isList":false,"isRequired":false,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"DateTime","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"createdAt","dbName":"created_at","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"DateTime","nativeType":null,"default":{"name":"now","args":[]},"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"NotificationToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[],"uniqueIndexes":[],"isGenerated":false},"NotificationPreference":{"dbName":"notification_preferences","schema":null,"fields":[{"name":"id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":true,"isReadOnly":false,"hasDefaultValue":true,"type":"String","nativeType":null,"default":{"name":"uuid","args":[4]},"isGenerated":false,"isUpdatedAt":false},{"name":"userId","dbName":"user_id","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":true,"hasDefaultValue":false,"type":"String","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"channel","kind":"enum","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"NotificationChannel","nativeType":null,"isGenerated":false,"isUpdatedAt":false},{"name":"isEnabled","dbName":"is_enabled","kind":"scalar","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":true,"type":"Boolean","nativeType":null,"default":true,"isGenerated":false,"isUpdatedAt":false},{"name":"user","kind":"object","isList":false,"isRequired":true,"isUnique":false,"isId":false,"isReadOnly":false,"hasDefaultValue":false,"type":"User","nativeType":null,"relationName":"NotificationPreferenceToUser","relationFromFields":["userId"],"relationToFields":["id"],"relationOnDelete":"Cascade","isGenerated":false,"isUpdatedAt":false}],"primaryKey":null,"uniqueFields":[["userId","channel"]],"uniqueIndexes":[{"name":null,"fields":["userId","channel"]}],"isGenerated":false}},"enums":{"Role":{"values":[{"name":"ADMIN","dbName":null},{"name":"SUPPORT_STAFF","dbName":null},{"name":"SELLER","dbName":null},{"name":"BUYER","dbName":null},{"name":"GUEST","dbName":null}],"dbName":null},"OrderStatus":{"values":[{"name":"PENDING_PAYMENT","dbName":null},{"name":"PAID","dbName":null},{"name":"PREPARING","dbName":null},{"name":"SHIPPING","dbName":null},{"name":"DELIVERED","dbName":null},{"name":"CONFIRMED","dbName":null},{"name":"CANCELLED","dbName":null},{"name":"REFUNDED","dbName":null}],"dbName":null},"AuctionStatus":{"values":[{"name":"DRAFT","dbName":null},{"name":"SCHEDULED","dbName":null},{"name":"ACTIVE","dbName":null},{"name":"EXTENDED","dbName":null},{"name":"ENDED","dbName":null},{"name":"SETTLED","dbName":null},{"name":"CANCELLED","dbName":null},{"name":"FAILED","dbName":null}],"dbName":null},"EscrowStatus":{"values":[{"name":"HELD","dbName":null},{"name":"DISBURSED","dbName":null},{"name":"REFUNDED","dbName":null},{"name":"DISPUTED","dbName":null}],"dbName":null},"DisputeStatus":{"values":[{"name":"OPEN","dbName":null},{"name":"UNDER_REVIEW","dbName":null},{"name":"RESOLVED_SELLER_FAVOR","dbName":null},{"name":"RESOLVED_BUYER_FAVOR","dbName":null},{"name":"CANCELLED","dbName":null}],"dbName":null},"PaymentProvider":{"values":[{"name":"PAYOS","dbName":null},{"name":"STRIPE","dbName":null},{"name":"WALLET","dbName":null}],"dbName":null},"PaymentStatus":{"values":[{"name":"PENDING","dbName":null},{"name":"SUCCESS","dbName":null},{"name":"FAILED","dbName":null},{"name":"CANCELLED","dbName":null}],"dbName":null},"CarrierName":{"values":[{"name":"GHN","dbName":null},{"name":"GHTK","dbName":null}],"dbName":null},"ShipmentStatus":{"values":[{"name":"CREATED","dbName":null},{"name":"PICKED_UP","dbName":null},{"name":"IN_TRANSIT","dbName":null},{"name":"DELIVERED","dbName":null},{"name":"FAILED","dbName":null},{"name":"RETURNED","dbName":null}],"dbName":null},"ReputationTrustLevel":{"values":[{"name":"EXCELLENT","dbName":null},{"name":"GOOD","dbName":null},{"name":"STANDARD","dbName":null},{"name":"PROBATION","dbName":null},{"name":"SUSPENDED","dbName":null}],"dbName":null},"PenaltyType":{"values":[{"name":"PAYMENT_TIMEOUT","dbName":null},{"name":"ORDER_CANCELLATION","dbName":null},{"name":"AUCTION_DEFAULT","dbName":null},{"name":"MISREPRESENTATION","dbName":null},{"name":"FRAUD","dbName":null}],"dbName":null},"NotificationChannel":{"values":[{"name":"EMAIL","dbName":null},{"name":"PUSH","dbName":null},{"name":"IN_APP","dbName":null}],"dbName":null},"NotificationType":{"values":[{"name":"ORDER","dbName":null},{"name":"AUCTION","dbName":null},{"name":"SYSTEM","dbName":null},{"name":"PAYMENT","dbName":null},{"name":"DISPUTE","dbName":null}],"dbName":null},"WalletTransactionType":{"values":[{"name":"DEPOSIT","dbName":null},{"name":"WITHDRAW","dbName":null},{"name":"ESCROW_LOCK","dbName":null},{"name":"ESCROW_PAYOUT","dbName":null},{"name":"ESCROW_REFUND","dbName":null}],"dbName":null},"WalletTransactionStatus":{"values":[{"name":"PENDING","dbName":null},{"name":"SUCCESS","dbName":null},{"name":"FAILED","dbName":null}],"dbName":null},"ProductStatus":{"values":[{"name":"DRAFT","dbName":null},{"name":"ACTIVE","dbName":null},{"name":"INACTIVE","dbName":null}],"dbName":null},"ReservationStatus":{"values":[{"name":"PENDING","dbName":null},{"name":"COMMITTED","dbName":null},{"name":"RELEASED","dbName":null}],"dbName":null},"BidStatus":{"values":[{"name":"ACCEPTED","dbName":null},{"name":"SUPERSEDED","dbName":null},{"name":"WINNING","dbName":null},{"name":"REJECTED","dbName":null}],"dbName":null}},"types":{}}',
);
defineDmmfProperty(exports.Prisma, config.runtimeDataModel);
config.engineWasm = undefined;
config.compilerWasm = undefined;

const { warnEnvConflicts } = require('./runtime/library.js');

warnEnvConflicts({
  rootEnvPath:
    config.relativeEnvPaths.rootEnvPath &&
    path.resolve(config.dirname, config.relativeEnvPaths.rootEnvPath),
  schemaEnvPath:
    config.relativeEnvPaths.schemaEnvPath &&
    path.resolve(config.dirname, config.relativeEnvPaths.schemaEnvPath),
});

const PrismaClient = getPrismaClient(config);
exports.PrismaClient = PrismaClient;
Object.assign(exports, Prisma);

// file annotations for bundling tools to include these files
path.join(__dirname, 'query_engine-windows.dll.node');
path.join(process.cwd(), 'src/generated/client/query_engine-windows.dll.node');
// file annotations for bundling tools to include these files
path.join(__dirname, 'schema.prisma');
path.join(process.cwd(), 'src/generated/client/schema.prisma');
