# Project Nexus - Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose

This document defines the comprehensive functional and non-functional requirements for Project Nexus, an e-commerce marketplace platform that seamlessly integrates traditional online retail with real-time 3D live auctions. This specification serves as the primary source of truth for engineering, quality assurance, project management, and stakeholders.

### 1.2 Scope of Project

Project Nexus connects Sellers with Buyers, facilitating the transaction of a diverse range of goods under strict escrow protection, dynamic reputation scoring, and interactive 3D WebGL showcases.

In-Scope Features:

- Unified identity and access management with seamless Buyer and Seller role toggling within a single session.
- Dynamic user reputation scoring, trust-level enforcement, and violation penalty algorithms.
- Full catalog management supporting hierarchical categories up to 3 levels and 3D asset metadata.
- End-to-end e-commerce flow: active cart management, checkout with price revalidation, and official payment providers (PayOS, Wallet, and COD).
- Real-time 3D WebGL auction engine featuring atomic bidding queues, anti-sniping duration extensions, and automated settlement.
- Fulfillment engine managing SKU-level inventory across warehouses, immutable inventory ledgers, and logistics orchestration via carrier adapter (GHN).
- Escrow protection holding buyer funds upon order placement and releasing payouts (minus a 7% platform fee) upon delivery confirmation.
- Centralized event log tracking, broker health monitoring, and multi-channel notifications (Email, Push, In-App).

Out-of-Scope (Phase 1):

- In-house physical delivery fleet (relies strictly on third-party logistics APIs).
- Internal corporate ERP and HR systems.
- Dedicated native mobile applications (Phase 1 focuses on responsive Web and Admin portals).

---

## 2. Overall Description

### 2.1 Product Perspective and Architecture

Project Nexus is architected as a Modular Monolith deployed within a unified Node.js and NestJS runtime. Domain modules maintain encapsulated boundaries with logical database separation on PostgreSQL 17 and communicate in-process via `@nestjs/event-emitter`. High-concurrency live bidding and caching rely on Redis 7 (Redlock, atomic queues, Pub/Sub).

### 2.2 System Actors

| Actor            | Description                                                                                                                                          |
| :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest            | Unregistered visitor who can browse catalogs, view live auctions, and maintain a transient shopping cart.                                            |
| Buyer            | Authenticated consumer who can search products, manage carts, checkout orders, place auction bids, and rate sellers.                                 |
| Seller           | Authenticated merchant (mode-toggled from Buyer) who creates product listings, manages inventory, submits items for auction, and fulfills shipments. |
| Support Staff    | Platform moderator who handles dispute arbitration, shipment tracking anomalies, refund approvals, and operational health monitoring.                |
| Administrator    | Superuser responsible for platform governance, category hierarchies, system configuration, staff provisioning, and revenue audit.                    |
| External Systems | Third-party services including Payment Gateways (PayOS, Wallet, COD) and Shipping Carrier (GHN).                                                     |

---

## 3. System Configurations

The platform behavior is governed by centralized system configurations:

