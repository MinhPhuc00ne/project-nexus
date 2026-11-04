# Project Nexus - Design Patterns Specification

This document details the software design patterns implemented across the Modular Monolith backend and client applications in Project Nexus.

---

## 1. Backend Design Patterns

### 1.1 Inversion of Control and Dependency Injection

Direct instantiation of database clients, loggers, or external APIs couples business services to infrastructure, hampering testability. Project Nexus leverages the NestJS Inversion of Control container, declaring dependencies through constructor parameters:

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

### 1.2 Repository Pattern and Unit of Work

Scattering database queries across business logic leads to code duplication and broken transactions when multi-table writes fail midway. Repository classes encapsulate Prisma queries, while multi-step operations execute inside atomic `prisma.$transaction()` Units of Work:

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

### 1.3 Strategy Pattern for Payment and Logistics Gateways

Adding new payment gateways or shipping carriers should never require modifying existing business workflows, satisfying the Open/Closed Principle. Abstract strategy interfaces define execution contracts (`IPaymentStrategy`, `ILogisticsStrategy`), while concrete providers register with central registries:

- `PayOSPaymentStrategy`: Domestic Vietnamese bank transfers with cryptographic webhook signature verification.
- `CodPaymentStrategy`: Cash on delivery registration with pending payment tracking and verification upon delivery.
- `WalletPaymentStrategy`: Instant internal balance settlement.
- `GhnLogisticsStrategy`: Giao Hàng Nhanh shipping rate calculation, order dispatching, and waybill generation.

### 1.4 In-Process Observer and Domain Events Pattern

Monolithic modules must notify each other without tight coupling or circular imports. State mutations emit strongly-typed domain events via `@nestjs/event-emitter`, and decoupled modules register listeners using `@OnEvent()`:

- `CommerceModule` emits `OrderCreatedEvent`.
- `FulfillmentModule` listens to hold funds in platform escrow.
- `NotificationModule` listens to record an immutable audit entry in `event_logs` and dispatch customer confirmations.

### 1.5 Distributed Locking and Pessimistic Row Locking

High-concurrency auctions risk race conditions, simultaneous highest bids, and double-spending. The bidding engine uses PostgreSQL pessimistic row locking (`SELECT ... FOR UPDATE`) and Redis distributed locks (`Redlock`) to serialize bids down to the millisecond before committing balance changes.

---

## 2. Frontend Design Patterns

### 2.1 Barrel Pattern for Shared Contracts

Deep, repetitive relative paths create brittle import trees. The shared contract library exports its public interface through `packages/types/src/index.ts`:

```typescript
export * from './enums/index.js';
export * from './events/index.js';
export * from './models/index.js';
```

Both client and server code import directly from `@nexus/types`.

### 2.2 In-Flight Request Deduplication and Cross-Tab Synchronization

Multiple simultaneous components mounted during route transitions can trigger redundant API calls. The authentication context maintains an in-flight Promise reference, attaching subsequent callers to the pending request rather than dispatching duplicate network calls. Additionally, storage event listeners keep user sessions synchronized across multiple open browser tabs.

### 2.3 Fixture Consolidation and Clean API Consumption

Mock fallbacks scattered in frontend code can mask breaking API changes. Project Nexus consolidates all initial demo fixtures into `backend/prisma/seed.ts`, allowing client services to consume clean backend REST endpoints and WebSocket channels with typed error handling.

### 2.4 Data-Driven UI

Hardcoding navigation links, icons, and route paths inside view components bloats files beyond readable thresholds. Navigation schemes and action layouts are extracted into metadata definitions, enabling sidebar and dashboard components to render dynamically via configuration.

### 2.5 WebGL Scene Lifecycle and Asset Management

WebGL contexts cause browser memory leaks if geometries and textures are not explicitly disposed upon unmounting. The scene manager encapsulates scene instantiation, render animation loops, and systematic resource disposal (`geometry.dispose()`, `material.dispose()`, `renderer.dispose()`) outside React's rendering lifecycle. If a 3D model asset is absent, the manager dynamically renders a fallback pedestal displaying the seller's product photos as texture maps.
