# Project Nexus

Project Nexus is an enterprise full-stack platform combining traditional multi-shop e-commerce with real-time 3D live auctions. The repository is organized as an NPM Workspaces and Turborepo monorepo with symmetric package boundaries and a Level 1.5 Modular Monolith architecture.

## 1. Technology Stack

| System Layer           | Category             | Technology and Version                              | Primary Responsibility                                                            |
| :--------------------- | :------------------- | :-------------------------------------------------- | :-------------------------------------------------------------------------------- |
| Monorepo Orchestration | Monorepo Workspaces  | npm workspaces and Turborepo                        | Orchestrates build, lint, and formatting pipelines with intelligent task caching  |
| Shared Contracts       | Type-safe Contracts  | TypeScript ^5.9.3 (`@nexus/types`)                  | Serves as the single source of truth for enums, events, and data transfer objects |
| Shared Configuration   | Shared Tooling       | `@nexus/config`                                     | Provides uniform base TypeScript compiler options across all packages             |
| Server Application     | Backend Framework    | NestJS ^12.1.2                                      | Implements Level 1.5 Modular Monolith architecture across ten isolated modules    |
| Database and ORM       | Relational Data      | PostgreSQL 17 and Prisma ORM ^7.10.0                | Manages relational schemas, ACID transactions, and automated migrations           |
| Cache and Real-Time    | Cache and Events     | Redis 7 and Socket.IO ^4.8.4                        | Handles session caching, distributed locks, and WebSocket streaming               |
| Payment Gateway        | Financial Processing | PayOS VietQR, NEXUS Pay Wallet, and COD             | Processes multi-channel payments and coordinates automated escrow disbursements   |
| Logistics Carrier      | Fulfillment          | GHN Express API                                     | Calculates shipping rates, parses administrative addresses, and issues waybills   |
| User Interface         | Frontend Framework   | React ^19.3.0, Vite ^8.3.4, and Tailwind CSS ^4.3.3 | Delivers client interfaces for buyers, sellers, support staff, and administrators |
| Infrastructure         | Containerization     | Docker and Docker Compose                           | Provides reproducible containerized environments for development and evaluation   |

## 2. Repository Structure

```text
project-nexus/
├── .husky/                            # Automated Git hooks for pre-commit and commit-msg verification
├── .gitlab/                           # Merge request templates and GitLab configuration
├── .gitlab-ci.yml                     # Three-stage CI/CD pipeline definition (validate, build, test)
├── docs/                              # Comprehensive technical documentation and architectural standards
│   ├── api/                           # REST API endpoints, WebSocket contracts, and escrow lifecycles
│   ├── architecture/                  # Modular Monolith boundaries, business rules, and design patterns
│   ├── backend/                       # NestJS service development and database administration guide
│   ├── frontend/                      # React application architecture and state management guide
│   ├── srs/                           # Software requirements specification and transaction workflows
│   └── standards/                     # Clean code metrics, naming conventions, and writing style rules
├── infra/                             # Dockerfiles and Docker Compose service configurations
├── packages/
│   ├── config/                        # Shared base TypeScript configurations
│   └── types/                         # Shared type definitions and contracts (@nexus/types)
├── backend/                           # NestJS modular monolithic server application
│   ├── prisma/                        # Prisma schema, migrations, and database seed scripts
│   ├── src/                           # Business domain modules (auth, users, catalog, commerce, auction...)
│   └── test/                          # Unit and integration test suites executed with node:test
├── frontend/                          # React client application
│   ├── src/                           # UI components, layout containers, routing tables, and services
│   └── index.html                     # Frontend document entry point
├── turbo.json                         # Turborepo task pipeline orchestration
├── package.json                       # Root workspace definitions and maintenance scripts
└── README.md                          # Repository overview, quickstart instructions, and documentation index
```

## 3. Local Development Quickstart

### Prerequisites

