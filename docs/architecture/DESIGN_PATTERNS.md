# Project Nexus - Design Patterns Specification

This document details the software design patterns implemented across the Backend Modular Monolith and Client Applications in Project Nexus.

---

## 1. Backend Design Patterns

### 1.1 Inversion of Control & Dependency Injection (IoC / DI)

- **Problem:** Direct instantiation of database clients, loggers, or external APIs couples business services to infrastructure, hampering testability.
- **Pattern:** Leverages NestJS IoC container. Dependencies are declared via constructor parameters.
- **Example:**
  ```typescript
  @Injectable()
  export class PlaceBidService {
    constructor(
      private readonly auctionRepository: AuctionRepository,
      private readonly eventEmitter: EventEmitter2,
      private readonly redisService: RedisService,
    ) {}
  }
  ```

### 1.2 Repository Pattern & Unit of Work (ACID Transactions)

- **Problem:** Database queries scattered across business logic lead to code duplication and broken transactions when multi-table writes fail midway.
- **Pattern:** Repository classes encapsulate Prisma queries. Multi-step operations execute inside `prisma.$transaction()` Units of Work.
- **Example (Escrow Hold on Payment):**
  ```typescript
  await this.prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: buyerId },
      data: { walletBalance: { decrement: amount } },
    });
    await tx.escrowRecord.create({
      data: { orderId, amount, status: 'HELD' },
    });
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });
  });
  ```

### 1.3 Strategy Pattern (Payment & Logistics Gateways)

- **Problem:** Adding new payment gateways or shipping carriers should not require altering existing business classes (Open/Closed Principle).
- **Pattern:** Abstract strategy interfaces define execution contracts (`IPaymentStrategy`, `ILogisticsStrategy`). Concrete providers implement the interface and register with a central context registry.
- **Concrete Strategies:**
  - `PayOSPaymentStrategy`: Vietnamese domestic bank QR code with cryptographic webhook signature verification.
  - `StripePaymentStrategy`: International cards via Stripe PaymentIntents.
  - `WalletPaymentStrategy`: Instant internal balance settlement.
  - `GhnLogisticsStrategy`: Giao Hàng Nhanh shipping quotation and waybill generation.

### 1.4 In-Process Observer & Domain Events Pattern

- **Problem:** Monolithic modules must notify each other without tight coupling or circular imports (`forwardRef`).
- **Pattern:** State mutations emit domain events via `@nestjs/event-emitter`. Other modules register listeners using `@OnEvent()`.
- **Workflow:**
  - `CommerceModule` emits `OrderCreatedEvent`.
  - `FulfillmentModule` listens and holds funds in escrow.
  - `NotificationModule` listens and writes an immutable audit record to `event_logs`, sending an email confirmation.

### 1.5 Distributed Lock (Redlock) & Atomic Queue

- **Problem:** High-concurrency auctions risk race conditions, simultaneous highest bids, and double-spending.
- **Pattern:** Uses Redis distributed locks (`Redlock`) to serialize bids down to the millisecond on `auction:{id}` before committing state to PostgreSQL.

---

## 2. Frontend Design Patterns

### 2.1 Barrel Pattern (Single Entry Point Re-export)

- **Problem:** Modules needing types or enums had to navigate complex, deep directory paths (`import ... from '@nexus/types/dist/models/index.js'`).
- **Pattern:** `packages/types/src/index.ts` serves as a public barrel export:
  ```typescript
  export * from './enums/index.js';
  export * from './events/index.js';
  export * from './models/index.js';
  ```
  Client and server code simply imports from `@nexus/types`.

### 2.2 In-Flight Request Deduplication & Cross-Tab Sync (`AuthContext`)

- **Problem:** Multiple simultaneous components on page reload or route changes triggered 6–7 duplicate `/users/me` API requests.
- **Pattern:**
  - **In-Flight Promise Ref:** Maintains a shared `inFlightPromiseRef` in React Context. If a request is already pending, subsequent calls latch onto the existing Promise instead of dispatching new network requests.
  - **Storage Event Synchronization:** Listens to `window.addEventListener('storage')` and custom `nexus:auth-change` events to keep user profile and tokens synchronized across multiple open browser tabs.

### 2.3 Mock Layer & Graceful Fallback Strategy

- **Problem:** Frontend development is blocked when backend endpoints are incomplete, or local databases are offline.
- **Pattern:**
  - Services check `isMockEnabled()` (`VITE_USE_MOCK=true`).
  - When mock mode is disabled (`false`), services call the real API. If the API returns a network or 404/500 error, the service automatically falls back to curated mock data (`frontend/web/src/mocks/`) without crashing the UI.

### 2.4 Data-Driven UI (Configuration over Code)

- **Problem:** Hardcoding navigation links, icons, and route paths inside UI components bloated files past the 300-line threshold.
- **Pattern:** Extracted into metadata definitions (e.g., [`staffNavigationData.ts`](../frontend/web/src/pages/staff/staffNavigationData.ts)). Sidebar and dashboard components simply map over the dataset, allowing instant UI updates via single-line configuration changes.

### 2.5 Three.js Scene Lifecycle & Asset Manager Pattern

- **Problem:** Three.js WebGL contexts cause browser memory leaks if geometries and textures are not explicitly disposed when unmounting.
- **Pattern:** `AuctionSceneManager` encapsulates scene creation, render loops, and systematic disposal (`geometry.dispose()`, `material.dispose()`, `renderer.dispose()`) outside React's render cycle.
- **Fallback Pedestal:** If a 3D model asset is absent, the manager loads `fallback-pedestal.glb` and projects 2D product photos onto dynamic texture coordinates.
