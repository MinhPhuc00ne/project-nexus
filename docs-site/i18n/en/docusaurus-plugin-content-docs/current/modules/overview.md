---
title: 10 Backend Modules & AI Chatbot
---

# Backend Modules (`backend/src/modules`)

NestJS `AppModule` integrates the Core Layer (`prisma`, `redis`, `mail`, `storage`, `security`, `moderation`, `exceptions/filters/interceptors`) with **10 Domain Modules**:

1. **`auth`**: Registration, Bcrypt login, 6-digit email OTP, `RefreshToken` rotation, Google OAuth 2.0, and `SUPPORT_STAFF` (`@staff.com`) provisioning.
2. **`users`**: Profiles, `UserAddress` book, `ShopShippingProfileModule`, `NEXUS Pay` wallet & withdrawals (max 3 pending, `lockedBalance`), seller upgrades, Buyer/Seller mode toggle, and reputation (`50 / PROBATION`).
3. **`catalog`**: 3-level `Category` tree, `Product` & `ProductOption`, timed `salePrice`, multi-warehouse `Inventory` / `InventoryReservation` / `InventoryLedger`, personalized recommendations, shops, and `EventBanner` + `BannerDisableHistory`.
4. **`commerce`**: TTL-7d cart with anti-self-purchase (`CANNOT_PURCHASE_OWN_PRODUCT`), `PAYOS` / `WALLET` / `COD` payments with `Idempotency-Key`, `EscrowRecord` (7% fee), `AfterSalesRequest` & `OrderRefund`, reviews, and report moderation.
5. **`auction`**: `Auction` sessions & `AuctionItem` lots with appraisal certificates, `AuctionGateway` real-time bidding, +2m anti-sniping, `AuctionLifecycleService`, `AuctionAward` (`PRIMARY_WINNER` / `SECOND_CHANCE`), and `AuctionComplaint`.
6. **`fulfillment`**: GHN Express integration (`SellerGhnAccount`, fee quotes, route distance, waybills, pickup, tracking webhooks).
7. **`chat`**: Buyer–Seller chat (`ChatGateway`), Staff queue (`StaffQueueService`), shop auto-replies (`ChatAutoReply`), and **AI Chatbot** (catalog search, route navigation, auction eligibility, and cart budget checks).
8. **`notifications`**: `Notification` persistence, `NotificationPreference`, and real-time push via `/ws/notifications`.
9. **`admin`**: Backoffice management for users, seller KYC, shops (`ShopActionLog`, `ShopViolation`), products, orders, finance, disputes, and platform settings.
10. **`media`**: Local static (`/uploads`) and Cloudinary media uploads.