| Configuration Key                | Description                                                  | Default Value             |
| :------------------------------- | :----------------------------------------------------------- | :------------------------ |
| `SYSTEM_ENV`                     | Environment mode (`DEV`, `STAGING`, `PROD`)                  | `DEV`                     |
| `SESSION_TIMEOUT_MINUTES`        | User inactivity session timeout                              | `30`                      |
| `ACCESS_TOKEN_EXPIRY_MINUTES`    | JWT access token validity                                    | `60`                      |
| `MAX_LOGIN_ATTEMPTS`             | Maximum consecutive failed logins before temporary lockout   | `5`                       |
| `PRODUCT_STATUSES`               | Permitted product listing lifecycle states                   | `DRAFT, ACTIVE, INACTIVE` |
| `MAX_PRODUCT_IMAGES`             | Maximum allowed gallery images per product                   | `5`                       |
| `CATEGORY_MAX_LEVEL`             | Maximum hierarchical category depth                          | `3`                       |
| `MAX_ACTIVE_CART_PER_USER`       | Maximum concurrent active carts per user                     | `1`                       |
| `CART_EXPIRATION_DAYS`           | Inactive shopping cart expiration window                     | `7`                       |
| `CHECKOUT_TIMEOUT_MINUTES`       | Reserved order checkout timeout window                       | `15`                      |
| `ORDER_IDEMPOTENCY_ENABLED`      | Enforce idempotency keys on payment and order creation       | `true`                    |
| `AUCTION_MIN_DURATION_MINUTES`   | Minimum permitted auction window                             | `60`                      |
| `AUCTION_MAX_DURATION_HOURS`     | Maximum permitted auction window                             | `168` (7 days)            |
| `DEFAULT_BID_INCREMENT`          | Default bid step increment                                   | `10.0`                    |
| `ANTI_SNIPING_TRIGGER_MINUTES`   | Threshold near auction close triggering extension            | `2`                       |
| `ANTI_SNIPING_EXTENSION_MINUTES` | Duration added when bid placed in trigger window             | `2`                       |
| `AUCTION_PAYMENT_DEADLINE_HOURS` | Winner checkout window before payment default                | `24`                      |
| `PAYMENT_TIMEOUT_PENALTY_SCORE`  | Reputation points deducted for payment default               | `10`                      |
| `INITIAL_REPUTATION_SCORE`       | Starting reputation score for newly registered users         | `100`                     |
| `MIN_REPUTATION_TO_BID`          | Minimum reputation score required to place auction bids      | `40`                      |
| `MIN_REPUTATION_TO_SELL`         | Minimum reputation score required to create auction listings | `50`                      |
| `PLATFORM_FEE_PERCENTAGE`        | Platform escrow commission deducted upon release             | `7.0%`                    |
| `DEFAULT_WAREHOUSE_ID`           | Default fulfillment warehouse identifier                     | `WH_001`                  |
| `INVENTORY_RESERVATION_TIMEOUT`  | Inventory reservation lock timeout in checkout               | `30 minutes`              |
| `SUPPORTED_CARRIERS`             | Integrated logistics carrier adapters                        | `GHN`                     |
| `DEFAULT_CARRIER`                | Default carrier for shipping calculations                    | `GHN`                     |
| `SHIPPING_API_TIMEOUT_MS`        | External logistics API call timeout                          | `3000 ms`                 |
| `NOTIFICATION_RETRY_LIMIT`       | Maximum delivery retry attempts for transient failures       | `3`                       |

---

## 4. Role-Based Access Control (RBAC) Privileges Matrix

