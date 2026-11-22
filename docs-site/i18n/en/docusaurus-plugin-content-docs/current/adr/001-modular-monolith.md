---
title: 'ADR-001: Modular Monolith Level 1.5'
---

# ADR-001: Level 1.5 Modular Monolith Architecture

- **Status**: Accepted
- **Context**: Project Nexus spans tightly coupled domains (Auth, Users/Wallet, Catalog/Inventory, Commerce/Escrow, Auction, Fulfillment, Chat) requiring fast iteration and cross-table ACID transactions.
- **Decision**: Adopt a NestJS Modular Monolith with 10 isolated domain modules, synchronous public service boundaries, asynchronous `EventEmitter2` domain events, shared PostgreSQL 17 (`prisma.$transaction`), and Redis 7.
- **Consequences**: Eliminates microservice network latency and distributed saga complexity while preserving clean module boundaries for future extraction if needed.
