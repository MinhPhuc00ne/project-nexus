---
title: System Architecture Overview
---

# System Architecture (Level 1.5 Modular Monolith)

Project Nexus is architected as a Level 1.5 Modular Monolith powered by NestJS 12 and Turborepo: all business capabilities run inside a single backend process to guarantee cross-table ACID transactions, while source code is partitioned into 16 isolated Domain Modules communicating via exported services or an in-process Event Bus (`EventEmitter2`).

```mermaid
flowchart TB
    FE["Frontend SPA (React 19 + Vite 8 + i18next)<br/>5 Portals: Guest, Buyer, Seller, Staff, Admin"]
    TYPES["@nexus/contracts<br/>Zod 4 Schemas, AppErrorCode, Enums, WS Events"]

    subgraph BE["Backend (NestJS 12 — /api/v1)"]
        PIPE["Global Pipeline<br/>Helmet • Pino X-Request-Id • Redis Throttler • JwtAuthGuard • RolesGuard<br/>TransformResponseInterceptor • GlobalHttpExceptionFilter"]
        CORE["Core Layer<br/>PrismaModule • RedisModule • MailModule • StorageModule<br/>AuditModule • Health • Security • Moderation • NotificationPublisher"]
        MODS["16 Domain Modules<br/>admin • after-sales • auction • auth • cart • catalog<br/>chat • fulfillment • media • notifications • orders • payments<br/>reviews • treasury • users • wallet"]
        BUS["EventEmitter2 (Wildcard '.' Domain Bus)"]
    end

    PG[(PostgreSQL 17<br/>ACID + Row Locks)]
    RD[(Redis 7<br/>Auction Locks + Cache)]
    EXT["External Integrations<br/>PayOS • GHN v2 • Gemini AI • Cloudinary • SMTP"]

    TYPES -.-> FE
    TYPES -.-> BE
    FE -->|REST + JWT + Accept-Language| PIPE
    FE <-->|Socket.IO: /ws/auctions, /ws/chat, /ws/notifications| MODS
    PIPE --> MODS
    MODS --> CORE
    MODS <--> BUS
    CORE --> PG
    CORE --> RD
    MODS --> EXT
```

## 1. Backend Layered Architecture (`backend/src`)

### Core Layer (`backend/src/core`)

- `prisma/`: `PrismaService` connects to PostgreSQL 17 via Prisma 7, providing `$transaction` and `AsyncLocalStorage` notification batching (`runWithNotificationBatch`).
- `notifications/`: `NotificationPublisher` explicitly persists notifications and emits real-time events post-commit.
- `audit/`: `AuditLogService` and `RequestTrace` middleware (`X-Request-Id`) record structured administrative audit trails.
- `redis/`: `RedisService` manages Redis 7 connections for distributed auction locks, inventory coordination, and short-lived caching.
- `mail/`: `MailService` dispatches OTP verification codes, password reset links, and Support Staff onboarding invites (`@staff.com`).
- `storage/`: Abstracts file persistence between Cloudinary (production) and local `/uploads` static serving.
- `filters/` and `interceptors/`: `GlobalHttpExceptionFilter` normalizes error payloads (`statusCode`, `errorCode`, `message`, `errors`); `TransformResponseInterceptor` wraps standard API responses.
- `moderation/` and `security/`: Content moderation utilities (`content-moderation.util.ts`) and document access security guards.

### Domain Layer (`backend/src/modules`)

Sixteen self-contained business modules: `admin`, `after-sales`, `auction`, `auth`, `cart`, `catalog`, `chat`, `fulfillment`, `media`, `notifications`, `orders`, `payments`, `reviews`, `treasury`, `users`, `wallet`. Each module encapsulates its own controllers, DTOs, services, and domain helpers, exposing only explicit public contracts.

## 2. Cross-Module Communication

| Mechanism                             | When Used                                                              | Real Example                                                                                                                       |
| :------------------------------------ | :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| Injected Public Service               | Synchronous reads or participation in the same `prisma.$transaction()` | `OrdersModule` calls `InventoryService` (Catalog) to reserve stock; `FulfillmentModule` reads `ShopShippingProfileService` (Users) |
| EventEmitter2 (`@OnEvent`)            | Asynchronous side effects that decouple modules                        | Order payment and cancellation emit events consumed by `ReputationService` and `NotificationsModule`                               |
| Shared Contracts (`@nexus/contracts`) | Compile-time and runtime alignment between FE and BE                   | `Role`, `OrderStatus`, `AuctionStatus`, `AppErrorCode`, `AUCTION_EVENTS`, `CHAT_EVENTS`                                            |

## 3. Concurrency and Consistency Strategy

- ACID Transactions (`prisma.$transaction`): Enforced for checkout, `EscrowRecord` holds, disbursements, `OrderRefund` accounting, `WithdrawalRequest` locking, and auction `Bid` placement.
- Pessimistic Row Locks (`SELECT ... FOR UPDATE`): Prevents race conditions on last-item inventory checkout and concurrent auction bids.
- Idempotency (`Idempotency-Key`): Prevents duplicate charges on checkout and payment retries.
- Webhook Verification: PayOS webhooks verify HMAC signatures (`PAYOS_CHECKSUM_KEY`); GHN webhooks validate `GHN_WEBHOOK_SECRET`.
