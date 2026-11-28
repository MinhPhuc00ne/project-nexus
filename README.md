# Project Nexus

[![CI](https://github.com/MinhPhuc00ne/project-nexus/actions/workflows/ci.yml/badge.svg)](https://github.com/MinhPhuc00ne/project-nexus/actions/workflows/ci.yml)
[![Docs](https://github.com/MinhPhuc00ne/project-nexus/actions/workflows/docs-pages.yml/badge.svg)](https://minhphuc00ne.github.io/project-nexus/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Project Nexus is a multi-shop e-commerce platform with real-time live auctions, an internal wallet and escrow ledger, GHN Express logistics integration, multi-tier operational moderation, and a conversational shopping assistant.

Engineering documentation and the interactive OpenAPI 3.0 reference are published at [minhphuc00ne.github.io/project-nexus](https://minhphuc00ne.github.io/project-nexus/).

## Repository Layout

```text
project-nexus/
├── .github/                           # GitHub Actions CI, GitHub Pages deployment, issue and PR templates
├── backend/                           # NestJS 12 modular monolith API, Prisma 7 schema, migrations, seed, node:test
├── frontend/                          # React 19 SPA, i18n (en/vi), Vitest and React Testing Library
├── packages/
│   ├── types/                         # @nexus/types shared enums, DTOs, and WebSocket event contracts
│   └── config/                        # @nexus/config shared TypeScript and ESLint configs
├── docs/                              # Docusaurus v3 engineering portal, Scalar OpenAPI, and style checker
├── e2e/                               # Playwright end-to-end smoke tests
├── infra/                             # Docker Compose, production Dockerfiles, and SonarCloud template
├── package.json                       # npm workspaces and Turborepo task scripts
└── turbo.json                         # Turborepo pipeline configuration
```

## Technology Stack

| Layer                  | Technology                               | Role                                                                    |
| :--------------------- | :--------------------------------------- | :---------------------------------------------------------------------- |
| Monorepo               | npm workspaces and Turborepo             | Workspace orchestration, build caching, and task execution              |
| Backend                | NestJS 12, TypeScript 5.9, Prisma 7      | Modular monolith REST API, event bus, and ACID transactions             |
| Database and Cache     | PostgreSQL 17 and Redis 7                | Relational persistence, distributed auction locks, and rate limiting    |
| Realtime               | Socket.IO 4.8                            | Live auction rooms, chat messaging, and user notifications              |
| Frontend               | React 19, Vite 8, Tailwind CSS v4        | Five-portal SPA with React Context state management and `react-i18next` |
| Payments and Logistics | PayOS, NEXUS Pay Wallet, COD, GHN API v2 | Idempotent checkout, 7% escrow ledger, and shipment webhooks            |
| AI and Media           | Google Gemini and Cloudinary             | Rate-limited conversational assistant, media, and 3D asset storage      |
| Documentation          | Docusaurus 3 and Scalar OpenAPI          | Static documentation portal with 236 verified API paths                 |

## Quick Start

### Prerequisites

- Node.js `>= 20.x` (version `22.x` or `24.x` is recommended for native `lcov` coverage in `node:test`).
- npm `>= 10.x`.
- Docker and Docker Compose.

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/MinhPhuc00ne/project-nexus.git
cd project-nexus

# 2. Create local environment file
cp .env.example .env

# 3. Install dependencies across all workspaces
npm install

# 4. Build shared @nexus/types contract package
npm run build:types

# 5. Start PostgreSQL 17 and Redis 7 containers
npm run docker:infra

# 6. Generate Prisma Client, apply migrations, and seed sample data
npm run prisma:generate
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
npm run prisma:seed

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
npm run format:check
npm run lint
npm run i18n:check
npm run docs:check
npm run docs:build
npm run build
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

- [intro.md](docs/docs/intro.md): platform overview and technology stack.
- [getting-started/quickstart.md](docs/docs/getting-started/quickstart.md): local and Docker setup guide.
- [architecture/system-overview.md](docs/docs/architecture/system-overview.md): modular monolith architecture and event flows.
- [architecture/database-schema.md](docs/docs/architecture/database-schema.md): PostgreSQL 17 and Prisma 7 data model.
- [architecture/business-rules.md](docs/docs/architecture/business-rules.md): escrow, reputation, and auction rules.
- [architecture/state-machines.md](docs/docs/architecture/state-machines.md): order, escrow, after-sales, and auction lifecycles.
- [architecture/realtime-events.md](docs/docs/architecture/realtime-events.md): Socket.IO gateway contracts.
- [modules/overview.md](docs/docs/modules/overview.md): summary of all backend modules.
- [modules/chatbot.md](docs/docs/modules/chatbot.md): conversational AI architecture and guardrails.
- [frontend/architecture.md](docs/docs/frontend/architecture.md): frontend portals, contexts, and API layer.
- [quality/code-standards.md](docs/docs/quality/code-standards.md): coding standards and three-tier Sonar quality gate.
- [quality/testing-ci.md](docs/docs/quality/testing-ci.md): unit, integration, and E2E testing pipelines.
- [operations/runbook.md](docs/docs/operations/runbook.md): troubleshooting and operational procedures.

## Contributing and Security

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for branching, Conventional Commits, and pull request requirements.
- Read [SECURITY.md](SECURITY.md) for vulnerability disclosure procedures.

## License

Project Nexus is licensed under the [MIT License](LICENSE).