| Privilege Identifier         | Description                                                 | Admin | Support Staff | Seller | Buyer |
| :--------------------------- | :---------------------------------------------------------- | :---: | :-----------: | :----: | :---: |
| `AUTH.LOGIN` / `AUTH.LOGOUT` | System authentication and session termination               |   X   |       X       |   X    |   X   |
| `PROFILE.VIEW` / `UPDATE`    | Manage personal profile and credentials                     |   X   |       X       |   X    |   X   |
| `USER.MANAGE`                | Create, list, update, and soft-delete user accounts         |   X   |       X       |   -    |   -   |
| `USER.REPUTATION.ADJUST`     | Manually inspect and adjust user reputation scores          |   X   |       -       |   -    |   -   |
| `ROLE.MANAGE`                | Create and configure RBAC roles and permissions             |   X   |       -       |   -    |   -   |
| `PRODUCT.CREATE` / `UPDATE`  | Create and maintain product listings and images             |   X   |       -       |   X    |   -   |
| `PRODUCT.VIEW` / `SEARCH`    | Browse, discover, filter, and view product details          |   X   |       X       |   X    |   X   |
| `CATEGORY.MANAGE`            | Create, update, reorder, and delete categories              |   X   |       -       |   -    |   -   |
| `CART.MANAGE`                | Add, update quantities, remove items, and clear cart        |   -   |       -       |   -    |   X   |
| `CHECKOUT.START`             | Initiate checkout with price revalidation                   |   -   |       -       |   -    |   X   |
| `ORDER.CREATE`               | Finalize checkout and create pending orders                 |   -   |       -       |   -    |   X   |
| `ORDER.VIEW_OWN`             | View personal order history and tracking status             |   -   |       -       |   X    |   X   |
| `ORDER.MANAGE_ALL`           | Inspect all platform orders, resolve exceptions             |   X   |       X       |   -    |   -   |
| `ORDER.REFUND`               | Request refund (Buyer) / Process refund (Staff)             |   X   |       X       |   -    |   X   |
| `AUCTION.CREATE` / `UPDATE`  | Schedule and configure auction listing parameters           |   X   |       -       |   X    |   -   |
| `AUCTION.VIEW` / `LIST`      | Browse active/scheduled auctions and 3D showcases           |   X   |       X       |   X    |   X   |
| `AUCTION.BID`                | Submit real-time bids within active auction rooms           |   -   |       -       |   -    |   X   |
| `AUCTION.CANCEL`             | Cancel scheduled auction (Seller before start / Admin)      |   X   |       -       |   X    |   -   |
| `SHIPPING.QUOTE`             | Request dynamic shipping rates based on weight and distance |   X   |       X       |   X    |   X   |
| `SHIPPING.CREATE_SHIPMENT`   | Generate carrier waybill and tracking number                |   X   |       X       |   X    |   -   |
| `SHIPPING.UPDATE_STATUS`     | Process carrier webhooks or manual status overrides         |   X   |       X       |   -    |   -   |
| `DISPUTE.OPEN`               | File dispute against order escrow release                   |   -   |       -       |   -    |   X   |
| `DISPUTE.ARBITRATE`          | Adjudicate dispute (release to seller or refund buyer)      |   X   |       X       |   -    |   -   |
| `REPUTATION.RATE`            | Submit 2-way post-transaction rating and review             |   -   |       -       |   X    |   X   |
| `SYSTEM.CONFIG.MANAGE`       | Inspect and update runtime platform configurations          |   X   |       -       |   -    |   -   |
| `SYSTEM.HEALTH.VIEW`         | Monitor Redis, PostgreSQL, and carrier connectivity         |   X   |       X       |   -    |   -   |
| `EVENT_LOG.VIEW`             | Inspect immutable audit logs of published domain events     |   X   |       X       |   -    |   -   |

---

## 5. Domain Event Message Registry

Project Nexus utilizes a decoupled, in-process event-driven model:

| Event Identifier               | Publishing Domain | Trigger Condition and Description                                   |
| :----------------------------- | :---------------- | :------------------------------------------------------------------ |
| `UserRegistered`               | `auth`            | User account successfully created and verified                      |
| `UserLoggedIn` / `LoggedOut`   | `auth`            | User session initiated or terminated                                |
| `ReputationScoreUpdated`       | `users`           | Dynamic reputation score recalculated based on activity and rating  |
| `ReputationPenaltyApplied`     | `users`           | Violation penalty assessed (timeout, default, fraud)                |
| `ProductCreated` / `Updated`   | `catalog`         | Product listing or 3D asset metadata modified                       |
| `ProductStatusChanged`         | `catalog`         | Product transitioned between Draft, Active, or Archived             |
| `CategoryCreated` / `Updated`  | `catalog`         | Category hierarchy modified                                         |
| `CartItemAdded` / `Updated`    | `commerce`        | Shopping cart modified by customer                                  |
| `CartExpired`                  | `commerce`        | Inactive shopping cart TTL expired                                  |
| `CheckoutStarted`              | `commerce`        | Checkout process started, inventory reservation requested           |
| `OrderCreated`                 | `commerce`        | Order created; triggers inventory lock and escrow hold              |
| `OrderPaid`                    | `commerce`        | Payment confirmed by gateway callback; locks escrow funds           |
| `OrderPaymentFailed`           | `commerce`        | Gateway payment failed or timed out; releases reserved inventory    |
| `OrderCancelled`               | `commerce`        | Order cancelled prior to shipment; initiates refund                 |
| `OrderCompleted`               | `commerce`        | Buyer confirmed delivery; triggers escrow fund release              |
| `AuctionCreated` / `Scheduled` | `auction`         | Auction listing configured; reserves product inventory              |
| `AuctionStarted`               | `auction`         | Auction window opened; room accepting real-time bids                |
| `BidPlaced`                    | `auction`         | Valid bid committed; deducts wallet and updates highest bid         |
| `Outbid`                       | `auction`         | Previous highest bidder superseded; triggers instant refund         |
| `AuctionTimeExtended`          | `auction`         | Anti-sniping triggered; auction end time extended by 2 minutes      |
| `AuctionEnded`                 | `auction`         | Auction clock expired; room locked against new bids                 |
| `AuctionWon`                   | `auction`         | Winning bid determined; triggers order generation in Commerce       |
| `AuctionFailed`                | `auction`         | Auction closed without meeting reserve or with zero bids            |
| `AuctionPaymentTimeout`        | `auction`         | Winner failed to complete payment within 24 hours; assesses penalty |
| `InventoryReserved`            | `fulfillment`     | Stock reserved for checkout or scheduled auction                    |
| `InventoryReleased`            | `fulfillment`     | Reserved stock released back to available inventory                 |
| `InventoryCommitted`           | `fulfillment`     | Stock permanently deducted upon shipment dispatch                   |
| `ShipmentCreated`              | `fulfillment`     | Carrier waybill generated with tracking number                      |
| `ShipmentInTransit`            | `fulfillment`     | Carrier confirmed package pickup                                    |
| `ShipmentDelivered`            | `fulfillment`     | Package delivered; opens confirmation and dispute window            |
| `EscrowHeld`                   | `fulfillment`     | Buyer funds locked in platform escrow                               |
| `EscrowDisbursed`              | `fulfillment`     | Escrow funds transferred to seller wallet minus 7% fee              |
| `EscrowRefunded`               | `fulfillment`     | Escrow funds returned to buyer wallet following dispute             |
| `DisputeOpened`                | `backoffice`      | Buyer flagged order defect; halts automated escrow release          |
| `DisputeResolved`              | `backoffice`      | Support staff concluded arbitration                                 |
| `NotificationCreated`          | `notification`    | Notification record queued for dispatch                             |
| `NotificationSent`             | `notification`    | Notification delivered via Email, Push, or In-App                   |

