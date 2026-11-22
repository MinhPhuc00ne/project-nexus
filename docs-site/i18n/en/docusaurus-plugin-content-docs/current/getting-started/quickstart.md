---
title: Local & Docker Quickstart
---

# Quickstart Guide

This guide walks you through bootstrapping the full Project Nexus development environment locally in under 10 minutes.

## 1. Prerequisites

- **Node.js** `>= 20.x` (recommended `22.x` or `24.x` for native `lcov` coverage in `node:test`).
- **npm** `>= 10.x` (the monorepo is configured with `npm@11.19.0` workspaces).
- **Docker & Docker Compose** (runs PostgreSQL 17 and Redis 7 via `infra/docker-compose.yml`).
- **GitLab CLI (`glab`)** (optional, used for Merge Requests and GitLab Wiki synchronization).

## 2. Step-by-Step Local Setup

```bash
# 1. Create local environment file from template
cp .env.example .env

# 2. Install dependencies across all workspaces (root, backend, frontend, docs-site, packages/*)
npm install --legacy-peer-deps

# 3. Build shared contract package @nexus/types
npm run build:types

# 4. Start PostgreSQL 17 and Redis 7 containers
npm run docker:infra

# 5. Generate Prisma Client, apply migrations, and seed sample data
npm run prisma:generate
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
npm run prisma:seed

# 6. Start Backend (3000) and Frontend (5173) concurrently via Turborepo
npm run dev
```

> **Tip**: To inspect logs separately, run `npm run dev:backend` and `npm run dev:frontend` in two separate terminals.

## 3. Running Full Stack with Docker

To run Postgres, Redis, Backend, and Frontend inside Docker containers using the `full` profile:

```bash
# Build and start all services
npm run docker:full

# Tail container logs
npm run docker:logs

# Stop containers (preserve database volumes)
npm run docker:down

# Stop containers and wipe volumes (full DB reset)
npm run docker:clean
```

## 4. Default Service Ports

| Service               | Default URL                                | Notes                                                                       |
| :-------------------- | :----------------------------------------- | :-------------------------------------------------------------------------- |
| **Frontend Portal**   | `http://localhost:5173`                    | Vite HMR dev server                                                         |
| **Backend REST API**  | `http://localhost:3000/api/v1`             | NestJS global prefix `/api/v1`                                              |
| **Swagger UI (Live)** | `http://localhost:3000/api/docs`           | Generated from NestJS decorators                                            |
| **Prisma Studio**     | `http://localhost:5555`                    | Launch via `npm run prisma:studio`                                          |
| **Docusaurus Docs**   | `http://localhost:3000` (or `--port 3001`) | Launch via `npm run docs:dev` (pass `--port 3001` if Backend occupies 3000) |

## 5. Post-Setup Sanity Checks

```bash
# Verify bilingual docs parity and OpenAPI spec
npm run docs:check

# Verify frontend i18n key parity
npm run i18n:check

# Run automated unit tests (Backend + Frontend)
npm test
```
