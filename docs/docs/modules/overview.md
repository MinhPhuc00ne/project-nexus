---
title: 10 Backend Modules and AI Chatbot
---

# Backend Modules (`backend/src/modules`)

`AppModule` (`backend/src/app.module.ts`) combines the Core Layer (`PrismaModule`, `RedisModule`, `MailModule`, `StorageModule`) with 10 isolated Domain Modules. This reference maps every module's controllers, services, and responsibilities directly to the codebase.

## 1. `auth` — Authentication, OTP and Staff Provisioning

- Controllers: `AuthController`, `StaffController`
- Services: `AuthService`, `AuthProfileService`, `StaffProvisioningService`, `JwtStrategy`, `GoogleStrategy`
- Core Capabilities:
  - User registration with 6-digit email OTP verification (`MailService`).
  - Bcrypt login, Access Token (7d) and Refresh Token (30d) rotation and revocation persisted in `RefreshToken`.
  - Google OAuth 2.0 (`GoogleStrategy`).
  - Password change OTP confirmation, forgot and reset password flows.
  - `SUPPORT_STAFF` (`@staff.com`) provisioning and activation via `StaffInvitation` token + OTP sent to `personalEmail`.

## 2. `users` — Profiles, `NEXUS Pay` Wallet, Addresses and Reputation

- Controllers: `UsersController`, `BuyerController`, `SellerController`
- Services: `UsersService`, `AddressService`, `ReputationService` (`ReputationModule`), `ShopShippingProfileService` (`ShopShippingProfileModule`)
- Core Capabilities:
  - Profile management, `UserAddress` book (with GHN Province, District, and Ward codes), and Shop shipping profiles.
  - `SellerUpgradeRequest` submission and direct Buyer and Seller mode switching without re-login (`/api/v1/users/toggle-seller`).
  - Reputation scoring and audit trail (`INITIAL_REPUTATION_SCORE = 50`, `ReputationLog`, `ReputationTrustLevel`).

## 3. `catalog` — 3-Level Categories, Products, Inventory and Banners

- Controllers: `CategoryController`, `ProductController`, `RecommendationsController`, `ShopController`, `BannerController`
- Services: `CategoryService`, `ProductService`, `ProductSearchService`, `ProductSaleService`, `InventoryService`, `AuctionStockService`, `RecommendationsService`, `ShopService`, `BannerService`, `BannerHistoryService`
- Core Capabilities:
  - 3-level `Category` tree with cycle and depth validation.
  - Product and `ProductOption` variant management, time-boxed `salePrice` (`saleStartsAt`, `saleEndsAt`).
  - Multi-warehouse `Inventory`, checkout `InventoryReservation`, and immutable `InventoryLedger`.
  - Personalized recommendations, public Shop storefronts, and `EventBanner` with `BannerDisableHistory`.

## 4. `commerce` — Cart, Orders, Escrow, Payments and After-Sales

- Controllers: `CartController`, `OrderController`, `OrderLifecycleController`, `AuctionCheckoutController`, `PayosWebhookController`, `WalletController`, `AfterSalesController`, `SellerOrdersController`, `SellerFinanceController`, `BuyerFinanceController`, `SellerEngagementController`, `ReviewsController`, `PublicReviewsController`, `SellerReviewsController`, `AdminReviewsController`, `ReportsController`, `ReportModerationController`
- Services: `CartService`, `OrderService`, `OrderEscrowService`, `OrderCancellationService`, `OrderReturnService`, `RefundService`, `PayosService`, `AuctionCheckoutService`, `SellerOrdersService`, `SellerFinanceService`, `SellerEngagementService`, `ReviewsService`, `ReportsService`, `ReportModerationService`, `CommerceChatQueryService`
- Core Capabilities:
  - Persistent 7-day cart, guest cart merge on login, and anti-self-purchase enforcement (`CANNOT_PURCHASE_OWN_PRODUCT`).
  - Multi-shop checkout with `Idempotency-Key`, supporting `PAYOS` (VietQR + HMAC webhook verification), `WALLET`, and `COD`.
  - `EscrowRecord` holding (`7%` platform fee on `subtotal`), auto-disbursement, and dispute freezing.
  - Pre-pickup cancellation, 3-day post-delivery returns (`AfterSalesRequest`, `OrderRefund`), verified reviews, and violation report moderation.
  - `WithdrawalRequest` management (max 3 pending, locked in `lockedBalance`).

