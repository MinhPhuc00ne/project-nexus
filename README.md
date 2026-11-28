# Project Nexus

[![CI](https://github.com/MinhPhuc00ne/project-nexus/actions/workflows/ci.yml/badge.svg)](https://github.com/MinhPhuc00ne/project-nexus/actions/workflows/ci.yml)
[![Docs](https://github.com/MinhPhuc00ne/project-nexus/actions/workflows/docs-pages.yml/badge.svg)](https://minhphuc00ne.github.io/project-nexus/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Project Nexus is a multi-shop e-commerce platform with real-time live auctions, an internal wallet and escrow ledger, GHN Express logistics integration, multi-tier operational moderation, and a conversational shopping assistant.

Engineering documentation and the interactive OpenAPI 3.0 reference are published at [minhphuc00ne.github.io/project-nexus](https://minhphuc00ne.github.io/project-nexus/).

## Repository Layout

```text
project-nexus/
├── .github/                 # GitHub Actions CI, GitHub Pages deployment, issue and PR templates
├── .husky/                  # Pre-commit formatting and Conventional Commits hook scripts
├── backend/                 # NestJS 12 modular monolith API, Prisma 7 schema, migrations, seeds, and Vitest suites
├── frontend/                # React 19 SPA, react-i18next (en and vi), Vitest, and React Testing Library
├── packages/
│   ├── contracts/           # @nexus/contracts: Zod 4 schemas, AppErrorCode, enums, and WS event contracts
│   └── config/              # @nexus/config: shared TypeScript configuration
├── docs/                    # Docusaurus 3 engineering portal, Scalar OpenAPI spec, and writing-style checker
├── e2e/                     # Playwright end-to-end smoke tests
├── infra/                   # Docker Compose stacks, Dockerfiles, Railway release scripts, and env sync tooling
├── scripts/                 # Repository-wide static checks (English-US language guard)
├── AGENTS.md                # Engineering handbook for AI coding agents and contributors
├── CONTRIBUTING.md          # Branching workflow, commit rules, and pre-PR verification checklist
├── package.json             # npm workspaces, Node 24 engines, and Turborepo task scripts
├── railway.toml             # Railway build, pre-deploy migration, and start configuration
├── turbo.json               # Turborepo pipeline configuration
└── vercel.json              # Vercel SPA deployment configuration
```

## Technology Stack and Architectural Decisions

| Layer                   | Technology                                                   | Architectural Choice and Responsibility                                                                           |
| :---------------------- | :----------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------- |
| Runtime and Monorepo    | Node 24, npm workspaces, Turborepo 2.11                      | Targets Node 24 LTS across local `.nvmrc`, Docker images, and CI with cached cross-workspace pipelines            |
| Modular Monolith        | NestJS 12, TypeScript 5.9 (`@nexus/contracts/nest`)          | Partitions 16 domain modules with acyclic import enforcement (`check:cycles`) inside one ACID process             |
| Contract Validation     | Zod 4 (`@nexus/contracts`), `StandardSchemaValidationPipe`   | Replaces fragmented types with `@ZodBody`, `@ZodQuery`, `@ZodParam`, WS `safeParse`, and 30 `AppErrorCode` values |
| Database and Locking    | PostgreSQL 17, Prisma 7 (`@prisma/adapter-pg`)               | Enforces ACID `$transaction` blocks, `SELECT ... FOR UPDATE` row locks, CHECK constraints, and partial indexes    |
| Cache and Rate Limiting | Redis 7 (`ioredis`), `@nestjs/throttler`                     | Powers distributed auction locks and an atomic Lua `RedisThrottlerStorage` with bounded LRU memory fallback       |
| Observability and Audit | `nestjs-pino`, `pino-http`, `AuditLogService`                | Propagates `X-Request-Id` via `AsyncLocalStorage`, redacts secrets, and writes structured admin audit logs        |
| HTTP Hardening          | `helmet`, `trust proxy`, shared CORS callback                | Applies CSP and security headers, graceful `enableShutdownHooks()`, and strict origin checks across HTTP and WS   |
| Realtime Gateways       | Socket.IO 4.8                                                | Runs isolated `/ws/auctions`, `/ws/chat`, and `/ws/notifications` gateways with explicit `NotificationPublisher`  |
| Frontend Portal         | React 19, Vite 8, Tailwind CSS v4, `react-i18next`           | Serves five portals using React Context and maps backend `AppErrorCode` responses to `en` and `vi` locales        |
| Payments and Logistics  | PayOS, NEXUS Pay Wallet, COD, GHN API v2                     | Processes idempotent checkout, `PaymentGroup` links, 7% escrow ledger holds, and GHN shipping webhooks            |
| AI and Media            | Google Gemini, Cloudinary                                    | Powers the rate-limited shopping assistant alongside Cloudinary and conditional `/uploads` asset storage          |
| Quality and Testing     | ESLint, `eslint-plugin-sonarjs`, Vitest 5.1, Playwright 1.65 | Runs unified Vitest coverage for both backend and frontend, plus Playwright smoke tests and `lang:check`          |
| Documentation           | Docusaurus 3, Scalar OpenAPI 3.0, Mermaid                    | Publishes searchable documentation and a controller-derived OpenAPI specification gated by `docs:check`           |

### Key Technical Choices

1. `@nexus/contracts` serves as the single source of truth for compile-time TypeScript types, runtime HTTP and WebSocket Zod validation, Swagger schema metadata, and canonical `AppErrorCode` constants translated by the frontend.
2. `nestjs-pino`, `RequestTrace` middleware, and `AuditLogService` correlate every HTTP request and administrative action through `X-Request-Id` while redacting authorization tokens and credentials from logs.
3. Explicit `NotificationPublisher` and `OrderExpirationService` replace implicit Prisma proxy side effects and idle polling loops with traceable post-commit batching and distributed-lock sweeps.
4. `env.schema.ts` and `npm run env:check` allow zero-secret local startup from `.env.example` while failing fast in production when required secrets or placeholder values remain unconfigured.

## Quick Start

### Prerequisites

- Node.js 24 or later and npm 10 or later.
- Docker and Docker Compose for local PostgreSQL 17 and Redis 7 containers.

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/MinhPhuc00ne/project-nexus.git
cd project-nexus

# 2. Create local environment file
cp .env.example .env

# 3. Install dependencies across all workspaces
npm install

# 4. Build shared @nexus/contracts package
npm run build:contracts

# 5. Start PostgreSQL 17 and Redis 7 containers
npm run docker:infra

# 6. Generate Prisma Client, apply migrations, bootstrap system rows, and optionally seed demo data
npm run db:generate
npm run db:deploy
npm run db:bootstrap
npm run seed:demo

# 7. Start Backend (3000) and Frontend (5173) concurrently
npm run dev
```

### Full Stack via Docker

```bash
npm run docker:full
npm run docker:logs
npm run docker:down
```

## Verification Commands

```bash
npm run verify
```

Individual verification scripts remain available for targeted checks:

```bash
npm run format:check
npm run lint
npm run i18n:check
npm run lang:check
npm run env:check -- --env-file .env.example
npm run docs:check
npm run check:cycles
npm run build
npm run typecheck
npm test
```

## Documentation Portal

Run the documentation portal locally or regenerate the OpenAPI specification:

```bash
# Export OpenAPI 3.0 spec from NestJS Swagger
npm run docs:openapi

# Validate OpenAPI schema and Engineering Writing Style Guide rules
npm run docs:check

# Start local Docusaurus server
npm run docs:dev

# Build static site for GitHub Pages
npm run docs:build
```

Key guides in `docs/docs/`:

- [intro.md](docs/docs/intro.md) covers the platform overview and technology stack.
- [getting-started/quickstart.md](docs/docs/getting-started/quickstart.md) explains local and Docker setup.
- [architecture/system-overview.md](docs/docs/architecture/system-overview.md) documents the modular monolith architecture and event flows.
- [architecture/database-schema.md](docs/docs/architecture/database-schema.md) describes the PostgreSQL 17 and Prisma 7 data model.
