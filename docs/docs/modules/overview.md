---
title: 16 Backend Modules and AI Chatbot
---

# Backend Modules (`backend/src/modules`)

`AppModule` (`backend/src/app.module.ts`) combines the Core Layer (`PrismaModule`, `RedisModule`, `AuditModule`, `EventsModule`, `MailModule`, `StorageModule`) with 16 isolated Domain Modules. This reference maps every module's controllers, services, gateways, and responsibilities directly to the codebase.

## 1. `auth`

- Controllers: `AuthController`, `StaffController`
- Services: `AuthService`, `AuthProfileService`, `OAuthCodeService`, `StaffProvisioningService`, `JwtStrategy`, `GoogleStrategy`
- Capabilities: handles registration with 6-digit email OTP verification, bcrypt login, access and refresh token rotation persisted in `RefreshToken`, Google OAuth 2.0 single-use code exchange, password reset OTP flows, and `SUPPORT_STAFF` provisioning via `StaffInvitation`.

## 2. `users`

- Controllers: `UsersController`, `BuyerController`, `SellerController`
- Services: `UsersService`, `AddressService`, `ReputationService`, `ShopShippingProfileService`
- Capabilities: manages user profiles, `UserAddress` records with GHN location codes, shop shipping profiles, `SellerUpgradeRequest` submissions, Buyer and Seller mode switching, and reputation logs (`INITIAL_REPUTATION_SCORE = 50`).

## 3. `catalog`

- Controllers: `CategoryController`, `ProductController`, `RecommendationsController`, `ShopController`, `BannerController`
- Services: `CategoryService`, `ProductService`, `ProductSearchService`, `ProductSaleService`, `ProductTrendingService`, `InventoryService`, `AuctionStockService`, `RecommendationsService`, `ShopService`, `BannerService`, `BannerHistoryService`
- Capabilities: maintains the 3-level `Category` tree, product variants, scheduled sale pricing, multi-warehouse `Inventory`, `InventoryReservation` locks, `InventoryLedger` entries, recommendations, shop storefronts, and `EventBanner` history.

## 4. `cart`

- Controller: `CartController`
- Service: `CartService`
- Capabilities: persists 7-day carts, merges guest carts on login, and enforces anti-self-purchase rules (`CANNOT_PURCHASE_OWN_PRODUCT`).

## 5. `orders`

- Controllers: `OrderController`, `OrderLifecycleController`, `SellerOrdersController`
- Services: `OrderService`, `OrderPaymentHelper`, `OrderPayosService`, `OrderWalletPaymentService`, `OrderEscrowService`, `OrderExpirationService`, `SellerOrdersService`, `OrdersChatFacade`
- Capabilities: orchestrates multi-shop checkout with `Idempotency-Key`, delegates PayOS and `PaymentGroup` flows to `OrderPayosService`, delegates wallet and COD payments to `OrderWalletPaymentService`, manages `EscrowRecord` holds, and runs `OrderExpirationService` sweeps under `DistributedLockService` to cancel overdue `PENDING_PAYMENT` orders and release expired stock reservations.

## 6. `payments`

- Services: `PayosService`, `PayosOrderCodeService`, `PaymentSandboxService`
- Capabilities: creates and verifies PayOS payment links with single-point HMAC checksum verification and issues monotonic PayOS merchant order codes from a PostgreSQL sequence via `PayosOrderCodeService`.

## 7. `wallet`

- Controllers: `WalletController`, `BuyerFinanceController`, `SellerFinanceController`, `PayosWebhookController`
- Services: `WalletDepositService`, `WithdrawalService`, `SellerFinanceService`, `PayosWebhookService`
- Capabilities: manages `NEXUS Pay` wallet balances, PayOS top-ups, `WithdrawalRequest` locks, and unified PayOS webhook routing across orders and wallet deposits.

## 8. `after-sales`

- Controller: `AfterSalesController`
- Services: `AfterSalesStoreService`, `OrderCancellationService`, `OrderReturnService`, `RefundService`
- Capabilities: executes pre-pickup cancellations, 3-day post-delivery returns (`AfterSalesRequest`), and `OrderRefund` ledger entries.