---

## 6. Functional Requirements by Domain

### 6.1 Identity, Access, and Reputation Management

1. Unified Authentication and Session:
   - Stateless authentication powered by JWT access tokens (60 minutes) and rotating refresh tokens (30 days).
   - Seamless role switching: Authenticated users toggle between Buyer and Seller modes instantly via client interface without re-authenticating.
2. Wallet Management:
   - Every registered user possesses an attached platform wallet tracking balances to 2 decimal places.
   - Atomic deposits, withdrawals, and balance deduction locks.
   - Withdrawal requests prioritize default banking information from user profile (fallback to manual entry).
   - Disbursement window: 3 to 7 business days with automated notifications upon receipt, approval, and rejection.
3. Reputation Scoring and Trust Levels:
   - Users initialize with a baseline score of 100 points.
   - Scores are dynamically recalculated based on:
     - Positive transaction completions (+2 points).
     - 2-way star ratings and reviews post-order.
     - Unwarranted cancellations or payment defaults (-10 points).
   - Trust levels (EXCELLENT, GOOD, STANDARD, PROBATION, SUSPENDED) govern access:
     - Bidding requires a minimum score of 40.
     - Creating auction listings requires a minimum score of 50.

### 6.2 Notification and Audit Logging

1. Automated Event Log Capture:
   - Every published domain event is captured asynchronously and recorded into an immutable `event_logs` table containing timestamp, event identifier, JSON payload, and actor/trace metadata.
2. Multi-Channel Dispatch:
   - Supports Email (transactional summaries, invoices) and Push/In-App (real-time outbid alerts, order status changes).
   - User notification preferences allow toggling non-essential channels; transactional notifications (orders, payments) are mandatory.
3. Resilience and Retry:
   - Failed delivery attempts are retried up to 3 times with exponential backoff before being flagged as unrecoverable.

### 6.3 Catalog and 3D Showcase

1. Product Management:
   - Full CRUD lifecycle for products with title, description, base price, dimensions, and image gallery (up to 5 images).
   - Hierarchical category classification up to 3 levels deep (for example, Electronics to Computers to Laptops).
2. 3D Asset Association:
   - Listings can be associated with recognized 3D model keys (such as `car`, `watch`, `painting`).
   - For unmatched listings, the system assigns a generic 3D exhibition pedestal (`fallback-pedestal.glb`) that maps the seller's 2D product photos as dynamic textures.
