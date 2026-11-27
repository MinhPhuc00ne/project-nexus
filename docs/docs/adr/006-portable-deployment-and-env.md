---
title: 'ADR-006: Portable Deployment, Environment Validation, and Health Probes'
---

# ADR-006: Portable Deployment, Environment Validation, and Health Probes

Status: Accepted.

## Context

Deploying across local Docker, Railway, Render, Fly.io, or VPS alongside Vercel requires deterministic database migrations, zero-secret local onboarding, strict production secret validation, and separate container liveness and readiness probes.

## Decision

- Validate all environment variables at startup in `backend/src/core/config/env.schema.ts` and statically via `npm run env:check` (`backend/scripts/check-env.mjs`), using `APP_ENV` (`local`, `staging`, `demo`, `production`) and `SWAGGER_ENABLED`.
- Keep `.env.example` free of real secrets so anyone cloning the repository can run locally without third-party credentials, while failing fast in `production` / `staging` when required secrets (`JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`) are missing or weak.
- Automate container release steps in `infra/Dockerfile.backend` and `infra/railway.toml` (`prisma migrate deploy`, `db:bootstrap`, `db:verify`) and provide `infra/scripts/sync-railway-env.mjs` for synchronizing Railway variables.
- Expose `/api/v1/health/live` (process liveness) and `/api/v1/health/ready` (PostgreSQL and Redis readiness) alongside `/api/v1/health`.

## Consequences

- Positive: portable containerized deployment with repeatable release hooks and safe zero-secret local developer onboarding.
- Trade-off: production environments must explicitly supply required secrets before the backend process will boot.