- Node.js version 20.x or higher
- npm version 10.x or higher
- Docker and Docker Compose running locally

### Installation and Initialization

Install all dependencies across the monorepo workspace:

```bash
npm install
```

Start background infrastructure dependencies including PostgreSQL 17 and Redis 7:

```bash
npm run docker:infra
```

Generate the Prisma client artifacts, run database migrations, and seed initial data:

```bash
npx prisma generate --schema=backend/prisma/schema.prisma
npx prisma migrate dev --schema=backend/prisma/schema.prisma
npm run db:seed
```

Start the complete application stack (backend and frontend concurrently in development mode):

```bash
npm run dev
```

### Local Service Endpoints

- Frontend Client Application: `http://localhost:5173`
- Backend REST API Server: `http://localhost:3000`
- Interactive Swagger API Documentation: `http://localhost:3000/api/docs`

### Full Containerized Mode

For standalone evaluation or production-like verification without local Node.js toolchains:

```bash
npm run docker:full
```

## 4. Verification and Quality Gates

Run quality verification commands locally prior to committing changes:

```bash
# Verify formatting compliance across all repository files
npm run format:check

# Run static analysis and linting checks across all packages
npm run lint

# Build all monorepo packages and applications
npx turbo run build

# Execute automated unit and integration tests
npm test
```

## 5. Engineering Wiki & Documentation

All project documentation is consolidated into the bilingual (**VI / EN**) Docusaurus v3 Engineering Wiki at `docs-site/` (with auto-exported OpenAPI Reference from NestJS Swagger):

```bash
# Start local Engineering Wiki server
npm run docs:dev

# Export latest OpenAPI spec from NestJS Swagger and verify bilingual parity
npm run docs:openapi && npm run docs:check

# Build static Wiki for production
npm run docs:build

# Sync Wiki pages to GitLab Wiki (requires authenticated glab CLI)
npm run docs:sync-gitlab-wiki
```

### Key Wiki Sections (`docs-site/docs/`)

- [intro.md](docs-site/docs/intro.md): Project overview and verified technology stack.
- [getting-started/quickstart.md](docs-site/docs/getting-started/quickstart.md): Local and Docker quickstart guide.
- [architecture/system-overview.md](docs-site/docs/architecture/system-overview.md): Modular Monolith Level 1.5 architecture and boundaries.
- [architecture/database-schema.md](docs-site/docs/architecture/database-schema.md): PostgreSQL 17 and Prisma 7 schema overview.
- [architecture/business-rules.md](docs-site/docs/architecture/business-rules.md): Code-verified business rules (reputation, escrow, anti-sniping).
- [architecture/state-machines.md](docs-site/docs/architecture/state-machines.md): Order, Escrow, After-Sales, and Auction lifecycles.
- [architecture/realtime-events.md](docs-site/docs/architecture/realtime-events.md): Socket.IO gateway contracts (`/ws/auctions`, `/ws/chat`, `/ws/notifications`).
- [modules/overview.md](docs-site/docs/modules/overview.md): Detailed summary of all 10 backend modules and AI chatbot.
- [frontend/i18n-guide.md](docs-site/docs/frontend/i18n-guide.md): Frontend multi-language (`vi`/`en`) architecture and extension guide.
- [quality/code-standards.md](docs-site/docs/quality/code-standards.md): Clean Code, Naming Conventions, and 3-tier Sonar quality gate.
- [quality/testing-ci.md](docs-site/docs/quality/testing-ci.md): 3-tier testing pyramid (`node:test`, Vitest, Playwright) and CI/CD.
- [operations/runbook.md](docs-site/docs/operations/runbook.md): Operations and troubleshooting runbook.
- [CONTRIBUTING.md](CONTRIBUTING.md): Git branching, Conventional Commits, and `glab` Merge Request workflow.
- [infra/README.md](infra/README.md): Docker infrastructure topologies and compose setup.
