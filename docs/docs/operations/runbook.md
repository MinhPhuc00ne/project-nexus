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
- `infra/docker/Dockerfile.backend` (`migrator` stage) and `railway.toml` (`preDeployCommand`) run `prisma migrate deploy` and the system bootstrap seed (`db:bootstrap` or compiled `dist/prisma/seeds/system.js`) before starting the API server. Run `npm run db:verify` against the target database to verify PostgreSQL CHECK constraints and partial indexes.

## 7. Regenerating OpenAPI and Validating Documentation

Whenever backend controllers, DTOs, or `docs/` pages change:

```bash
# 1. Regenerate OpenAPI JSON from NestJS Swagger
npm run docs:openapi

# 2. Validate OpenAPI schema, relative markdown links, and Engineering Writing Style Guide rules
npm run docs:check

# 3. Build Docusaurus production bundle (verifies route links and Mermaid diagrams)
npm run docs:build
```

## 8. Provider Migration Runbook (Post-Trial Portability)

Project Nexus separates runtime platform infrastructure from external SaaS providers so you can move the backend off Railway (for example, to Render or Fly.io paired with Neon PostgreSQL and Upstash Redis, or to a self-hosted VPS running Docker Compose) without rewriting application code.

### 8.1 Database and Cache Migration (PostgreSQL 17 and Redis 7)

1. Provision target managed services:
   - PostgreSQL 17 (such as Neon or RDS) and capture the TLS connection string (`DATABASE_URL` with `?sslmode=require`).
   - Redis 7 (such as Upstash) and capture the TLS connection URL (`REDIS_URL` starting with `rediss://`).
2. Export and restore PostgreSQL data from the source database:
   ```bash
   pg_dump --format=custom --no-owner --no-acl "$SOURCE_DATABASE_URL" -f nexus-backup.dump
   pg_restore --no-owner --no-acl -d "$TARGET_DATABASE_URL" nexus-backup.dump
   ```
3. Apply any pending migrations, confirm idempotent system rows, and verify schema constraints on the target database:
   ```bash
   DATABASE_URL="$TARGET_DATABASE_URL" npm run db:deploy
   DATABASE_URL="$TARGET_DATABASE_URL" npm run db:bootstrap
   DATABASE_URL="$TARGET_DATABASE_URL" npm run db:verify
   ```
   Redis stores only short-lived locks, rate-limit counters, and caches (`nexus:system:settings`, active auction cache), so no Redis snapshot transfer is required when migrating during a brief maintenance window.

### 8.2 Backend Compute Portability (Render, Fly.io, or Cloud Run)

1. Build and deploy using `infra/docker/Dockerfile.backend` (`target: runner`, listening on `PORT` or `3000`) and configure the platform health check path to `/api/v1/health/ready`.
2. Run `prisma migrate deploy --schema=prisma/schema.prisma && node dist/prisma/seeds/system.js` from `/app/backend` as your platform release command (matching `railway.toml` `preDeployCommand`), or run the `migrator` target from `infra/docker/Dockerfile.backend` prior to rolling out the server.
3. Set core environment variables on the new host:
   - `NODE_ENV=production` and `APP_ENV=production`
   - `DATABASE_URL` and `REDIS_URL` pointing to the new PostgreSQL and Redis providers
   - `APP_PUBLIC_URL` set to the new public backend origin (required in `production`)
   - `FRONTEND_URL` and `CORS_ORIGINS` set to your Vercel or custom frontend origin
   - `JWT_SECRET` and `REFRESH_TOKEN_SECRET` (rotate if moving off an untrusted host; rotating invalidates active sessions)
4. Validate the production environment file locally before applying secrets:
   ```bash
   npm run env:check -- --env-file .env.production
   ```

### 8.3 External Provider Portability (`*_PROVIDER` Flags)

Every external integration is selected explicitly in `backend/src/core/config/env.schema.ts` and refuses stub modes (`sandbox`, `local`, `console`) when `APP_ENV=production`:

- Media storage (`STORAGE_PROVIDER=cloudinary`): Database records store Cloudinary HTTPS URLs directly, so moving backend compute requires no file migration as long as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` stay intact. If migrating away from `STORAGE_PROVIDER=local` (`/uploads`), upload local assets to Cloudinary and update the stored URLs before switching `APP_ENV=production`.
- Transactional email (`MAIL_PROVIDER=smtp`): Nodemailer accepts any standard SMTP relay via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` (such as Resend SMTP, Postmark, Amazon SES, or Gmail). Update only those five variables to switch mail providers.
- Payments (`PAYMENT_PROVIDER=payos`): Keep `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, and `PAYOS_CHECKSUM_KEY`, and update the PayOS webhook URL in the PayOS dashboard to `${APP_PUBLIC_URL}/api/v1/commerce/webhooks/payos`.
- Logistics (`SHIPPING_PROVIDER=ghn`): Keep `GHN_API_URL`, `GHN_TOKEN`, `GHN_SHOP_ID`, `GHN_CLIENT_ID`, and `GHN_WEBHOOK_SECRET`, and update the GHN callback URL to `${APP_PUBLIC_URL}/api/v1/fulfillment/shipping/webhook`.
- Google OAuth and Gemini AI: Update `GOOGLE_CALLBACK_URL` to `${APP_PUBLIC_URL}/api/v1/auth/google/callback` in both backend env vars and Google Cloud Console, and carry over `GEMINI_API_KEY` when `CHATBOT_AI_ENABLED=true`.

### 8.4 Self-Hosted VPS Alternative (Docker Compose)

To self-host all services on a single Linux VPS instead of managed PaaS tiers:

1. Provision a server with Docker Engine and Docker Compose v2 behind a TLS reverse proxy (Nginx or Caddy) terminating HTTPS and forwarding `/api` and `/socket.io` traffic to port `3000`.
2. Create a production `.env` file from `.env.example` with `APP_ENV=production`, strong `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `APP_PUBLIC_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, and real `*_PROVIDER` credentials, then validate with `npm run env:check`.
3. Start the full stack (`postgres`, `redis`, `migrate`, `backend`, `frontend`):
   ```bash
   npm run docker:full
   ```
4. Verify database constraints after `nexus-migrate` completes:
   ```bash
   npm run db:verify
   ```

### 8.5 Post-Cutover Verification Checklist

- Confirm `GET ${APP_PUBLIC_URL}/api/v1/health/live` and `GET ${APP_PUBLIC_URL}/api/v1/health/ready` return HTTP `200`.
- Update `VITE_API_URL` in Vercel (or your static frontend host) to `${APP_PUBLIC_URL}/api/v1` and redeploy the frontend.
- Confirm `npm run db:verify` passes with zero missing constraints or indexes.
- Trigger a test PayOS webhook and GHN webhook against `${APP_PUBLIC_URL}` to verify signature checks and routing.
