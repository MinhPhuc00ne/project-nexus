# Project Nexus

Project Nexus is an e-commerce platform that seamlessly integrates traditional online retail with real-time 3D live auctions. The system is built using an Enterprise Modular Monolith architecture within an NPM Workspaces Monorepo.

---

## Key Features

- **Unified Identity & Seamless Role Toggle:** Effortlessly switch between Buyer and Seller modes within a single session without logging out or re-authenticating.
- **Real-Time 3D Live Auctions (WebGL / Three.js):** High-concurrency live bidding rooms featuring interactive 3D item showcases, sub-300ms bidding queues, and automated anti-sniping duration extensions (+5 minutes if a bid is placed in the final 2 minutes).
- **Automated Platform Escrow (7.0% Commission):** Buyer payments are securely locked in escrow upon order placement and disbursed to the seller (minus a 7% platform fee) only after the buyer confirms receipt without dispute.
- **Dynamic Reputation & Trust Levels:** Automated score tracking that rewards successful transactions (+2 points) and penalizes order cancellations or auction defaults (-10 points).
- **Staff Gateway & Customer Support Center:** Integrated backoffice center for dispute arbitration, live customer support chat, and staff provisioning with corporate `@staff.com` credentials.
- **Centralized Session & In-Flight Deduplication (`AuthContext`):** Eliminates redundant network requests to `/users/me` on route transitions and synchronizes user state across multiple browser tabs.
- **Configurable Mock Layer & Auto-Fallback:** Toggle between mock data and real APIs with `VITE_USE_MOCK=true/false` in `.env`, featuring automated fallback to prevent UI crashes if backend endpoints return errors.
- **Shared Type-Safe Contracts (`@nexus/types`):** Single source of truth for all DTOs, Enums, and WebSocket event payloads shared across Backend and Frontend.

---

## Tech Stack

- **Monorepo:** NPM Workspaces (`packages/*`, `backend`, `frontend/web`).
- **Frontend Portal:** React 19, TypeScript (Strict Mode), Vite 8, Tailwind CSS v4, Three.js (WebGL 3D graphics), Lucide Icons, React Router 7.
- **Backend Service:** NestJS 12 (Modular Monolith Architecture, TypeScript).
- **Database:** PostgreSQL 17 (Prisma ORM 7, ACID Transactions, Logical Schema Separation).
- **Cache & Real-Time Engine:** Redis 7 (Caching, Redlock distributed locking, in-memory atomic bidding queue, Socket.IO adapter).
- **Infrastructure:** Docker & Docker Compose.
- **Payment Providers:** PayOS (Vietnamese domestic VietQR banking), Stripe (International credit cards), Internal Wallet.
- **Logistics Integration:** GHN API (Giao Hàng Nhanh logistics adapter).

---

## Repository Structure

```text
project-nexus/
├── .editorconfig
├── .env.example
├── .gitattributes
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── commitlint.config.js
├── CONTRIBUTING.md
├── docker-compose.yml
├── eslint.config.mjs
├── package.json
├── README.md
├── docs/                          # Standardized Engineering Documentation & Portal
│   ├── README.md                  # Documentation Portal & Navigation Index
│   ├── architecture/              # Architecture, component topology, ERD & business rules
│   │   ├── ARCHITECTURE_MODEL.md  # Modular Monolith architecture, components & ERD
│   │   ├── BUSINESS_RULES.md      # Business rules, escrow, reputation & anti-sniping
│   │   └── DESIGN_PATTERNS.md     # IoC, Repository, Strategy, Observer, React Context
│   ├── standards/                 # Code quality and engineering standards
│   │   ├── CLEAN_CODE.md          # Code limits (< 300 lines), strict TypeScript & Prettier
│   │   ├── DESIGN_PRINCIPLES.md   # SOLID, KISS, YAGNI, DRY, Monolith boundaries
│   │   └── NAMING_CONVENTIONS.md  # Universal naming conventions for code & database
│   ├── frontend/                  # Frontend specifications & guides
│   │   ├── FRONTEND_GUIDE.md      # Complete frontend guide (React 19, Vite, Mocks)
│   │   └── UI_SPECIFICATION.md    # UI tokens, 4-portal hierarchy & component breakdown
│   ├── backend/                   # Backend specifications & guides
│   │   └── BACKEND_GUIDE.md       # Complete backend guide (NestJS, Prisma, Redis)
│   ├── api/                       # API documentation index & REST/WS contracts
│   └── srs/                       # Software Requirements Specification (SRS)
├── infra/                         # Docker compose & container configurations
├── packages/
│   ├── types/                     # Shared TypeScript contracts (@nexus/types)
│   │   └── src/
│   │       ├── enums/             # Role, OrderStatus, AuctionStatus, EscrowStatus
│   │       ├── events/            # WS_AUCTION_EVENTS, Domain Event Payloads
│   │       ├── models/            # ApiResponse<T>, PaginatedResponse<T>, DTOs
│   │       └── index.ts           # Public Barrel Export
│   └── config/                    # Shared tsconfig base settings
├── backend/                       # NestJS Modular Monolith application
│   ├── prisma/                    # schema.prisma, migrations, seeds
│   └── src/                       # Domain modules (auth, users, catalog, commerce, etc.)
└── frontend/
    └── web/                       # Unified web portal (Buyer, Seller, Staff, Admin)
        ├── src/
        │   ├── components/        # Decomposed UI subcomponents (< 300 lines)
        │   ├── contexts/          # AuthContext with in-flight deduplication
        │   ├── mocks/             # Curated mock data & configuration
        │   ├── pages/             # Route pages (auth, buyer, seller, staff, guest, admin)
        │   ├── routes/            # AppRouter and navigation route guards
        │   └── services/          # API services with graceful fallback
        └── vite.config.ts         # Vite with @nexus/types native TS resolution
```

