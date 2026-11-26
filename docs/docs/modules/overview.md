---
title: 17 Backend Modules and AI Chatbot
---

# Backend Modules (`backend/src/modules`)

`AppModule` (`backend/src/app.module.ts`) combines the Core Layer (`PrismaModule`, `RedisModule`, `MailModule`, `StorageModule`) with 17 isolated Domain Modules.

There were ten. One of them, `commerce`, had grown to hold the cart, orders,
escrow, the PayOS integration, the wallet, withdrawals, returns, refunds,
reviews and report moderation — eighteen controllers behind a single name, and
every one of them able to reach every service beside it. It is now eight
modules whose dependencies run one way: `cart` and `orders` depend on
`payments` and `treasury`; nothing depends back. This reference maps every module's controllers, services, and responsibilities directly to the codebase.

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

## 4. `cart` — The Basket

- Controllers: `CartController`
- Services: `CartService`
- Core Capabilities:
  - Persistent 7-day cart, guest cart merge on login, and anti-self-purchase
    enforcement (`CANNOT_PURCHASE_OWN_PRODUCT`).

## 5. `orders` — Checkout, Escrow and the Seller's Order Desk

- Controllers: `OrderController`, `OrderLifecycleController`, `SellerOrdersController`
- Services: `OrderService`, `OrderEscrowService`, `SellerOrdersService`, and the
  `settleOrderPayment` helper that turns a verified transfer into paid orders
- Core Capabilities:
  - Multi-shop checkout with `Idempotency-Key`, supporting `PAYOS` (VietQR +
    HMAC webhook verification), `WALLET` and `COD`.
  - A `PaymentGroup` ties the orders of one checkout to one transfer. Before it
    existed, a basket spanning three shops produced three orders and one PayOS
    code, so two of them could never be paid.
  - `EscrowRecord` holding (`7%` platform fee on `subtotal`), auto-disbursement,
    and dispute freezing. Settlement runs in one transaction under
    `SELECT ... FOR UPDATE`, so a webhook delivered twice credits once.

## 6. `payments` — The PayOS Boundary

- Services: `PayosService`, `PayosOrderCodeService`, `PaymentSandboxService`,
  and the shared settlement types
- Core Capabilities:
  - Creating and verifying PayOS transfers; HMAC signature verification happens
    here once, not in each caller.
  - `PayosOrderCodeService` issues the merchant order code from a PostgreSQL
    sequence. Checkout and wallet top-up each used to build one from a clock
    plus random digits, which collide — and could collide across the two, so a
    top-up could be settled as payment for somebody's order.

## 7. `wallet` — `NEXUS Pay` Balances, Top-Ups and Withdrawals

- Controllers: `WalletController`, `BuyerFinanceController`, `SellerFinanceController`, `PayosWebhookController`
- Services: `WalletDepositService`, `WithdrawalService`, `SellerFinanceService`, `PayosWebhookService`
- Core Capabilities:
  - Balance, ledger and top-up by PayOS transfer.
  - `WithdrawalRequest` management (max 3 pending, held in `lockedBalance`).
  - `PayosWebhookService` verifies a callback once and offers it to the order
    path and then the wallet path, so one endpoint serves both without either
    guessing which record a code belongs to.

## 8. `after-sales` — Cancellation, Returns and Refunds

- Controllers: `AfterSalesController`
- Services: `AfterSalesStoreService`, `OrderCancellationService`, `OrderReturnService`, `RefundService`
- Core Capabilities:
  - Pre-pickup cancellation and 3-day post-delivery returns
    (`AfterSalesRequest`, `OrderRefund`).

## 9. `reviews` — Verified Reviews, Seller Replies and Report Moderation

- Controllers: `ReviewsController`, `PublicReviewsController`, `SellerReviewsController`, `AdminReviewsController`, `SellerEngagementController`, `ReportsController`, `ReportModerationController`
- Services: `ReviewsService`, `SellerEngagementService`, `ReportsService`, `ReportModerationService`
- Core Capabilities:
  - Reviews a delivered order entitles the buyer to write, seller replies, and
    violation report moderation.

## 10. `treasury` — The Platform's Own Money

- Services: `TreasuryService`
- Core Capabilities:
  - The platform's wallets and the fee postings against them. Separate because
    both orders and auctions post to it, and neither should reach into the
    other to do so.

