# Project Nexus - Documentation Portal

Welcome to the official documentation portal for Project Nexus. Please refer to the technical specifications and standards documents below:

## 1. Requirements

- [Software Requirements Specification (SRS)](./srs/README.md): Detailed specification of functional requirements (E-commerce, 3D Realtime Auction, Escrow, Reputation) and non-functional requirements.

## 2. System Architecture

- [System Architecture Specification](./architecture/ARCHITECTURE.md): Modular Monolith architecture, module boundaries, in-process event communication (`@nestjs/event-emitter`), unified PostgreSQL ACID persistence, Redis caching/queues, and WebSocket synchronization.
- [Design Patterns Specification](./architecture/DESIGN_PATTERNS.md): Implementation guide for design patterns: Repository, Strategy (PayOS/Stripe/GHN), In-Process Observer/Event-Driven, Unit of Work / ACID Transactions, and Three.js Scene Lifecycle Management.

## 3. Engineering & Clean Code Standards

- [Design Principles Specification](./standards/DESIGN_PRINCIPLES.md): SOLID principles, KISS, YAGNI, DRY, Modular Cohesion, and Low Coupling in a monolithic codebase.
- [Clean Code & Quality Standards](./standards/CLEAN_CODE.md): Naming conventions, Code Formatting (Prettier), Linting (ESLint), Strict TypeScript, Error Handling, Structured Logging, and Git Hooks enforcement.

## 4. Interfaces & API

- [API Documentation Index](./api/README.md): RESTful conventions, WebSocket contracts, and unified Swagger specifications.