## 9. `reviews`

- Controllers: `ReviewsController`, `PublicReviewsController`, `SellerReviewsController`, `AdminReviewsController`, `SellerEngagementController`, `ReportsController`, `ReportModerationController`
- Services: `ReviewsService`, `ReviewsMediaHelper`, `ReviewsModerationHelper`, `ReviewsRepliesHelper`, `SellerEngagementService`, `ReportsService`, `ReportModerationService`
- Capabilities: validates verified purchase reviews, media attachments, seller replies, and flagged report moderation.

## 10. `treasury`

- Service: `TreasuryService`
- Capabilities: isolates `ESCROW_LIABILITY` and `PLATFORM_REVENUE` system wallets from personal administrator accounts.

## 11. `auction`

- Controllers: `AuctionController`, `AuctionCheckoutController`, `AuctionImageController`
- Gateway: `AuctionGateway` (`/ws/auctions`)
- Services: `AuctionService`, `AuctionAdminHelper`, `AuctionBiddingHelper`, `AuctionConsignmentHelper`, `AuctionLifecycleService`, `AuctionCheckoutService`, `AuctionSecondChanceHelper`, `AuctionDefaultService`, `AuctionComplaintService`, `AuctionImageService`
- Capabilities: runs live 3D multi-lot auctions with Zod-validated WebSocket handlers, Redis and PostgreSQL row locks, anti-sniping extensions, consignment reviews, `SECOND_CHANCE` buyer offers, default forfeiture cascades in `AuctionDefaultService`, and `AuctionComplaint` handling.

## 12. `fulfillment`

- Controllers: `FulfillmentController`, `SellerPickupController`, `GhnWebhookController`
- Services: `FulfillmentService`, `GhnLogisticsService`, `GhnShippingService`, `GhnOrderApiService`, `GhnOrderActionService`, `GhnShopApiService`, `GhnDispatchService`, `RouteDistanceService`, `SellerPickupService`, `ShipmentTrackingService`
- Capabilities: manages Seller GHN shop registration (`SellerGhnAccount`), route distance shipping quotes, forward and return waybills, pickup scheduling, and GHN tracking webhook synchronization.

## 13. `chat`

- Controllers: `ChatController`, `AdminChatController`, `SellerAutoReplyController`, `ChatbotController`
- Gateway: `ChatGateway` (`/ws/chat`)
- Services: `ChatService`, `ChatSupportService`, `ChatPresenceService`, `ChatRealtimePublisher`, `StaffQueueService`, `ChatAutoReplyService`, `ChatbotService`, `ChatbotAiService`, `ChatbotCommerceService`, `ChatbotRateLimitService`
- Capabilities: separates direct messaging (`ChatService`) from support queue triage and dispute tickets (`ChatSupportService`), enforces `SUPPORT_STAFF` access boundaries and Zod-validated socket events, and runs the rate-limited Gemini shopping assistant.

## 14. `notifications`

- Controller: `NotificationsController`
- Gateway: `NotificationsGateway` (`/ws/notifications`)
- Service: `NotificationsService`
- Capabilities: stores `Notification` and `NotificationPreference` rows and receives post-commit real-time alerts from explicit `NotificationPublisher` calls.

## 15. `admin`

- Controllers: `AdminStaffController`, `AdminUsersController`, `AdminProductsController`, `AdminCategoriesController`, `AdminShopsController`, `AdminFinanceController`, `AdminPlatformController`, `AdminOrdersController`, `AdminReputationController`, `BackofficeDisputesController`
- Services: `AdminService`, `AdminUsersService`, `AdminShopsService`, `AdminShopsModerationHelper`, `AdminProductsService`, `AdminOrdersService`, `AdminDisputesService`, `AdminFinanceService`, `AdminSettingsService`
- Capabilities: governs platform users, seller upgrades, shop suspensions and appeals, product and category administration, withdrawals, disputes, and `AuditLogService` action logging.

## 16. `media`

- Controller: `MediaController`
- Service: `MediaService`
- Capabilities: validates magic-byte file types and uploads product images, avatars, appraisal certificates, and 3D assets to Cloudinary or local `/uploads` storage.
