---
title: Operations Runbook & Troubleshooting
---

# Operations Runbook & Troubleshooting

This runbook provides step-by-step remediation procedures for common development, integration, and operational incidents in Project Nexus.

## 1. Missing DB Column or Stale Prisma Client

- **Symptom**: `The column auction_items.lot_status does not exist` or `PrismaClientKnownRequestError` on Backend startup.
- **Root Cause**: Pending migrations in `backend/prisma/migrations/` have not been applied, or Prisma Client is out of date.
- **Resolution**:
  ```bash
  npx prisma migrate deploy --schema=backend/prisma/schema.prisma
  npm run prisma:generate
  ```

## 2. Local PostgreSQL / Redis Connection Refused (`ECONNREFUSED`)

- **Symptom**: `ECONNREFUSED 127.0.0.1:5432` (PostgreSQL) or `6379` (Redis).
- **Resolution**:
  ```bash
  npm run docker:infra
  docker compose -f infra/docker-compose.yml ps
  ```
  To perform a clean database reset and re-seed:
  ```bash
  npm run docker:clean
  npm run docker:infra
  npx prisma migrate deploy --schema=backend/prisma/schema.prisma
  npm run prisma:seed
  ```

## 3. Auction Bid Rejected with `403 Forbidden`

- **Symptom**: Authenticated user emits `auction:bid:place` and receives `auction:bid:rejected` or HTTP `403`.
- **Root Cause**:
  1. The `SELLER` account currently has Seller mode active (`isSellerActive = true`) — Seller mode is read-only in auction rooms.
  2. The user is the owner of the consigned lot (`sellerId === userId`).
- **Resolution**: Switch back to Buyer mode via `/api/v1/users/toggle-seller` (or the Header mode switcher) before bidding.

## 4. GHN Cancellation Timeout & PayOS Refund Reconciliation

- **Pre-Pickup Cancellation Timeout**:
  - The system keeps `AfterSalesRequest` in a durable pending state (never releasing Escrow or stock prematurely).
  - Inspect `GhnOrderActionService` logs and verify shipment status on the GHN portal before retrying reconciliation.
- **`PAYOS` Order Refunds (`OrderRefund.status = PENDING`)**:
  - Refund funds are held in the Admin wallet's `lockedBalance`.
  - After executing the external bank/PayOS transfer, Admin records the `externalReference` in `/admin/refunds` to transition the record to `SUCCESS`.

## 5. Missing `@nexus/types` or Frontend i18n Errors

- **Symptom**: `Cannot find module '@nexus/types'` or missing translation key errors in `vitest` / `vite build`.
- **Resolution**:
  ```bash
  npm run build:types
  npm run i18n:check
  ```

## 6. Regenerating OpenAPI, Validating Docs & Syncing GitLab Wiki

Whenever Backend controllers/DTOs or `docs-site/` pages change:

```bash
# 1. Regenerate OpenAPI JSON from NestJS Swagger
npm run docs:openapi

# 2. Verify 100% vi <-> en parity and OpenAPI validity
npm run docs:check

# 3. Build Docusaurus production bundle (checks broken links & Mermaid syntax)
npm run docs:build

# 4. Sync Vietnamese docs to GitLab Wiki (requires authenticated glab CLI)
npm run docs:sync-gitlab-wiki
```
