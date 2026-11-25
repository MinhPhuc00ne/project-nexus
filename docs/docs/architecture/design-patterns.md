---
title: Design Patterns
---

# Design Patterns (Backend and Frontend)

This page documents the core architectural and implementation patterns enforced across the Project Nexus Backend and Frontend codebases.

## 1. Backend Patterns (`backend/src`)

| Pattern                              | Real Implementation                                                                                      | Technical Benefit                                                                      |
| :----------------------------------- | :------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| Inversion of Control and DI          | All Services, Controllers, and Gateways use NestJS constructor injection                                 | Cleanly mockable dependencies for `node:test` unit and integration tests               |
| Unit of Work (`prisma.$transaction`) | `OrderService`, `OrderEscrowService`, `RefundService`, `AuctionService`, `SellerFinanceService`          | Guarantees ACID atomicity across wallets, escrow, inventory, and orders                |
| Strategy Pattern                     | Payments (`PayosService`, `WALLET`, `COD`) and Logistics (`GhnLogisticsService`, `RouteDistanceService`) | New providers can be added without modifying core checkout orchestration               |
| In-Process Domain Events             | `EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' })`                                         | Decouples core transactions from side effects (reputation updates, notifications)      |
| Pessimistic + Distributed Lock       | PostgreSQL `SELECT ... FOR UPDATE` combined with Redis locks (`AuctionService`)                          | Eliminates race conditions and double-spending under concurrent bids or stock checkout |
| Delegate Wrapper                     | `PrismaService` wraps `Notification` writes to emit via `NotificationRealtimeBus`                        | Any service creating a `Notification` automatically triggers Socket.IO delivery        |

## 2. Frontend Patterns (`frontend/src`)

### Single Source of Truth (`@nexus/types`)

Both Frontend and Backend import Enums (`Role`, `OrderStatus`, `AuctionStatus`), DTOs, and WebSocket event constants from `@nexus/types`, preventing string drift.

### In-Flight Deduplication and Cross-Tab Sync (`AuthContext.tsx`)

- `inFlightPromiseRef` deduplicates concurrent `/users/me` calls sharing the same access token.
- Listens to `nexus:auth-change` and browser `storage` events (`nexus:auth-*`) to synchronize login, logout, and cart state across browser tabs.
- `applyModeOverride()` reconciles route prefixes (`/seller/*` forces `SELLER`, `/buyer/*` preserves `BUYER`, `isShopSuspended` forces `BUYER`).

### Token Refresh Queue (`services/api.ts`)

The Axios response interceptor catches HTTP `401` errors using `isRefreshing` and `failedQueue` so concurrent expired requests trigger only one `/auth/refresh` call and replay cleanly once refreshed.

### Data-Driven Navigation and Security Hardening

- Portal sidebars (Buyer, Seller, Staff, Admin) are configuration-driven with i18n keys.
- `resolveNotificationTargetUrl()` (`utils/notificationNavigation.ts`) resolves notification routes while rejecting protocol-relative open-redirect vectors (`//...`).

### WebGL 3D Scene Lifecycle

The 3D auction viewer explicitly disposes `geometry.dispose()`, `material.dispose()`, and `renderer.dispose()` on unmount to prevent GPU memory leaks, and falls back to a 3D pedestal displaying 2D product images when a `.glb` model is unavailable.
