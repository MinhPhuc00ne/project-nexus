# Project Nexus - Documentation Portal

Welcome to the comprehensive technical documentation portal for Project Nexus — a high-performance, modular monolith platform for Luxury E-commerce and Realtime 3D Auctions.

---

## 1. System Architecture & Domain Specifications

Located in [`docs/architecture/`](./architecture/):

| Document                                                            | Description                                                                                                                 | Focus Area         |
| :------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| **[`ARCHITECTURE_MODEL.md`](./architecture/ARCHITECTURE_MODEL.md)** | Modular Monolith architecture, Prisma database schema, domain models, and transaction boundaries.                           | Backend & Database |
| **[`BUSINESS_RULES.md`](./architecture/BUSINESS_RULES.md)**         | Core domain business rules: Escrow lifecycle, 3D Realtime Auction, Anti-Sniping, Atomic Queue, KYC, and Reputation scoring. | Domain Logic       |
| **[`DESIGN_PATTERNS.md`](./architecture/DESIGN_PATTERNS.md)**       | Applied GoF and architectural patterns: Repository, Strategy, In-Process Event-Driven, Unit of Work, and React Context.     | Architecture       |

---

## 2. Engineering & Clean Code Standards

Located in [`docs/standards/`](./standards/):

| Document                                                         | Description                                                                                                                                                | Focus Area             |
| :--------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| **[`CLEAN_CODE.md`](./standards/CLEAN_CODE.md)**                 | Clean Code and documentation guidelines: **Recommended < 300 lines/file guideline**, Separation of Concerns, Modular Decomposition, and Strict TypeScript. | Code Quality           |
| **[`DESIGN_PRINCIPLES.md`](./standards/DESIGN_PRINCIPLES.md)**   | Software design principles: SOLID, KISS, YAGNI, DRY, Low Coupling, and High Cohesion across modules.                                                       | Engineering Principles |
| **[`NAMING_CONVENTIONS.md`](./standards/NAMING_CONVENTIONS.md)** | Naming conventions across TypeScript, React components, NestJS modules, DTOs, interfaces, and database models.                                             | Consistency            |

---

## 3. Frontend & UI Engineering Guides

Located in [`docs/frontend/`](./frontend/):

| Document                                                    | Description                                                                                                           | Audience           |
| :---------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- | :----------------- |
| **[`FRONTEND_GUIDE.md`](./frontend/FRONTEND_GUIDE.md)**     | Complete frontend guide: React 19, Vite, Tailwind CSS, Dual-Mode Mock/Live API architecture, and component standards. | Frontend Engineers |
| **[`UI_SPECIFICATION.md`](./frontend/UI_SPECIFICATION.md)** | Console user interface hierarchy, design tokens, color palette, responsive breakpoints, and role-based route tree.    | UI/UX & Design     |

---

## 4. Backend Engineering Guide

Located in [`docs/backend/`](./backend/):

| Document                                             | Description                                                                                                  | Audience          |
| :--------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :---------------- |
| **[`BACKEND_GUIDE.md`](./backend/BACKEND_GUIDE.md)** | Complete backend guide: NestJS 11, Prisma ORM 6, PostgreSQL, Redis BullMQ, PayOS gateway, and WebSocket/SSE. | Backend Engineers |

---

## 5. Specifications & Reference Documents

- **[Software Requirements Specification (SRS)](./srs/README.md):** Functional & non-functional requirements and stakeholder specifications.
- **[API Specification Index](./api/README.md):** RESTful endpoints and Swagger schema conventions.
- **[Authentication Frontend Verification](./auth-frontend-verification.md):** Authentication verification checklist and test results.
