---
title: Design Patterns
---

# Design Patterns (Backend & Frontend)

## 1. Backend Patterns (NestJS 12)

1. **Inversion of Control & Dependency Injection**: Services and repositories declare dependencies via constructor injection, enabling clean unit testing with `node:test`.
2. **Unit of Work (`prisma.$transaction`)**: Multi-table financial and inventory mutations run inside atomic Prisma transactions.
3. **Strategy Pattern for Payments & Logistics**: External providers (`PayosService`, `Wallet`, `COD`, `GhnLogisticsService`) are encapsulated behind uniform service contracts.
4. **In-Process Domain Events (`@nestjs/event-emitter`)**: Modules communicate asynchronously via `EventEmitter2` and `@OnEvent()` to avoid circular dependencies.
5. **Distributed & Pessimistic Row Locking**: Combines PostgreSQL `SELECT ... FOR UPDATE` with Redis locks to serialize high-concurrency bids and stock reservations.

## 2. Frontend Patterns (React 19)

1. **Shared Contracts (`@nexus/types`)**: Imports enums, DTOs, and WebSocket event names from a single package.
2. **In-Flight Request Deduplication & Cross-Tab Sync**: `AuthContext` deduplicates concurrent `/users/me` calls and listens to `storage` events for multi-tab session sync.
3. **Data-Driven Navigation**: Portal sidebars render from typed configuration arrays paired with `i18n` keys.
4. **WebGL Scene Lifecycle**: Explicitly disposes geometries, materials, and renderers on unmount, falling back to a 2D-textured 3D pedestal when a `.glb` asset is absent.
