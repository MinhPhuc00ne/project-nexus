---
title: 'ADR-007: Explicit NotificationPublisher, Order Expiration, and Audit Logging'
---

# ADR-007: Explicit NotificationPublisher, Order Expiration, and Audit Logging

Status: Accepted.

## Context

`PrismaService` previously wrapped `prisma.notification` in a runtime `Proxy` to intercept writes and dispatch real-time notifications post-commit, hiding side effects behind standard ORM calls. Additionally, unpaid `PENDING_PAYMENT` orders lacked an automated expiration sweeper, and administrative actions lacked structured trace correlation.

## Decision

- Remove the runtime `Proxy` from `PrismaService` and introduce an explicit `NotificationPublisher` (`EventsModule`) with `publishNotification` / `publishNotifications` helpers while preserving `AsyncLocalStorage` post-commit batching via `runWithNotificationBatch`.
- Add `OrderExpirationService` in `OrdersModule` under `DistributedLockService` to atomically cancel overdue `PENDING_PAYMENT` orders, cancel pending payment records and groups, and release expired `PENDING` inventory reservations with `InventoryLedger` entries.
- Add `AuditLogService` (`AuditModule`) and `RequestTrace` middleware (`X-Request-Id`) to emit structured JSON audit records for administrative moderation, finance, and settings actions.

## Consequences

- Positive: notification side effects are explicit in service constructors and grep-discoverable, unpaid inventory locks no longer leak indefinitely, and admin actions are correlated with Pino request traces.
- Trade-off: services that emit notifications must inject `@Optional() NotificationPublisher` or use the explicit publisher helper.