3. Search and Discovery:
   - Keyword search, category filtering, price range sorting, and pagination.

### 6.4 Commerce and Checkout

1. Shopping Cart Lifecycle:
   - Single active cart per user with automatic expiration after 7 days of inactivity.
   - Price revalidation: Cart recalculates current item prices, available stock, and shipping quotes during checkout initialization.
   - Anti-Self-Purchase Constraint: An authenticated user acting as a Buyer is strictly prohibited from adding to cart or purchasing items created by their own merchant profile where `product.sellerId === buyer.id`. Backend validation rejects such operations with a 400 Bad Request error (`CANNOT_PURCHASE_OWN_PRODUCT`) to eliminate wash trading, self-review manipulation, and fraudulent reputation farming (+2 points per completed order).
2. Checkout and Idempotent Payments:
   - Multi-step checkout requiring valid delivery address and selected payment method.
   - Strategy Pattern integration:
     - PayOS: Domestic Vietnamese banking with dynamic VietQR generation and webhook signature verification.
     - COD: Cash on delivery with physical settlement upon delivery.
     - Wallet: Instant in-platform wallet settlement.
   - Enforces unique idempotency keys on checkout submissions to eliminate duplicate charges.
3. Order Lifecycle and Invoicing:
   - Orders transition strictly through validated states: `PENDING_PAYMENT` to `PAID` to `PREPARING` to `SHIPPING` to `DELIVERED` to `CONFIRMED` (or `CANCELLED`/`REFUNDED`).
   - Automated electronic receipt generation upon payment confirmation.

### 6.5 Real-Time 3D Live Auction Engine

1. Auction Lifecycle:
   - Transitions: `SCHEDULED` to `ACTIVE` to `EXTENDED` to `ENDED` to `SETTLED` (or `CANCELLED`).
   - Configuration (starting price, bid increment, schedule) is strictly locked once the auction opens.
2. Atomic High-Concurrency Bidding:
   - Low-latency WebSocket bidding gateway at `/ws/auctions`.
   - Concurrency control: Utilizes PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) and Redis distributed locks (`Redlock`) to serialize concurrent bids on a single auction item.
   - Wallet deduction: Accepting a new highest bid atomically deducts the bid amount from the new bidder's wallet and immediately refunds the superseded bidder in full.
   - Anti-Shill Bidding Enforcement: A seller is strictly prohibited from placing bids on auction rooms hosting their own products (`auction.sellerId === bidder.id`). Attempted bids are rejected with `AUCTION_BID_SELF_FORBIDDEN`.
3. Anti-Sniping Algorithm:
   - If a valid bid is placed within the final 2 minutes (`AUCTION_ANTI_SNIPING_TRIGGER_MINUTES`) of the auction clock, the system automatically extends the closing deadline by 2 minutes (`AUCTION_ANTI_SNIPING_EXTEND_MINUTES`).
   - Broadcasts `auction:time_extended` to all connected clients in the room to synchronize countdown clocks.
4. Settlement and Payment Enforcement:
   - When the clock expires, the winning bidder is finalized.
   - The engine emits `AuctionWon` to the Commerce domain to generate the winning order.
   - Winner must complete delivery/shipping checkout within 24 hours; failure to pay marks the auction as defaulted, revokes the win, and deducts 10 reputation points from the buyer.

### 6.6 Fulfillment, Inventory, and Escrow

1. SKU-Based Inventory Management:
   - Inventory is tracked strictly at the SKU and warehouse level (`total_qty`, `available_qty`, `reserved_qty`).
   - Atomically reserves stock upon checkout or auction listing creation. Reservations expire automatically after 30 minutes if unconfirmed.
   - Maintains an append-only, immutable `inventory_ledgers` table for all stock movements.
2. Shipping and Logistics Orchestration:
   - Adapter-based architecture integrating carrier API (GHN Express adapter).
   - Real-time rate quotations based on parcel weight and destination coordinates.
   - Automated waybill and tracking code generation upon order packing.
   - Carrier webhook processing maps external tracking checkpoints to standardized internal statuses (`PICKED_UP`, `IN_TRANSIT`, `DELIVERED`).