## 5. `auction` — 3D Multi-Lot Auctions and Complaints

- Controllers: `AuctionController`, `AuctionImageController`
- Gateway: `AuctionGateway` (`/ws/auctions`)
- Services: `AuctionService`, `AuctionLifecycleService`, `AuctionComplaintService`, `AuctionImageService`
- Core Capabilities:
  - `Auction` sessions and `AuctionItem` lots (with `.glb` 3D models and appraisal certificates) with consignment review.
  - Real-time bidding protected by Redis + PostgreSQL row locks, anti-sniping (+2 min), and read-only enforcement when `isSellerActive = true`.
  - Automated lot settlement, `AuctionAward` (`PRIMARY_WINNER` / `SECOND_CHANCE`), deposit handling, and `AuctionComplaint` mediation.

## 6. `fulfillment` — GHN Express Logistics

- Controllers: `FulfillmentController`, `SellerPickupController`, `GhnWebhookController`
- Services: `FulfillmentService`, `GhnLogisticsService`, `GhnShippingService`, `GhnOrderApiService`, `GhnOrderActionService`, `GhnShopApiService`, `GhnDispatchService`, `RouteDistanceService`, `SellerPickupService`, `ShipmentTrackingService`
- Core Capabilities:
  - Per-environment Seller GHN shop registration (`SellerGhnAccount`), route distance and shipping fee quoting.
  - Forward waybill creation, `SellerPickup` scheduling, GHN cancellation (`/v2/switch-status/cancel`), return waybills (`NX-RETURN-<orderUUID>`), and webhook tracking updates.

## 7. `chat` — Real-Time Chat, Support Queue and AI Chatbot

- Controllers: `ChatController`, `AdminChatController`, `SellerAutoReplyController`, `ChatbotController`
- Gateway: `ChatGateway` (`/ws/chat`)
- Services: `ChatService`, `StaffQueueService`, `ChatAutoReplyService`, `ChatbotService`, `ChatbotAiService`, `ChatbotCommerceService`, `ChatbotRateLimitService`
- Core Capabilities:
  - Real-time Buyer–Seller messaging, `SUPPORT_STAFF` ticket queue, Shop auto-replies, and Admin chat auditing.
  - AI Chatbot (Gemini): Catalog search, route navigation hints, auction eligibility and cart budget checks with rate limiting.

## 8. `notifications` — Multi-Channel Notifications

- Controller: `NotificationsController` | Gateway: `NotificationsGateway` (`/ws/notifications`)
- Service: `NotificationsService`
- Core Capabilities: Persists `Notification`, manages `NotificationPreference`, and pushes real-time alerts automatically via `PrismaService` delegate wrapper and `NotificationRealtimeBus`.

## 9. `admin` — Platform Governance and Oversight

- Controllers: `AdminStaffController`, `AdminUsersController`, `AdminProductsController`, `AdminCategoriesController`, `AdminShopsController`, `AdminFinanceController`, `AdminPlatformController`, `AdminOrdersController`, `AdminReputationController`, `BackofficeDisputesController`
- Services: `AdminService`, `AdminUsersService`, `AdminShopsService`, `AdminProductsService`, `AdminOrdersService`, `AdminDisputesService`, `AdminFinanceService`, `AdminSettingsService`
- Core Capabilities: User governance and locking, Seller approvals, Shop warnings, suspensions, and appeals (`ShopActionLog`, `ShopViolation`), withdrawal approvals, dispute and refund reconciliation, and platform settings.

## 10. `media` — Media and Document Storage

- Controller: `MediaController` | Service: `MediaService`
- Core Capabilities: Uploads product images, avatars, appraisal certificates, and 3D assets to Cloudinary or local `/uploads`.
