# AGENTS.md — Project Nexus Engineering Handbook

Repository handbook for AI coding agents and contributors working in **Project Nexus** (Multi-Shop E-Commerce and Real-Time 3D Live Auctions).

## 1. Monorepo Architecture Map

- **`backend/` (`nexus-backend`)**: NestJS 12 modular monolith using Prisma 7, PostgreSQL 17, Redis 7, and Socket.IO.
  - **16 Domain Modules (`backend/src/modules/`)**: `admin`, `after-sales`, `auction`, `auth`, `cart`, `catalog`, `chat`, `fulfillment`, `media`, `notifications`, `orders`, `payments`, `reviews`, `treasury`, `users`, `wallet`.
  - **Core Infrastructure (`backend/src/core/`)**: shared config, Prisma service, Redis, distributed locks, domain events, exception filters, response interceptors, health checks, mail, moderation, navigation, notifications, provider adapters, realtime metrics, security, settings, storage, and validation.
  - **WebSocket Gateways**: `/ws/notifications`, `/ws/auctions`, and `/chat`.
- **`frontend/` (`nexus-frontend`)**: React 19 + Vite SPA serving 5 portals (Guest, Buyer, Seller, Staff, Admin) with `react-i18next` (`en` and `vi` across 10 namespaces).
- **`packages/contracts/` (`@nexus/contracts`)**: Single source of truth for Zod 4 schemas, canonical `AppErrorCode`s, response envelopes, domain enums, WebSocket event contracts, and `@nexus/contracts/nest` validation decorators (`@ZodBody`, `@ZodQuery`, `@ZodParam`).
- **`packages/config/` (`@nexus/config`)**: Shared TypeScript base configuration.
- **`docs/` (`nexus-docs`)**: Docusaurus 3 documentation portal with Scalar OpenAPI 3.0 reference (`docs/static/openapi/nexus-openapi.json`).
- **`infra/`**: Dockerfiles (`Dockerfile.backend`, `Dockerfile.frontend`), Compose stacks (`docker-compose.yml`, `docker-compose.demo.yml`), and deployment config (`railway.toml`, `vercel.json`).
- **`e2e/`**: Playwright end-to-end smoke test suite (`e2e/tests/`).

## 2. Canonical npm Commands

Always use the normalized root `package.json` commands:

- **Pre-PR Verification Gate**:
  - `npm run verify` — runs `format:check`, `lint`, `i18n:check`, `docs:check`, `check:cycles`, `build`, `typecheck`, and `test`.
- **Development**:
  - `npm run dev` — start all workspace dev processes via Turborepo
  - `npm run dev:backend` — start NestJS backend in watch mode
  - `npm run dev:frontend` — start Vite frontend dev server
- **Build & Typecheck**:
  - `npm run build` — build all workspaces via Turborepo
  - `npm run build:contracts` / `npm run build:backend` / `npm run build:frontend`
  - `npm run typecheck` — typecheck all workspaces, backend tests, frontend tests, and database seeds
- **Quality & Static Analysis**:
  - `npm run lint` / `npm run lint:fix`
  - `npm run format` / `npm run format:check`
  - `npm run check:cycles` — verify backend import graph has no module cycles, file cycles, or `forwardRef`
  - `npm run i18n:check` — verify `en` and `vi` frontend translation parity
- **Testing**:
  - `npm test` — run unit/integration test suites via Turborepo
  - `npm run test:backend` / `npm run test:frontend`
  - `npm run test:coverage` — run coverage suites for backend and frontend
  - `npm run test:e2e:smoke` — run Playwright browser smoke tests
- **Database & Seeding**:
  - `npm run db:generate` — generate Prisma client
  - `npm run db:migrate` — run local `prisma migrate dev`
  - `npm run db:deploy` — apply pending migrations (`prisma migrate deploy`)
  - `npm run db:bootstrap` — idempotent system row bootstrap (`system.ts`)
  - `npm run db:verify` — verify database CHECK constraints and partial indexes
  - `npm run db:studio` — open Prisma Studio
  - `npm run admin:create` — create an administrator account
  - `npm run seed:demo` / `npm run seed:demo:reset` — seed demo marketplace data (never run in production)
- **Docker**:
  - `npm run docker:infra` — start PostgreSQL and Redis containers
  - `npm run docker:full` — build and start the full stack
  - `npm run docker:demo` — start the full stack with demo seed data
  - `npm run docker:down` / `npm run docker:clean` / `npm run docker:logs`
- **Documentation**:
  - `npm run docs:openapi` — regenerate `docs/static/openapi/nexus-openapi.json` from NestJS controllers
  - `npm run docs:check` — validate OpenAPI spec and English documentation rules
  - `npm run docs:dev` / `npm run docs:build`

## 3. Coding and Architecture Rules

- **Strict Type Safety**: Zero `any` (`@typescript-eslint/no-explicit-any: error`). Prefer Zod inference and explicit interfaces.
- **Acyclic Modular Monolith**: Backend modules and files must remain acyclic with zero `forwardRef` usage (`npm run check:cycles`).
- **Module Boundary Enforcement**: Never import another module's internal `utils/`, `helpers/`, `*.helper`, or `gateways/` (enforced by ESLint `no-restricted-imports`). Move shared utilities to `backend/src/core/` or inject exported services. Public request schemas under `dtos/` may be imported across modules.
- **English-US Standard**: All source code, comments, identifiers, logs, OpenAPI annotations, and documentation must be written in English-US (excluding `frontend/src/i18n/locales/vi/`, `backend/prisma/seeds/demo/`, and Vietnamese content-moderation keyword lists).
- **UI/UX Preservation**: Keep frontend visual design, layout, spacing, styling, and user flows completely unchanged unless a task explicitly asks for UI changes.
- **Git & PR Workflow**:
  - Verify local git identity is `MinhPhuc00ne` (`git config user.name`).
  - Branch each milestone from `dev`, verify cleanly, and open/merge PRs into `dev` via `gh` CLI.
  - Never push directly to `main`, never force-merge `dev` into `main`, and never modify live Railway or Vercel deployments/secrets directly.
- **Workspace Hygiene**: Never commit `repomix-output.xml` and never add it to `.gitignore`; delete it if present and no longer needed. Local agent scratchpads live in gitignored `.agents/PROGRESS.md` and `.agents/DECISIONS.md`.