3. Platform Escrow Lifecycle:
   - Buyer payments are held in platform escrow upon order creation.
   - Funds remain securely locked throughout the shipping lifecycle.
   - Upon buyer confirmation of delivery without dispute:
     - Platform retains a 7.0% platform fee.
     - Remaining 93.0% is disbursed directly into the seller's wallet.

### 6.7 Backoffice and Dispute Arbitration

1. Dispute Resolution:
   - Buyers can open a formal dispute within a defined window following delivery.
   - Opening a dispute immediately freezes automated escrow disbursement.
   - Support staff inspect submitted evidence, chat logs, and shipping records to render an arbitration decision:
     - Seller Favor: Releases escrow payout to seller.
     - Buyer Favor: Initiates full refund from escrow back to buyer wallet and penalizes seller reputation if fraud or misrepresentation is proven.
2. Platform Audit and Governance:
   - Comprehensive audit trail of financial flows, fee collections, user bans, and manual reputation overrides.

---

## 7. Implementation and Architecture Principles

1. Logical Schema Separation:
   - A single unified PostgreSQL 17 database is maintained for transactional ACID reliability.
   - Strict logical encapsulation is enforced in code: Domain modules exclusively access tables/models they own. Cross-module data retrieval must occur via public service interfaces or domain events—never by querying foreign tables directly.
2. Explicit Contracts:
   - Shared data contracts, enums, DTO interfaces, and WebSocket payloads are maintained in `packages/types` to ensure zero schema drift between Backend and Frontend.
3. Secrets and Configuration:
   - Zero hardcoded credentials. All secrets are managed via environment variables (`.env`) with strict validation on application startup.

---

## 8. Non-Functional Requirements (NFR)

### 8.1 Performance and Latency SLAs

| Operation / Endpoint         | Target SLA (p95)                     | Target Throughput                   |
| :--------------------------- | :----------------------------------- | :---------------------------------- |
| Auction Bid Placement        | $\le 300\text{ ms}$ (Critical Path)  | $\ge 3,000\text{ bids/minute}$      |
| User Authentication / Login  | $\le 500\text{ ms}$                  | $\ge 500\text{ req/s}$              |
| Catalog Search and Filtering | $\le 800\text{ ms}$                  | $\ge 1,000\text{ req/s}$            |
| Add to Cart                  | $\le 500\text{ ms}$                  | $\ge 500\text{ req/s}$              |
| Order Creation and Checkout  | $\le 1,500\text{ ms}$                | $\ge 500\text{ req/s}$              |
| Notification Dispatch        | $\le 1,000\text{ ms}$ (asynchronous) | $\ge 10,000\text{ messages/minute}$ |

### 8.2 Availability and Reliability

- System Uptime: $\ge 99.9\%$ for Core Platform, $\ge 99.5\%$ for Live Auction engine.
- Fault Isolation: Non-critical subsystem delays (such as Notification or Carrier rate timeouts) must never block the primary order creation or live bidding pathways.
- Auction Durability: In-flight bid queues persist state in Redis AOF (`appendonly yes`) to guarantee zero lost bids during container restarts.

### 8.3 Data Consistency and Financial Integrity

- Financial balance adjustments, escrow state transitions, and order placements must execute within PostgreSQL transactions (`prisma.$transaction()`) guaranteeing strict ACID semantics.
- All mutating APIs (payments, bid placement, refunds, order creation) must enforce idempotency via unique request tokens.

### 8.4 Security and Compliance

- Transport encryption via HTTPS/TLS 1.3 across all client connections; Secure WebSockets (`wss://`).
- Password hashing utilizing `bcrypt` with a minimum salt round of 10.
- Zero raw credit card storage; full compliance with financial security standards by delegating VietQR banking to PayOS and handling cash on delivery through verified logistics workflows.
- Strict input sanitization via NestJS `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`.

### 8.5 Observability and Auditing

- Structured JSON logging emitted to standard streams (`stdout`/`stderr`) containing `traceId`, `timestamp`, `level`, and `context`.
- Mandatory audit log retention:
  - Financial Orders and Escrow Records: $\ge 5\text{ years}$.
  - Auction Bidding History: $\ge 3\text{ years}$.
  - System Event Logs: $\ge 90\text{ days}$.
