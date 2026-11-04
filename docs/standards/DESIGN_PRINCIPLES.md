# Software Design Principles Specification

This document defines the architectural principles and engineering tenets upheld across Project Nexus. All engineers and code reviewers treat this specification as the standard quality benchmark.

## 1. SOLID Principles

Project Nexus combines Object-Oriented and Functional paradigms within a typed TypeScript environment:

### Single Responsibility Principle (SRP)

Every class, module, or function must maintain one, and only one, reason to change. In our architecture:

- Controllers handle HTTP parsing, status codes, and input dispatching; they never execute database queries or core business algorithms.
- Large user interface pages are decomposed into focused subcomponents, separating headers, media galleries, information tabs, and transaction panels into dedicated units.
- Cross-cutting concerns such as session lifecycle management are centralized inside dedicated context providers.

### Open/Closed Principle (OCP)

Software entities must remain open for extension while closed for modification. In our architecture:

- Introducing a new payment gateway or logistics carrier requires creating a strategy class implementing the corresponding domain interface, without modifying existing checkout controllers or order orchestration loops.

### Liskov Substitution Principle (LSP)

Subtypes must remain completely substitutable for their base abstractions without altering system correctness. In our architecture:

- Any implementation of a repository interface, whether backed by PostgreSQL, Redis, or an in-memory testing stub, honors identical method signatures, return structures, and error models.

### Interface Segregation Principle (ISP)

Clients should never be forced to depend on interfaces containing methods they do not consume. In our architecture:

- Broad entity contracts are segregated into specialized Data Transfer Objects, such as separating summary views for public catalogs from detailed profiles for authenticated accounts.

### Dependency Inversion Principle (DIP)

High-level policy must not depend on low-level implementation details. Both must depend on abstractions. In our architecture:

- NestJS services inject abstract tokens and repository interfaces rather than instantiating direct database drivers or external client SDKs directly.

## 2. Simplicity and Pragmatic Abstraction

### Keep It Simple, Stupid (KISS)

Choose the simplest clean solution over complex, speculative abstractions. Favor standard React Context and custom hooks over heavy external state management libraries when coordinating local state and shopping cart collections.

### You Aren't Gonna Need It (YAGNI)

Avoid building speculative features or preemptive abstractions for unconfirmed future requirements. Follow the Rule of Three by introducing generic abstractions only after identical logic appears across three distinct functional domains.

## 3. Don't Repeat Yourself and Single Source of Truth

- Single Contract Authority: All Data Transfer Objects, status enums, and event payloads reside strictly within the `@nexus/types` package, ensuring that the backend and frontend consume identical schemas.
- Centralized Session State: Authentication providers maintain exclusive authority over active user identity, token verification, and profile refresh lifecycles.

## 4. Twelve-Factor App Principles for Modular Monoliths

1. One Codebase: Tracked within a unified monorepo and deployed across development, staging, and production environments.
2. Explicit Dependencies: Declared strictly through root and workspace package lockfiles.
3. Config in Environment: Zero hardcoded credentials; all database connection strings, secret keys, and service tokens load from environment variables validated upon boot.
4. Backing Services as Attached Resources: PostgreSQL and Redis operate as attached resources addressed via environment URIs.
5. Strict Build, Release, Run: Clean segregation between static compilation artifacts and runtime process execution.
6. Stateless Processes: Server instances operate completely statelessly, persisting transient sessions across JWT tokens or Redis cache tiers.
7. Port Binding: Self-contained HTTP and WebSocket services export port bindings on ports 3000 and 5173.
8. Concurrency: Scale horizontally by running stateless backend instances behind a reverse proxy or cloud load balancer.
9. Disposability: Clean process lifecycle handling graceful termination signals to release active database connection pools and finalize active WebSocket rooms.
10. Dev and Production Parity: Docker Compose maintains parity by hosting identical local PostgreSQL 17 and Redis 7 services matching production baselines.
11. Logs as Event Streams: Structured logging outputs write directly to standard output and standard error streams.
12. Admin Tasks as One-Off Scripts: Database schema migrations and data seeds run as discrete, reproducible pipeline jobs.

## 5. Fail-Fast and Defensive Programming

All incoming network payloads are treated as untrusted and validated through NestJS validation pipes configured with strict property whitelisting. Business preconditions, including minimum reputation thresholds and sufficient liquid wallet balances, are evaluated at the earliest possible stage, immediately halting processing with strongly-typed domain exceptions upon violation.
