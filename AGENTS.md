# AGENTS.md — Project Nexus Engineering Handbook

Repository handbook for AI coding agents and contributors working in Project Nexus (Multi-Shop E-Commerce and Real-Time 3D Live Auctions).

## 1. Monorepo Architecture Map

| Workspace or Path     | Package Name       | Responsibility                                                                                                                                                                     |
| :-------------------- | :----------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/`            | `nexus-backend`    | NestJS 12 modular monolith using Prisma 7, PostgreSQL 17, Redis 7, Pino, and Socket.IO across 16 domain modules                                                                    |
| `backend/src/core/`   | `nexus-backend`    | Shared config, Prisma, Redis, distributed locks, audit logs, domain events, filters, interceptors, health probes, mail, moderation, notifications, security, settings, and storage |
| `frontend/`           | `nexus-frontend`   | React 19 and Vite SPA serving 5 portals (Guest, Buyer, Seller, Staff, Admin) with `react-i18next` (`en` and `vi` across 10 namespaces)                                             |
| `packages/contracts/` | `@nexus/contracts` | Single source of truth for Zod 4 schemas, canonical `AppErrorCode`s, response envelopes, domain enums, WebSocket event contracts, and `@nexus/contracts/nest` decorators           |
| `packages/config/`    | `@nexus/config`    | Shared TypeScript base configuration                                                                                                                                               |
| `docs/`               | `nexus-docs`       | Docusaurus 3 documentation portal with Scalar OpenAPI 3.0 reference (`docs/static/openapi/nexus-openapi.json`)                                                                     |
| `infra/`              | —                  | Dockerfiles (`Dockerfile.backend`, `Dockerfile.frontend`), Compose stacks (`docker-compose.yml`, `docker-compose.demo.yml`), and Railway env sync scripts                          |
| `e2e/`                | —                  | Playwright end-to-end smoke test suite (`e2e/tests/`)                                                                                                                              |

Backend domain modules live under `backend/src/modules/` (`admin`, `after-sales`, `auction`, `auth`, `cart`, `catalog`, `chat`, `fulfillment`, `media`, `notifications`, `orders`, `payments`, `reviews`, `treasury`, `users`, and `wallet`), exposing WebSocket gateways at `/ws/notifications`, `/ws/auctions`, and `/chat`.

## 2. Canonical npm Commands

Always use the normalized root `package.json` commands:

| Command                | Purpose                                                                                                                                           |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run verify`       | Runs `format:check`, `lint`, `i18n:check`, `lang:check`, `docs:check`, `check:cycles`, `build`, `typecheck`, and `test`                           |
| `npm run dev`          | Starts all workspace development processes via Turborepo                                                                                          |
| `npm run dev:backend`  | Starts the NestJS backend in watch mode                                                                                                           |
| `npm run dev:frontend` | Starts the Vite frontend development server                                                                                                       |
| `npm run build`        | Builds all workspaces via Turborepo (`build:contracts`, `build:backend`, `build:frontend` target individual workspaces)                           |
| `npm run typecheck`    | Typechecks all workspaces, backend tests, frontend tests, and database seeds                                                                      |
| `npm run lint`         | Runs ESLint and `eslint-plugin-sonarjs` (`npm run lint:fix` applies auto-fixes)                                                                   |
| `npm run format`       | Formats source files with Prettier (`npm run format:check` verifies formatting)                                                                   |
| `npm run check:cycles` | Verifies the backend import graph has no module cycles, file cycles, or `forwardRef` usage                                                        |
| `npm run env:check`    | Validates environment configuration against `env.schema.ts`                                                                                       |
| `npm run i18n:check`   | Verifies `en` and `vi` frontend translation parity                                                                                                |
| `npm run lang:check`   | Enforces English-US rules across non-exempt source files                                                                                          |
| `npm test`             | Runs backend and frontend Vitest suites via Turborepo (`test:backend`, `test:frontend`, `test:coverage`, `test:e2e:smoke` target specific suites) |
| `npm run db:generate`  | Generates the Prisma client                                                                                                                       |
| `npm run db:migrate`   | Runs local `prisma migrate dev`                                                                                                                   |
| `npm run db:deploy`    | Applies pending migrations via `prisma migrate deploy`                                                                                            |
| `npm run db:bootstrap` | Runs idempotent system row bootstrap (`system.ts`)                                                                                                |
| `npm run db:verify`    | Verifies database CHECK constraints and partial indexes                                                                                           |
| `npm run db:studio`    | Opens Prisma Studio                                                                                                                               |
| `npm run admin:create` | Creates an administrator account                                                                                                                  |
| `npm run seed:demo`    | Seeds demo marketplace data (`seed:demo:reset` resets before seeding; never run in production)                                                    |
| `npm run docker:infra` | Starts PostgreSQL and Redis containers via `infra/docker-compose.yml`                                                                             |
| `npm run docker:full`  | Builds and starts the full Docker stack (`docker:demo` includes demo seeds)                                                                       |
| `npm run docker:down`  | Stops full-stack containers (`docker:clean` removes volumes; `docker:logs` streams logs)                                                          |
| `npm run docs:openapi` | Regenerates `docs/static/openapi/nexus-openapi.json` from NestJS controllers                                                                      |
| `npm run docs:check`   | Validates the OpenAPI specification and English documentation style rules                                                                         |
| `npm run docs:dev`     | Starts the Docusaurus development server (`docs:build` builds the static site)                                                                    |

## 3. Coding and Architecture Rules

- Strict type safety requires zero `any` (`@typescript-eslint/no-explicit-any: error`), preferring Zod inference and explicit interfaces.
- Backend modules and files must remain acyclic with zero `forwardRef` usage as verified by `npm run check:cycles`.
- Module boundaries prohibit importing another module's internal `utils/`, `helpers/`, `*.helper`, or `gateways/` as enforced by ESLint `no-restricted-imports`; move shared utilities to `backend/src/core/` or inject exported services, while public request schemas under `dtos/` may be imported across modules.
- All source code, comments, identifiers, logs, OpenAPI annotations, and documentation must use English-US, excluding `frontend/src/i18n/locales/vi/`, `backend/prisma/seeds/demo/`, and Vietnamese content-moderation keyword lists.
- Keep frontend visual design, layout, spacing, styling, and user flows completely unchanged unless a task explicitly asks for UI changes.
- Verify local git identity is `MinhPhuc00ne` via `git config user.name`, branch each milestone from `dev`, verify cleanly, and open and merge pull requests into `dev` via `gh` CLI; never push directly to `main`, never force-merge `dev` into `main`, and never modify live Railway or Vercel deployments or secrets directly.
- Never commit `repomix-output.xml` and never add it to `.gitignore`; delete it if present and no longer needed, and store local agent scratchpads in gitignored `.agents/PROGRESS.md` and `.agents/DECISIONS.md`.