## 11. `commerce-query` — Read-Only Answers for the Assistant

- Services: `CommerceChatQueryService`
- Core Capabilities:
  - The order and shipping questions the chatbot answers. It reads; it is the
    one place allowed to query across these domains, and it writes nothing.

## 12. `auction` — 3D Multi-Lot Auctions and Complaints

- Controllers: `AuctionController`, `AuctionCheckoutController`, `AuctionImageController`
- Gateway: `AuctionGateway` (`/ws/auctions`)
- Services: `AuctionService`, `AuctionLifecycleService`, `AuctionCheckoutService`, `AuctionComplaintService`, `AuctionImageService`
- Core Capabilities:
  - `Auction` sessions and `AuctionItem` lots (with `.glb` 3D models and appraisal certificates) with consignment review.
  - Real-time bidding protected by Redis + PostgreSQL row locks, anti-sniping (+2 min), and read-only enforcement when `isSellerActive = true`.
  - Automated lot settlement, `AuctionAward` (`PRIMARY_WINNER` / `SECOND_CHANCE`), deposit handling, and `AuctionComplaint` mediation.
  - Paying for a won lot. The checkout used to live in `commerce` and reach
    into the auction's own services to do it; it now sits with the auction,
    and borrows `payments` and `treasury` like any other caller.

## 13. `fulfillment` — GHN Express Logistics

- Controllers: `FulfillmentController`, `SellerPickupController`, `GhnWebhookController`
- Services: `FulfillmentService`, `GhnLogisticsService`, `GhnShippingService`, `GhnOrderApiService`, `GhnOrderActionService`, `GhnShopApiService`, `GhnDispatchService`, `RouteDistanceService`, `SellerPickupService`, `ShipmentTrackingService`
- Core Capabilities:
  - Per-environment Seller GHN shop registration (`SellerGhnAccount`), route distance and shipping fee quoting.
  - Forward waybill creation, `SellerPickup` scheduling, GHN cancellation (`/v2/switch-status/cancel`), return waybills (`NX-RETURN-<orderUUID>`), and webhook tracking updates.

## 14. `chat` — Real-Time Chat, Support Queue and AI Chatbot

- Controllers: `ChatController`, `AdminChatController`, `SellerAutoReplyController`, `ChatbotController`
- Gateway: `ChatGateway` (`/ws/chat`)
- Services: `ChatService`, `StaffQueueService`, `ChatAutoReplyService`, `ChatbotService`, `ChatbotAiService`, `ChatbotCommerceService`, `ChatbotRateLimitService`
- Core Capabilities:
  - Real-time Buyer–Seller messaging, `SUPPORT_STAFF` ticket queue, Shop auto-replies, and Admin chat auditing.
  - AI Chatbot (Gemini): Catalog search, route navigation hints, auction eligibility and cart budget checks with rate limiting.

## 15. `notifications` — Multi-Channel Notifications

- Controller: `NotificationsController` | Gateway: `NotificationsGateway` (`/ws/notifications`)
- Service: `NotificationsService`
- Core Capabilities: Persists `Notification`, manages `NotificationPreference`, and pushes real-time alerts automatically via `PrismaService` delegate wrapper and `NotificationRealtimeBus`.

## 16. `admin` — Platform Governance and Oversight

- Controllers: `AdminStaffController`, `AdminUsersController`, `AdminProductsController`, `AdminCategoriesController`, `AdminShopsController`, `AdminFinanceController`, `AdminPlatformController`, `AdminOrdersController`, `AdminReputationController`, `BackofficeDisputesController`
- Services: `AdminService`, `AdminUsersService`, `AdminShopsService`, `AdminProductsService`, `AdminOrdersService`, `AdminDisputesService`, `AdminFinanceService`, `AdminSettingsService`
- Core Capabilities: User governance and locking, Seller approvals, Shop warnings, suspensions, and appeals (`ShopActionLog`, `ShopViolation`), withdrawal approvals, dispute and refund reconciliation, and platform settings.

## 17. `media` — Media and Document Storage

- Controller: `MediaController` | Service: `MediaService`
- Core Capabilities: Uploads product images, avatars, appraisal certificates, and 3D assets to Cloudinary or local `/uploads`.
