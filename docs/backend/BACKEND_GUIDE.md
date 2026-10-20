# Project Nexus - Backend Engineering Guide

This guide provides backend engineers with an end-to-end specification of the architecture, module design, database orchestration, real-time engines, and development workflows for the **Nexus Modular Monolith Backend** (`backend/`).

---

## 1. Architecture Overview

Project Nexus is architected as an **Enterprise Modular Monolith** in NestJS:

- **Language / Runtime:** TypeScript 5.9 / Node.js LTS v22+
- **Framework:** NestJS 12 (IoC container, Modular architecture)
- **Database & ORM:** PostgreSQL 17 + Prisma ORM 7
- **In-Memory Store:** Redis 7 (Distributed locking with Redlock, caching, Pub/Sub)
- **Event Bus:** `@nestjs/event-emitter` (EventEmitter2 in-process domain events)
- **Real-Time Gateway:** Socket.IO / `@nestjs/websockets`

---

## 2. Domain Module Structure

The monolithic codebase is organized into decoupled domain modules under `backend/src/modules/`:

| Module         | Primary Responsibilities                                                             |
| :------------- | :----------------------------------------------------------------------------------- |
| `auth`         | User registration, JWT issuing/refreshing, bcrypt hashing, role guards               |
| `users`        | User profiles, wallet balances, reputation scoring, trust-level updates              |
| `catalog`      | Categories (3-level hierarchy), product listings, 3D model asset metadata            |
| `commerce`     | Shopping cart lifecycle, checkout validation, PayOS & Stripe gateways, order states  |
| `fulfillment`  | SKU warehouse inventories, immutable inventory ledgers, escrow records, GHN shipping |
| `auction`      | High-concurrency live bidding engine, Redis Redlock, anti-sniping duration extension |
| `notification` | Multi-channel user notifications (Email, Push, In-App), immutable `event_logs` audit |
| `backoffice`   | Staff management, dispute arbitration, escrow disbursement overrides                 |

### 2.1 Layering Inside Each Module

Each domain module enforces a clean 4-tier layer:

1. **Controllers:** HTTP REST route handlers (`/api/v1/...`). Validates incoming payloads via DTOs.
2. **DTOs:** Strongly-typed request/response schemas with `class-validator` annotations.
3. **Services:** Core business logic, transaction orchestration, domain exception emission.
4. **Repositories / Entities:** Database access queries utilizing Prisma client.

---

## 3. Communication Boundaries & In-Process Events

### 3.1 Logical Schema Separation

Modules maintain strict data ownership:

- `CommerceModule` owns `orders` and `order_items`.
- `FulfillmentModule` owns `inventories` and `escrow_records`.
- Cross-module Prisma queries in controllers or foreign services are prohibited. Data exchange occurs through exported NestJS service methods or asynchronous domain events.

### 3.2 In-Process Domain Events (`@nestjs/event-emitter`)

State changes emit strongly-typed events to prevent circular dependencies (`forwardRef`):

```typescript
// 1. Publishing an event in CommerceService:
this.eventEmitter.emit(
  'order.created',
  new OrderCreatedEvent(order.id, order.buyerId, order.totalAmount)
);

// 2. Listening in FulfillmentService (Escrow hold):
@OnEvent('order.created')
async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
  await this.escrowService.createEscrowHold(event.orderId, event.totalAmount);
}

// 3. Listening in NotificationService (Audit logging & email):
@OnEvent('order.created')
async logAndNotify(event: OrderCreatedEvent): Promise<void> {
  await this.auditLogService.recordEvent('OrderCreated', event);
  await this.emailService.sendOrderConfirmation(event.buyerId, event.orderId);
}
```

---

## 4. Real-Time Auction Engine & High Concurrency

The live auction engine (`/ws/auctions`) processes high-frequency bids with sub-300ms latency:

1. **Redis Redlock:** Serializes concurrent bids on `auction:{id}` down to the millisecond.
2. **Pre-Validation:** Checks liquid wallet balance and bidder reputation ($\ge 40$).
3. **Atomic Balance Transfer:** Deducts the bid amount from the new bidder's wallet and immediately credits the full amount back to the superseded bidder's wallet in a single PostgreSQL transaction.
4. **Anti-Sniping Extension:** If a bid arrives in the final 2 minutes, extends `end_time` by $+5$ minutes and broadcasts `auction:time_extended` to all room sockets.

---

## 5. Database Setup & Migration Workflow

### 5.1 Docker Infrastructure

Launch PostgreSQL 17 and Redis 7:

```bash
npm run docker:up
```

### 5.2 Prisma Migrations & Seeding

```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations in development
npm run prisma:migrate

# Seed database with initial categories, demo products, and admin accounts
npm run prisma:seed

# Open interactive Prisma Studio web UI
npm run prisma:studio
```

---

## 6. Development Workflow Commands

```bash
# Start backend in watch mode on port 3000
npm run dev:backend

# Build backend for production
npm run build:backend

# Swagger API Documentation
# Visit http://localhost:3000/api/docs
```
