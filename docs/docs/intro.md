---
slug: /
sidebar_position: 1
title: Project Nexus Overview
---

# Project Nexus

Project Nexus is a multi-shop e-commerce platform combined with real-time 3D live auctions, an internal wallet and escrow ledger, GHN Express logistics integration, multi-tier operational moderation, and a conversational shopping assistant.

> Documentation principle: every page in this portal is verified directly against the codebase (`backend/prisma/schema.prisma`, `backend/src/modules/*`, `frontend/src/*`, `packages/contracts/src/*`), and the interactive API reference is generated from NestJS Swagger (`docs/static/openapi/nexus-openapi.json`).

## Five User Portals

| Portal        | Route Prefix                                   | Target Users                               | Core Capabilities                                                                                                                                |
| :------------ | :--------------------------------------------- | :----------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest         | `/`, `/search`, `/product/:id`, `/auction/:id` | Visitors and browsers                      | Three-level category browsing, product search, shop storefronts, live 3D auction viewing, guest cart                                             |
| Buyer         | `/buyer/*`, `/cart`, `/checkout`               | Authenticated buyers                       | PayOS, NEXUS Pay Wallet, and COD checkout, GHN tracking, bidding, wallet top-ups and withdrawals, disputes and returns, reputation               |
| Seller        | `/seller/*`                                    | Shop owners (mode switch without re-login) | Product and variant catalog, multi-warehouse inventory, order fulfillment and GHN shipping, auction consignment, finance and payouts             |
| Support Staff | `/staff/*`                                     | Operations staff (`@staff.com`)            | Real-time support ticket queue, seller upgrade approvals, dispute mediation, auction support, FAQ and banners                                    |
| Admin         | `/admin/*`                                     | Platform administrators                    | Full-platform oversight, user, seller, shop, category, product, order, and auction governance, refund reconciliation, platform fee configuration |

## Core Tech Stack

| Layer                  | Technology and Version                                    | Primary Role                                                                           |
| :--------------------- | :-------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| Monorepo               | npm workspaces and Turborepo `2.11`                       | Cross-workspace build, lint, test, coverage, and caching                               |
| Shared Contracts       | TypeScript `5.9` (`@nexus/contracts`, `@nexus/config`)    | Single source of truth for Zod 4 schemas, `AppErrorCode`, enums, and WS event names    |
| Backend                | NestJS `12` (Modular Monolith)                            | Sixteen isolated domain modules and `@nestjs/event-emitter` in-process bus             |
| Database and ORM       | PostgreSQL `17` and Prisma `7`                            | Relational storage, ACID `$transaction`, pessimistic row locking                       |
| Cache and Realtime     | Redis `7` and Socket.IO `4.8`                             | Distributed auction locks, race-condition protection, real-time chat and notifications |
| Payments and Logistics | PayOS (VietQR), NEXUS Pay Wallet, COD, GHN API v2         | Idempotent checkout (`Idempotency-Key`), 7% escrow, shipment and webhook handling      |
| AI and Media           | Google Gemini and Cloudinary                              | Rate-limited shopping AI assistant, media, certificate, and 3D model storage           |
| Frontend               | React `19.3`, Vite `8.3`, and Tailwind CSS `v4`           | Five-portal SPA, React Context state management, Axios client, and `react-i18next`     |
| Quality and Testing    | `eslint-plugin-sonarjs`, Vitest `5.1`, Playwright `1.65`  | Unified Vitest runner, static quality gate, and E2E smoke tests                        |
| Documentation          | Docusaurus `3`, Scalar OpenAPI, Mermaid, and Local Search | English engineering portal deployed to GitHub Pages with interactive API reference     |

## Monorepo Layout

```text
project-nexus/
├── backend/                 # NestJS 12 API, Prisma 7 schema, migrations, seeds, Vitest
├── frontend/                # React 19 SPA, i18n (vi/en), Vitest + React Testing Library
├── packages/
│   ├── contracts/           # @nexus/contracts: Zod 4 schemas, AppErrorCode, Enums, WebSocket Events
│   └── config/              # @nexus/config: shared TypeScript/ESLint configs
├── docs/                    # Docusaurus v3 + Scalar OpenAPI + style checker
├── e2e/                     # Playwright E2E smoke tests
├── infra/                   # Docker Compose (Postgres, Redis, Backend, Frontend) and Sonar templates
└── .github/                 # GitHub Actions CI, GitHub Pages deployment, issue and PR templates
```

## Role-Based Reading Path

- Onboarding engineers should start with [Quickstart](/getting-started/quickstart), [Environment Variables](/getting-started/environment), and [Code Standards](/quality/code-standards).
- Backend engineers should read [System Overview](/architecture/system-overview), [Database Schema](/architecture/database-schema), [Business Rules](/architecture/business-rules), [Backend Modules](/modules/overview), and [API Reference](/api-reference).
- Frontend engineers should read [Frontend Architecture](/frontend/architecture), [Frontend File Guide](/frontend/file-guide), [UI Specification](/frontend/ui-specification), [i18n Guide](/frontend/i18n-guide), and [Realtime Events](/architecture/realtime-events).
- QA and release engineers should review [Testing and CI](/quality/testing-ci), [State Machines](/architecture/state-machines), and [Operations Runbook](/operations/runbook).
