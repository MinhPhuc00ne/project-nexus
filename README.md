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

## 5. Complete Documentation Index

This repository maintains thorough technical documentation organized by domain and operational responsibility. The following index references every documentation file across the project:

### Project Operations and Contributing

- [README.md](README.md): Project overview, technology stack, development quickstart, and comprehensive index.
- [CONTRIBUTING.md](CONTRIBUTING.md): Git branching model, Conventional Commits standard, Merge Request lifecycle, and GitLab CLI automation.
- [.gitlab/merge_request_templates/default.md](.gitlab/merge_request_templates/default.md): Merge Request submission template and author verification checklist.

### Architecture and Business Logic

- [docs/README.md](docs/README.md): Central documentation navigation portal and directory architecture.
- [docs/architecture/ARCHITECTURE_MODEL.md](docs/architecture/ARCHITECTURE_MODEL.md): Level 1.5 Modular Monolith architecture, dependency graphs, and module isolation boundaries.
- [docs/architecture/BUSINESS_RULES.md](docs/architecture/BUSINESS_RULES.md): Core platform business rules, anti-sniping auction mechanics, escrow settlements, and commission rates.
- [docs/architecture/DESIGN_PATTERNS.md](docs/architecture/DESIGN_PATTERNS.md): Backend and frontend design patterns, state machines, and concurrency controls.
- [docs/srs/README.md](docs/srs/README.md): Software requirements specification, user personas, and transaction lifecycles.

### API Contracts and Integration

- [docs/api/README.md](docs/api/README.md): REST API endpoints, WebSocket contracts, authentication schemas, and event payloads.
- [docs/api/ORDER_AFTER_SALES.md](docs/api/ORDER_AFTER_SALES.md): Post-purchase order states, cancellation workflows, return claims, and escrow dispute transitions.

### Engineering Guides

- [docs/backend/BACKEND_GUIDE.md](docs/backend/BACKEND_GUIDE.md): NestJS backend architecture, dependency injection, and Prisma database administration.
- [docs/frontend/FRONTEND_GUIDE.md](docs/frontend/FRONTEND_GUIDE.md): React frontend architecture, state management patterns, and route protection mechanisms.
- [docs/frontend/UI_SPECIFICATION.md](docs/frontend/UI_SPECIFICATION.md): UI design tokens, typography, component styling standards, and accessibility requirements.
- [infra/README.md](infra/README.md): Docker infrastructure topologies, container compose files, and service networking.

### Technical and Code Standards

- [docs/standards/CLEAN_CODE.md](docs/standards/CLEAN_CODE.md): Cyclomatic complexity limits, class boundaries, strict prohibition of inline comments, and TSDoc documentation standards.
- [docs/standards/DESIGN_PRINCIPLES.md](docs/standards/DESIGN_PRINCIPLES.md): SOLID principles, high cohesion, loose coupling, and defensive programming guidelines.
- [docs/standards/NAMING_CONVENTIONS.md](docs/standards/NAMING_CONVENTIONS.md): Systematic naming conventions for files, directories, symbols, database entities, and API routes.
- [docs/standards/WRITING_STYLE.md](docs/standards/WRITING_STYLE.md): Standard US English technical writing style guide and grammatical constraints.

### Specialized Module References

- [backend/CHATBOT.md](backend/CHATBOT.md): Customer service AI chatbot architecture, Gemini LLM function calling, and prompt design.
- [frontend/FE_FILE_GUIDE.md](frontend/FE_FILE_GUIDE.md): Detailed inventory of all frontend files, functional responsibilities, and API readiness states.
- [frontend/src/components/ToastNotification/README.md](frontend/src/components/ToastNotification/README.md): Toast notification component usage guidelines, variants, and event triggers.
