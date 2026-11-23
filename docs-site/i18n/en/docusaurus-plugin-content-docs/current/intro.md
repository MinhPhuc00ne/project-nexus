---
slug: /
sidebar_position: 1
title: Project Nexus Overview
---

# Project Nexus

**Project Nexus** is an enterprise Multi-Shop E-Commerce platform combined with **real-time 3D live auctions**, an internal wallet & Escrow ledger, GHN Express logistics integration, multi-tier operational moderation, and an AI shopping assistant.

> **Documentation Principle**: Every page in this Docusaurus portal is verified directly against the live codebase (`backend/prisma/schema.prisma`, `backend/src/modules/*`, `frontend/src/*`, `packages/types/src/*`), and the interactive REST API Reference is generated directly from NestJS Swagger (`docs-site/static/openapi/nexus-openapi.json`).

## Five User Portals

| Portal            | Route Prefix                                   | Target Users                               | Core Capabilities                                                                                                               |
| :---------------- | :--------------------------------------------- | :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ |
| **Guest**         | `/`, `/search`, `/product/:id`, `/auction/:id` | Visitors & browsers                        | 3-level category browsing, product search, shop storefront, live 3D auction viewing, guest cart                                 |
| **Buyer**         | `/buyer/*`, `/cart`, `/checkout`               | Authenticated buyers                       | PayOS / NEXUS Pay Wallet / COD checkout, GHN tracking, bidding, wallet top-up/withdrawal, disputes & returns, reputation        |
| **Seller**        | `/seller/*`                                    | Shop owners (mode switch without re-login) | Product & variant catalog, multi-warehouse inventory, order fulfillment & GHN shipping, auction consignment, finance & payouts  |
| **Support Staff** | `/staff/*`                                     | Operations staff (`@staff.com`)            | Real-time support ticket queue, seller upgrade approvals, dispute mediation, auction support, FAQ & banners                     |
| **Admin**         | `/admin/*`                                     | Platform administrators                    | Full-platform oversight, User/Seller/Shop/Category/Product/Order/Auction governance, refund reconciliation, platform fee config |

## Core Tech Stack

| Layer                    | Technology & Version                                                             | Primary Role                                                                         |
| :----------------------- | :------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **Monorepo**             | npm workspaces + Turborepo `2.11`                                                | Cross-workspace build, lint, test, coverage, and caching                             |
| **Shared Contracts**     | TypeScript `5.9` (`@nexus/types`, `@nexus/config`)                               | Single source of truth for Enums, DTOs, and WebSocket event names                    |
| **Backend**              | NestJS `12` (Level 1.5 Modular Monolith)                                         | 10 isolated domain modules + `@nestjs/event-emitter` in-process bus                  |
| **Database & ORM**       | PostgreSQL `17` + Prisma `7`                                                     | Relational storage, ACID `$transaction`, pessimistic row locking                     |
| **Cache & Realtime**     | Redis `7` + Socket.IO `4.8`                                                      | Distributed auction locks, race-condition protection, real-time chat & notifications |
| **Payments & Logistics** | PayOS (VietQR), NEXUS Pay Wallet, COD, GHN API v2                                | Idempotent checkout (`Idempotency-Key`), `7%` Escrow, shipment & webhook handling    |
| **AI & Media**           | Google Gemini (`gemini-3.1-flash-lite`) + Cloudinary                             | Rate-limited shopping AI assistant, media/certificate/3D model storage               |
| **Frontend**             | React `19.3` + Vite `8.3` + Tailwind CSS `v4`                                    | 5-portal SPA, `react-i18next` (10 namespaces), TanStack Query, Zustand               |
| **Quality & Testing**    | SonarLint, `eslint-plugin-sonarjs`, `node:test`, Vitest `5.1`, Playwright `1.65` | 3-tier quality gate and 3-tier automated testing                                     |
| **Documentation**        | Docusaurus `3` + Scalar OpenAPI + Mermaid + Local Search                         | Bilingual `vi`/`en` engineering portal, interactive API Reference, GitLab Wiki sync  |

## Monorepo Layout

```text
project-nexus/
├── backend/                 # NestJS 12 API, Prisma 7 schema, migrations, seed, node:test
├── frontend/                # React 19 SPA, i18n (vi/en), Vitest + React Testing Library
├── packages/
│   ├── types/               # @nexus/types: shared Enums, Models, WebSocket Events
│   └── config/              # @nexus/config: shared TypeScript/ESLint configs
├── docs-site/               # Docusaurus v3 + Scalar OpenAPI + check-docs-parity + wiki sync
├── e2e/                     # Playwright E2E smoke tests
├── infra/                   # Docker Compose (Postgres, Redis, Backend, Frontend) & Sonar templates
└── .gitlab/                 # GitLab CI/CD & Merge Request templates
```

## Role-Based Reading Path

- **Onboarding Engineers**: [Quickstart](/getting-started/quickstart) → [Environment Variables](/getting-started/environment) → [Code Standards](/quality/code-standards).
- **Backend Engineers**: [System Overview](/architecture/system-overview) → [Database Schema](/architecture/database-schema) → [Business Rules](/architecture/business-rules) → [Backend Modules](/modules/overview) → [API Reference](/api-reference).
- **Frontend Engineers**: [Frontend Architecture](/frontend/architecture) → [UI Specification](/frontend/ui-specification) → [i18n Guide](/frontend/i18n-guide) → [Realtime Events](/architecture/realtime-events).
- **QA / DevOps / Release**: [3-Tier Testing & CI](/quality/testing-ci) → [State Machines](/architecture/state-machines) → [Operations Runbook](/operations/runbook).
