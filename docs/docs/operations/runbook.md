---
title: Operations Runbook and Troubleshooting
---

# Operations Runbook and Troubleshooting

This runbook documents remediation steps for common development, integration, and operational incidents in Project Nexus.

## 1. Missing Database Column or Stale Prisma Client

- Symptom: `The column auction_items.lot_status does not exist` or `PrismaClientKnownRequestError` on backend startup.
- Root cause: pending migrations in `backend/prisma/migrations/` have not been applied, or the generated Prisma client is out of date.
- Resolution:
  ```bash
  npm run db:deploy
  npm run db:generate
  ```

## 2. Local PostgreSQL or Redis Connection Refused (`ECONNREFUSED`)

- Symptom: `ECONNREFUSED 127.0.0.1:5432` (PostgreSQL) or `6379` (Redis).
- Resolution:
  ```bash
  npm run docker:infra
  docker compose -f infra/docker-compose.yml ps
  ```
  To perform a clean database reset and re-seed demo data:
  ```bash
  npm run docker:clean
  npm run docker:infra
  npm run db:deploy
  npm run db:bootstrap
  npm run seed:demo
  ```

## 3. Auction Bid Rejected with `403 Forbidden`

- Symptom: an authenticated user emits `auction:bid:place` and receives `auction:bid:rejected` or HTTP `403`.
- Root cause: either the `SELLER` account currently has seller mode active (`isSellerActive = true`, which is read-only in auction rooms), or the user owns the consigned lot (`sellerId === userId`).
- Resolution: switch back to buyer mode via `/api/v1/users/toggle-seller` or the header mode switcher before bidding.

## 4. GHN Cancellation Timeout and PayOS Refund Reconciliation

- Pre-pickup cancellation timeout keeps `AfterSalesRequest` in a durable pending state rather than releasing escrow or stock prematurely. Inspect `GhnOrderActionService` logs and confirm shipment status on the GHN portal before retrying reconciliation.
- `PAYOS` order refunds (`OrderRefund.status = PENDING`) hold funds in the admin wallet `lockedBalance`. After completing the external bank or PayOS transfer, an administrator records `externalReference` in `/admin/refunds` to transition the record to `SUCCESS`.

## 5. Missing `@nexus/contracts` or Frontend i18n Errors

- Symptom: `Cannot find module '@nexus/contracts'` or missing translation key errors in `vitest` or `vite build`.
- Resolution:
  ```bash
  npm run build:contracts
  npm run i18n:check
  ```

## 6. Health Probes and Portable Deployment

- Liveness probe at `GET /api/v1/health/live` verifies the Node.js process is responsive.
- Readiness probe at `GET /api/v1/health/ready` verifies PostgreSQL (`SELECT 1`) and Redis (`PING`), returning `503` when dependencies are unavailable.
- Run `npm run env:check` before deploying, or sync Railway variables with `node infra/scripts/sync-railway-env.mjs`.
- `infra/Dockerfile.backend` and `railway.toml` run `prisma migrate deploy`, `db:bootstrap`, and `db:verify` before starting the API server.

## 7. Regenerating OpenAPI and Validating Documentation

Whenever backend controllers, DTOs, or `docs/` pages change:

```bash
# 1. Regenerate OpenAPI JSON from NestJS Swagger
npm run docs:openapi

# 2. Validate OpenAPI schema and Engineering Writing Style Guide rules
npm run docs:check

# 3. Build Docusaurus production bundle (verifies links and Mermaid diagrams)
npm run docs:build
```
