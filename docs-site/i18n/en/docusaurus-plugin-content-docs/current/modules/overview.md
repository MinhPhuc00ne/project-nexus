---
title: 10 Domain Modules Overview
---

# Backend Modules (`backend/src/modules`)

NestJS `AppModule` wires the Core Layer with **10 Domain Modules**:

1. **`auth`**: Registration, login, email OTP, Google OAuth 2.0, JWT + Refresh Tokens, `SUPPORT_STAFF` provisioning.
2. **`users`**: User profile, address book, NEXUS Pay wallet & withdrawals, seller upgrades, Buyer/Seller mode toggle, reputation.
3. **`catalog`**: 3-level categories, products & options (`ProductOption`), sale pricing, multi-warehouse inventory (`Inventory`, `InventoryReservation`, `InventoryLedger`), recommendations, shops, `EventBanner`.
4. **`commerce`**: Shopping cart, orders & payments (`PAYOS`, `WALLET`, `COD`), auction checkout, Escrow, cancellations/returns/refunds (`AfterSalesRequest`, `OrderRefund`), reviews & report moderation.
5. **`auction`**: Auction sessions & lots (`Auction`, `AuctionItem`), real-time bidding (`AuctionGateway`), lifecycle & awards (`AuctionAward`), auction complaints (`AuctionComplaint`).
6. **`fulfillment`**: GHN Express integration (fee quotes, `SellerGhnAccount`, waybill creation, pickup, tracking webhooks).
7. **`chat`**: Buyer–Seller live chat, Staff support queue (`StaffQueueService`), shop auto-replies, and AI shopping Chatbot.
8. **`notifications`**: Notification persistence, preferences, and real-time delivery over `/ws/notifications`.
9. **`admin`**: Backoffice administration for users, shops, products, orders, finance/withdrawals, disputes, and settings.
10. **`media`**: Media upload and storage management (local static & Cloudinary).
