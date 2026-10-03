# Project Nexus - Design Principles Specification

This document establishes the foundational Software Design Principles enforced across Project Nexus. All engineers, contributors, and code reviewers must treat this specification as the quality benchmark for code reviews.

---

## 1. SOLID Principles

Project Nexus leverages object-oriented programming (OOP) alongside functional programming in TypeScript. The five SOLID principles form the baseline:

### 1.1. Single Responsibility Principle (SRP)

- Rule: Every class, module, or function must have one and only one reason to change.
- Application:
  - Do not combine shipping fee computation, wallet debits, and email dispatch into a single `processOrder()` function.
  - Decompose into dedicated use cases and services: `CalculateShippingFeeService`, `HoldEscrowFundsUseCase`, `OrderNotificationService`.
  - Controllers must only extract HTTP requests, parse DTOs, and delegate to application use cases; they must never contain database queries or business algorithms.

### 1.2. Open/Closed Principle (OCP)

- Rule: Software entities should be open for extension, but closed for modification.
- Application:
  - When introducing a new payment provider (e.g., MoMo, Apple Pay), engineers must not modify existing `switch-case` blocks. Instead, implement a new class satisfying `IPaymentStrategy` and register it with the IoC container.

### 1.3. Liskov Substitution Principle (LSP)

- Rule: Objects of a superclass should be replaceable with objects of a subclass without affecting system correctness.
- Application:
  - Any implementation of `IAuctionRepository` (e.g., `PrismaAuctionRepository`, `InMemoryAuctionRepositoryTest`) must honor the contract regarding return types and exceptions. An implementation must not throw unexpected exceptions that break application-layer workflows.

### 1.4. Interface Segregation Principle (ISP)

- Rule: Clients should not be forced to depend upon interfaces they do not use.
- Application:
  - Avoid monolithic interfaces containing dozens of unrelated methods. Segregate them into role-specific interfaces: `IUserAuthenticationPort`, `IUserWalletPort`, `IReputationScoringPort`.

### 1.5. Dependency Inversion Principle (DIP)

- Rule:
  1. High-level modules (Domain & Application) must not depend on low-level modules (Database, Network, File System). Both must depend on abstractions (Interfaces).
  2. Abstractions must not depend upon details. Details must depend upon abstractions.
- Application:
  - The Domain layer defines `IOrderRepository`. The Infrastructure layer implements this interface using Prisma or TypeORM. The Application layer consumes `IOrderRepository` via NestJS dependency injection tokens.

---

## 2. KISS & YAGNI Principles

### 2.1. KISS (Keep It Simple, Stupid)

- Prioritize the simplest viable solution that satisfies business and non-functional requirements.
- Avoid over-engineering, unnecessary abstraction layers, or bespoke frameworks where standard libraries suffice.
- Readable, easily understandable code is always preferred over clever, single-line shorthand.

### 2.2. YAGNI (You Aren't Gonna Need It)

- Do not build speculative features, unnecessary parameters, or abstract architectures for hypothetical future requirements.
- Follow the Rule of Three: Only create generic abstractions once at least two or three concrete implementations exist in the codebase.

---

## 3. DRY (Don't Repeat Yourself) & Single Source of Truth

- Every piece of knowledge, business rule, and data contract must have a single, authoritative representation across the entire system.
- Application in the Nexus Modular Monolith:
  - Shared domain events, error filters, and common utilities reside centrally in `backend/src/modules/common`.
  - JWT verification guards and RBAC decorators reside in `backend/src/modules/auth`.
  - Prisma database client and transaction helpers reside centrally in `backend/src/modules/common/prisma`.

---

## 4. Twelve-Factor App Principles (Modular Monolith)

The monolithic backend complies with Twelve-Factor App standards:

1. Codebase: Tracked in a single version-controlled repository, deployed across multiple environments.
2. Dependencies: Explicitly declared and isolated via root and workspace `package.json` and lockfiles.
3. Config: Store all environment-specific configuration in environment variables (`.env`), never hardcoding secrets or hostnames.
4. Backing Services: Treat databases (PostgreSQL) and caches (Redis) as attached resources connected via environment URLs.
5. Build, Release, Run: Strictly separate the build stage (Docker build) from execution runtime.
6. Processes: The application is strictly stateless; session state is preserved via JWTs or Redis.
7. Port Binding: Exports unified HTTP and WebSocket interfaces via port 3000.
8. Concurrency: Scale out by replicating stateless monolithic containers (Docker replicas).
9. Disposability: Fast startup and graceful shutdown handling `SIGTERM`/`SIGINT` signals to close active database connections cleanly.
10. Dev/Prod Parity: Maintain environment parity between local Docker Compose configurations and production deployments.
11. Logs: Treat logs as event streams emitted directly to `stdout`/`stderr` in structured JSON format.
12. Admin Processes: Run database migrations (`prisma migrate`) and one-off administration tasks as discrete transient scripts.

---

## 5. Fail-Fast & Defensive Programming

- All incoming payloads arriving via HTTP, WebSockets, or Message Queues are considered untrusted. Data must be sanitized and validated at the presentation boundary via DTO validation before reaching the application layer.
- When preconditions are violated (e.g., insufficient wallet balance, expired token, closed auction), the system throws immediate domain exceptions rather than performing partial operations.
