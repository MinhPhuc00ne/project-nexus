---
title: Local & Docker Quickstart
---

# Quickstart Guide

## Prerequisites

- **Node.js** `>= 20.x` (`22.x` or `24.x` recommended for native `lcov` coverage)
- **npm** `>= 10.x`
- **Docker & Docker Compose** (for PostgreSQL 17 and Redis 7)

## Installation & Startup

```bash
# 1. Install monorepo dependencies
npm install --legacy-peer-deps

# 2. Start PostgreSQL 17 and Redis 7
npm run docker:infra

# 3. Generate Prisma Client, apply migrations, and seed data
npx prisma generate --schema=backend/prisma/schema.prisma
npx prisma migrate dev --schema=backend/prisma/schema.prisma
npm run prisma:seed

# 4. Start Backend (3000) and Frontend (5173) concurrently
npm run dev
```

## Service Endpoints

- **Frontend Portal**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:3000/api/v1`
- **Swagger UI (Live)**: `http://localhost:3000/api/docs`
- **Docusaurus Docs**: `npm run docs:dev`
