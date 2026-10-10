Object.defineProperty(exports, '__esModule', { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip,
} = require('./runtime/index-browser.js');

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

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.Decimal = Decimal;

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.validator = Public.validator;

/**
 * Extensions
 */
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`);
};

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

exports.ReputationTrustLevel = exports.$Enums.ReputationTrustLevel = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  STANDARD: 'STANDARD',
  PROBATION: 'PROBATION',
  SUSPENDED: 'SUSPENDED',
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

exports.PenaltyType = exports.$Enums.PenaltyType = {
  PAYMENT_TIMEOUT: 'PAYMENT_TIMEOUT',
  ORDER_CANCELLATION: 'ORDER_CANCELLATION',
  AUCTION_DEFAULT: 'AUCTION_DEFAULT',
  MISREPRESENTATION: 'MISREPRESENTATION',
  FRAUD: 'FRAUD',
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

exports.BidStatus = exports.$Enums.BidStatus = {
  ACCEPTED: 'ACCEPTED',
  SUPERSEDED: 'SUPERSEDED',
  WINNING: 'WINNING',
  REJECTED: 'REJECTED',
};

exports.EscrowStatus = exports.$Enums.EscrowStatus = {
  HELD: 'HELD',
  DISBURSED: 'DISBURSED',
  REFUNDED: 'REFUNDED',
  DISPUTED: 'DISPUTED',
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

exports.DisputeStatus = exports.$Enums.DisputeStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED_SELLER_FAVOR: 'RESOLVED_SELLER_FAVOR',
  RESOLVED_BUYER_FAVOR: 'RESOLVED_BUYER_FAVOR',
  CANCELLED: 'CANCELLED',
};

exports.NotificationType = exports.$Enums.NotificationType = {
  ORDER: 'ORDER',
  AUCTION: 'AUCTION',
  SYSTEM: 'SYSTEM',
  PAYMENT: 'PAYMENT',
  DISPUTE: 'DISPUTE',
};

exports.NotificationChannel = exports.$Enums.NotificationChannel = {
  EMAIL: 'EMAIL',
  PUSH: 'PUSH',
  IN_APP: 'IN_APP',
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
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message;
        const runtime = getRuntime();
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message =
            'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' +
            runtime.prettyName +
            '`).';
        }

        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`;

        throw new Error(message);
      },
    });
  }
}

exports.PrismaClient = PrismaClient;

Object.assign(exports, Prisma);
