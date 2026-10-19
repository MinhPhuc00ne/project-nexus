# Project Nexus - Software Design Principles Specification

This document defines the architectural principles and engineering tenets upheld across **Project Nexus**. All engineers and code reviewers must treat this specification as the standard quality benchmark.

---

## 1. SOLID Principles

Project Nexus combines Object-Oriented and Functional paradigms in TypeScript:

### 1.1 Single Responsibility Principle (SRP)

- **Tenet:** Every class, module, or function must have one and only one reason to change.
- **Application:**
  - Controllers only handle HTTP parsing and response status codes; they never execute database queries or business algorithms.
  - Large UI pages are decomposed into focused subcomponents: Header, Image Gallery, Info Tabs, Action Panels (e.g. `ProductDetailPage` decomposed into child components).
  - Cross-cutting concerns (authentication deduplication) are centralized into `AuthContext.tsx`.

### 1.2 Open/Closed Principle (OCP)

- **Tenet:** Software entities must be open for extension, but closed for modification.
- **Application:**
  - Introducing a new payment gateway (e.g. MoMo) or carrier (e.g. ViettelPost) requires creating a new strategy class implementing `IPaymentStrategy` or `ILogisticsStrategy`, without altering existing checkout controllers.

### 1.3 Liskov Substitution Principle (LSP)

- **Tenet:** Subtypes must be substitutable for their base types without altering system correctness.
- **Application:**
  - Any implementation of `IAuctionRepository` (e.g., `PrismaAuctionRepository`, test mock) honors the same return signatures, error models, and nullability invariants.

### 1.4 Interface Segregation Principle (ISP)

- **Tenet:** Clients should not be forced to depend on interfaces they do not use.
- **Application:**
  - Segregate broad entity contracts into specialized DTOs: `UserSummaryDto` for public listings, `UserProfile` for authenticated accounts, avoiding leaky models.

### 1.5 Dependency Inversion Principle (DIP)

- **Tenet:** High-level policy must not depend on low-level infrastructure details. Both must depend on abstractions.
- **Application:**
  - NestJS services inject abstract repository interfaces or tokens rather than instantiating direct Prisma database instances.

---

## 2. KISS & YAGNI Principles

### 2.1 KISS (Keep It Simple, Stupid)

- Choose the simplest clean solution over complex, speculative abstractions.
- Favor standard React Context and custom hooks over heavy state management libraries when sharing session and cart states.

### 2.2 YAGNI (You Aren't Gonna Need It)

- Do not build speculative features or preemptive abstractions for unconfirmed future requirements.
- Follow the **Rule of Three**: Only introduce generic abstractions after identical logic appears in three distinct locations.

---

## 3. DRY (Don't Repeat Yourself) & Single Source of Truth

- **Single Contract Authority:** All DTOs, enums (`Role`, `OrderStatus`, `AuctionStatus`), and event payloads reside strictly in `@nexus/types`. Frontend and backend consume the exact same source definitions.
- **Centralized Session State:** `AuthContext.tsx` is the sole authority for user profiles and tokens in the web portal.

---

## 4. Twelve-Factor App Principles (Modular Monolith)

1. **One Codebase:** Tracked in a single Monorepo, deployed across dev, staging, and production.
2. **Explicit Dependencies:** Declared strictly via root and workspace `package.json` lockfiles.
3. **Config in Environment:** Zero hardcoded secrets. All database URLs, JWT keys, and API tokens load via `.env` with strict startup validation.
4. **Backing Services as Attached Resources:** PostgreSQL and Redis are treated as attached resources connected via environment URI.
5. **Strict Build, Release, Run:** Clean separation between build artifacts (`npm run build:all`) and production runtime.
6. **Stateless Processes:** Monolithic server instances are completely stateless; sessions persist via JWTs or Redis.
7. **Port Binding:** Self-contained HTTP and WebSocket listeners on ports 3000 and 5173.
8. **Concurrency:** Scale horizontally by replicating containerized backend instances behind an Nginx or cloud load balancer.
9. **Disposability:** Graceful shutdown handling `SIGTERM` to close database connections and finish active WebSocket rooms.
10. **Dev/Prod Parity:** Docker Compose provides identical local PostgreSQL 17 and Redis 7 environments matching production.
11. **Logs as Event Streams:** Structured JSON logs written directly to standard output (`stdout`/`stderr`).
12. **Admin Tasks as One-Off Scripts:** Database migrations (`prisma migrate`) run as discrete initialization steps.

---

## 5. Fail-Fast & Defensive Programming

- All incoming network payloads are treated as untrusted and validated via `ValidationPipe` (with `whitelist: true` and `forbidNonWhitelisted: true`).
- Preconditions (e.g., minimum reputation $\ge 40$, sufficient liquid wallet balance) are validated immediately; on failure, execution halts and throws strongly-typed domain exceptions.