---

## Documentation Reading Roadmap

For new engineers joining the project, read the comprehensive documentation in [`docs/`](docs/) in the following order:

```text
[1. ARCHITECTURE_MODEL] ──> [2. BUSINESS_RULES] ──> [3. FRONTEND / BACKEND GUIDES] ──> [4. CLEAN_CODE & STANDARDS]
```

1. **Architecture & Data Models:** [`docs/architecture/ARCHITECTURE_MODEL.md`](docs/architecture/ARCHITECTURE_MODEL.md) — System context, monorepo packages, and the complete PostgreSQL ERD.
2. **Business Rules:** [`docs/architecture/BUSINESS_RULES.md`](docs/architecture/BUSINESS_RULES.md) — Escrow calculation, reputation points, anti-sniping duration rules.
3. **Frontend & Backend Guides:** [`docs/frontend/FRONTEND_GUIDE.md`](docs/frontend/FRONTEND_GUIDE.md) & [`docs/backend/BACKEND_GUIDE.md`](docs/backend/BACKEND_GUIDE.md) — Setup, HMR alias, AuthContext, and Redis locks.
4. **Engineering Standards:** [`docs/standards/CLEAN_CODE.md`](docs/standards/CLEAN_CODE.md), [`docs/architecture/DESIGN_PATTERNS.md`](docs/architecture/DESIGN_PATTERNS.md), [`docs/standards/DESIGN_PRINCIPLES.md`](docs/standards/DESIGN_PRINCIPLES.md), and [`docs/standards/NAMING_CONVENTIONS.md`](docs/standards/NAMING_CONVENTIONS.md).

---

## Development Environment Requirements

- **Node.js:** Recommended LTS v22.x or v24.x (`node -v`).
- **NPM:** Bundled with Node.js, v11.x (`npm -v`).
- **Docker & Docker Compose:** For running PostgreSQL 17 and Redis 7 (`docker compose version`).
- **Git:** Minimum v2.50+ (`git --version`).

---

## Quickstart Guide

### 1. Install Dependencies

Run from the root directory to link workspaces and activate Husky hooks:

```bash
npm install
```

### 2. Configure Environment Variables

```bash
# Windows (PowerShell):
Copy-Item .env.example .env

# macOS / Linux:
cp .env.example .env
```

_(Optionally set `VITE_USE_MOCK=true` or `false` in `.env` depending on your workflow)._

### 3. Start Local Infrastructure

Launch PostgreSQL 17 (port 5432) and Redis 7 (port 6379) in detached mode:

```bash
npm run docker:up
```

### 4. Initialize Database

Generate Prisma client and apply database migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5. Run Applications

- **Backend NestJS Server (port 3000):**

  ```bash
  npm run dev:backend
  ```

  _(Swagger API documentation available at `http://localhost:3000/api/docs`)_

- **Frontend Web Portal (port 5173):**
  ```bash
  npm run dev:web
  ```
  _(Web portal available at `http://localhost:5173`)_

---

## Frequently Used Commands

| Command                   | Purpose                                      |
| :------------------------ | :------------------------------------------- |
| `npm run dev:web`         | Start frontend React/Vite development server |
| `npm run dev:backend`     | Start backend NestJS development server      |
| `npm run build:web`       | Compile and bundle frontend for production   |
| `npm run build:backend`   | Compile backend for production               |
| `npm run build:types`     | Compile `@nexus/types` package               |
| `npm run build:all`       | Build shared types, backend, and frontend    |
| `npm run lint`            | Run ESLint across all workspaces             |
| `npm run format`          | Auto-format entire codebase with Prettier    |
| `npm run format:check`    | Check code formatting compliance             |
| `npm run prisma:generate` | Update Prisma Client from schema.prisma      |
| `npm run prisma:migrate`  | Apply database migrations                    |
| `npm run prisma:studio`   | Open interactive database web interface      |
| `npm run docker:up`       | Launch local PostgreSQL & Redis containers   |
| `npm run docker:down`     | Stop local Docker containers                 |
