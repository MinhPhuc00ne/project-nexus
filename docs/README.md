# Project Nexus - Documentation Portal

Welcome to the comprehensive technical documentation portal for Project Nexus, a modular monolith platform for luxury retail e-commerce and real-time 3D auctions.

## 1. System Architecture and Business Rules

Detailed specifications located in `docs/architecture/`:

| Document                                                        | Summary                                                                                       | Scope                 |
| :-------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- | :-------------------- |
| [`ARCHITECTURE_MODEL.md`](./architecture/ARCHITECTURE_MODEL.md) | Modular Monolith architecture, Prisma database schema, and transactional boundaries           | Backend and Database  |
| [`BUSINESS_RULES.md`](./architecture/BUSINESS_RULES.md)         | Core business logic, escrow lifecycle, real-time 3D auctions, anti-sniping, and trust scoring | Business Logic        |
| [`DESIGN_PATTERNS.md`](./architecture/DESIGN_PATTERNS.md)       | Implemented patterns including Repository, Strategy, In-Process Events, and Unit of Work      | Software Architecture |

## 2. Engineering Standards and Code Quality

Detailed specifications located in `docs/standards/`:

| Document                                                     | Summary                                                                                                      | Scope                   |
| :----------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :---------------------- |
| [`CLEAN_CODE.md`](./standards/CLEAN_CODE.md)                 | Clean code criteria, separation of concerns, prohibition of meaningless inline comments, and TSDoc standards | Code Quality            |
| [`WRITING_STYLE.md`](./standards/WRITING_STYLE.md)           | Technical writing standards, neutral tone, typography rules, and documentation scope boundaries              | Documentation Standards |
| [`DESIGN_PRINCIPLES.md`](./standards/DESIGN_PRINCIPLES.md)   | Software design principles including SOLID, KISS, YAGNI, DRY, and Twelve-Factor App guidelines               | Engineering Tenets      |
| [`NAMING_CONVENTIONS.md`](./standards/NAMING_CONVENTIONS.md) | Universal naming conventions for TypeScript, React components, NestJS modules, and database models           | Consistency Standards   |

## 3. Frontend Engineering

Detailed specifications located in `docs/frontend/`:

| Document                                                | Summary                                                                                         | Target Audience                  |
| :------------------------------------------------------ | :---------------------------------------------------------------------------------------------- | :------------------------------- |
| [`FRONTEND_GUIDE.md`](./frontend/FRONTEND_GUIDE.md)     | Client-side development guide: React 19, Vite, Tailwind CSS, Axios, and real-time services      | Frontend Engineers               |
| [`UI_SPECIFICATION.md`](./frontend/UI_SPECIFICATION.md) | Layered routing layouts, design tokens, color palette, and component decomposition architecture | Frontend Engineers and Designers |

## 4. Backend Engineering

Detailed specifications located in `docs/backend/`:

| Document                                         | Summary                                                                                          | Target Audience   |
| :----------------------------------------------- | :----------------------------------------------------------------------------------------------- | :---------------- |
| [`BACKEND_GUIDE.md`](./backend/BACKEND_GUIDE.md) | Server-side development guide: NestJS 12, Prisma ORM 7, PostgreSQL, Redis, PayOS, and WebSockets | Backend Engineers |

## 5. API and Requirements Specifications

Detailed specifications located in `docs/api/` and `docs/srs/`:

- [Software Requirements Specification (SRS)](./srs/README.md): Comprehensive functional and non-functional requirements for the e-commerce and auction platform.
- [API Specifications Index](./api/README.md): Central catalog of HTTP REST API endpoints and real-time WebSocket contracts.
- [Order After-Sales Specification](./api/ORDER_AFTER_SALES.md): Protocol governing whole-order cancellations, returns, and dispute refunds.
