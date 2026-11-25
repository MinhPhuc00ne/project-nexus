---
title: 'ADR-001: Modular Monolith Level 1.5'
---

# ADR-001: Level 1.5 Modular Monolith Architecture

- Status: Accepted
- Decision Phase: Architecture Refactor Phase 2

## Context

Project Nexus integrates tightly coupled domains (Auth, Users and Wallet, Catalog and Inventory, Commerce and Escrow, Auction, Fulfillment, Chat) where flows such as checkout and live bidding require atomic multi-table updates (e.g., inventory reservation + order creation + escrow hold + wallet ledger entry).

## Options Considered

1. Full Microservices: Separate services and databases per domain; introduces distributed Saga and Outbox complexity, network latency, and operational overhead.
2. Unstructured Monolith: Fast initial coding, but leads to circular dependencies and spaghetti coupling.
3. Level 1.5 Modular Monolith (Selected): Single NestJS runtime and PostgreSQL database, strictly partitioned into 10 isolated domain modules with explicit exports and an in-process Event Bus (`EventEmitter2`).

## Decision

Adopt NestJS Level 1.5 Modular Monolith:

- 10 domain modules (`auth`, `users`, `catalog`, `commerce`, `auction`, `fulfillment`, `chat`, `notifications`, `admin`, `media`) communicate exclusively via exported public Services or `EventEmitter2`.
- Financial and inventory mutations execute inside unified `prisma.$transaction()` blocks.

## Consequences

- Positive: Strong ACID guarantees without distributed transaction overhead; simple local and Docker deployment; fast Turborepo builds and tests.
- Trade-off: Engineers must enforce module boundary discipline (no bypassing exported services) to preserve future service extraction readiness.
