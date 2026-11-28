---
title: Environment Variables
---

# Environment Configuration

Project Nexus loads environment variables from the monorepo root `.env` file (via `ConfigModule.forRoot({ envFilePath: ['.env', '../.env'] })` in Backend) and `VITE_*` variables for Frontend. Use `.env.example` as the authoritative template.

## 1. Runtime, Database, and Cache (PostgreSQL 17 and Redis 7)

| Variable              | Example (`.env.example`)                                                            | Required | Description                                                            |
| :-------------------- | :---------------------------------------------------------------------------------- | :------- | :--------------------------------------------------------------------- |
| `NODE_ENV`            | `development`                                                                       | Yes      | Runtime mode (`development`, `test`, `production`)                     |
| `APP_ENV`             | `development`                                                                       | Yes      | Deployment tier (`development`, `demo`, `production`)                  |
| `PORT`                | `3000`                                                                              | No       | Container-injected HTTP port (overrides `PORT_BACKEND` when set)       |
| `PORT_BACKEND`        | `3000`                                                                              | Yes      | Fallback NestJS HTTP and WebSocket port                                |
| `SWAGGER_ENABLED`     | `true`                                                                              | No       | Enables `/api/docs` Swagger UI (defaults to `false` in `production`)   |
| `POSTGRES_USER`       | `postgres`                                                                          | Yes      | PostgreSQL container username                                          |
| `POSTGRES_PASSWORD`   | `nexus_secret_2026`                                                                 | Yes      | PostgreSQL password                                                    |
| `POSTGRES_DB`         | `nexus_main`                                                                        | Yes      | Primary database name                                                  |
| `POSTGRES_PORT`       | `5432`                                                                              | Yes      | PostgreSQL port                                                        |
| `DATABASE_URL`        | `postgresql://postgres:nexus_secret_2026@localhost:5432/nexus_main?schema=public`   | Yes      | Prisma 7 connection string                                             |
| `SHADOW_DATABASE_URL` | `postgresql://postgres:nexus_secret_2026@localhost:5432/nexus_shadow?schema=public` | No       | Isolated shadow database URL for `prisma migrate dev`                  |
| `REDIS_URL`           | `redis://localhost:6379`                                                            | Optional | Redis connection URL (`redis://` or `rediss://`) for locks and caching |
| `REDIS_HOST`          | `localhost`                                                                         | Yes      | Redis hostname fallback when `REDIS_URL` is unset                      |
| `REDIS_PORT`          | `6379`                                                                              | Yes      | Redis port fallback when `REDIS_URL` is unset                          |
| `REDIS_PASSWORD`      | _(empty)_                                                                           | No       | Optional Redis password                                                |

## 2. Authentication, OAuth, and Server URLs

| Variable                   | Example (`.env.example`)                                   | Required   | Description                                                                   |
| :------------------------- | :--------------------------------------------------------- | :--------- | :---------------------------------------------------------------------------- |
| `JWT_SECRET`               | `super-secret-jwt-key-nexus-change-in-production-2026`     | Yes        | Access token signing secret (minimum 16 chars; rotate in `production`)        |
| `JWT_EXPIRES_IN`           | `15m`                                                      | Yes        | Access token lifetime                                                         |
| `REFRESH_TOKEN_SECRET`     | `super-secret-refresh-key-nexus-change-in-production-2026` | Yes        | Refresh token signing secret (minimum 16 chars; rotate in `production`)       |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d`                                                      | Yes        | Refresh token lifetime (stored in `RefreshToken` for rotation)                |
| `FRONTEND_URL`             | `http://localhost:5173`                                    | Yes        | Primary frontend URL for email links and fallback CORS origin                 |
| `CORS_ORIGINS`             | `http://localhost:5173`                                    | No         | Comma-separated allowed CORS origins for HTTP and Socket.IO gateways          |
| `APP_PUBLIC_URL`           | `http://localhost:3000`                                    | Production | Public backend origin (required when `APP_ENV=production`)                    |
| `GOOGLE_CLIENT_ID`         | _(empty)_                                                  | Optional   | Google OAuth 2.0 client ID (required if any Google OAuth field is set)        |
| `GOOGLE_CLIENT_SECRET`     | _(empty)_                                                  | Optional   | Google OAuth 2.0 client secret (required if any Google OAuth field is set)    |
| `GOOGLE_CALLBACK_URL`      | _(empty)_                                                  | Optional   | Authorized Google OAuth callback URL (required if any Google OAuth field set) |

## 3. Provider Selection and External Credentials

Every external dependency is selected explicitly by name in `backend/src/core/config/env.schema.ts`. Local and demo environments default to safe stubs (`sandbox`, `local`, `console`), while `APP_ENV=production` rejects stub providers and placeholder values at startup.

| Variable             | Default (`.env.example`) | Allowed Values          | Description                                                    |
| :------------------- | :----------------------- | :---------------------- | :------------------------------------------------------------- |
| `PAYMENT_PROVIDER`   | `sandbox`                | `payos` \| `sandbox`    | Selects PayOS VietQR checkout or local sandbox payment stub    |
| `SHIPPING_PROVIDER`  | `sandbox`                | `ghn` \| `sandbox`      | Selects GHN Express logistics or local sandbox shipping stub   |
| `STORAGE_PROVIDER`   | `local`                  | `cloudinary` \| `local` | Selects Cloudinary media storage or local `/uploads` directory |
| `MAIL_PROVIDER`      | `console`                | `smtp` \| `console`     | Selects Nodemailer SMTP delivery or console log output         |
| `CHATBOT_AI_ENABLED` | `false`                  | `true` \| `false`       | Enables Google Gemini AI responses in the shopping assistant   |

| Variable                | Example (`.env.example`)            | Required When                 | Description                                                     |
| :---------------------- | :---------------------------------- | :---------------------------- | :-------------------------------------------------------------- |
| `PAYOS_CLIENT_ID`       | _(empty)_                           | `PAYMENT_PROVIDER=payos`      | PayOS VietQR client ID                                          |
| `PAYOS_API_KEY`         | _(empty)_                           | `PAYMENT_PROVIDER=payos`      | PayOS API key                                                   |
| `PAYOS_CHECKSUM_KEY`    | _(empty)_                           | `PAYMENT_PROVIDER=payos`      | HMAC checksum key for verifying PayOS webhooks                  |
| `GHN_API_URL`           | _(empty)_                           | `SHIPPING_PROVIDER=ghn`       | GHN Sandbox or Production API base URL                          |
| `GHN_TOKEN`             | _(empty)_                           | `SHIPPING_PROVIDER=ghn`       | GHN API token                                                   |
| `GHN_SHOP_ID`           | _(empty)_                           | `SHIPPING_PROVIDER=ghn`       | Default GHN shop ID                                             |
| `GHN_CLIENT_ID`         | _(empty)_                           | Optional                      | Optional GHN client ID (placeholder values rejected)            |
| `GHN_WEBHOOK_SECRET`    | _(empty)_                           | `SHIPPING_PROVIDER=ghn`       | Secret for verifying GHN tracking webhooks                      |
| `CLOUDINARY_CLOUD_NAME` | _(empty)_                           | `STORAGE_PROVIDER=cloudinary` | Cloudinary cloud name                                           |
| `CLOUDINARY_API_KEY`    | _(empty)_                           | `STORAGE_PROVIDER=cloudinary` | Cloudinary API key                                              |
| `CLOUDINARY_API_SECRET` | _(empty)_                           | `STORAGE_PROVIDER=cloudinary` | Cloudinary API secret                                           |
| `SMTP_HOST`             | _(empty)_                           | `MAIL_PROVIDER=smtp`          | SMTP server hostname                                            |
| `SMTP_PORT`             | _(empty)_ (defaults to `587`)       | Optional                      | SMTP server port                                                |
| `SMTP_USER`             | _(empty)_                           | `MAIL_PROVIDER=smtp`          | SMTP username                                                   |
| `SMTP_PASS`             | _(empty)_                           | `MAIL_PROVIDER=smtp`          | SMTP password or app password                                   |
| `SMTP_FROM`             | _(empty)_                           | Optional                      | Sender address for OTP, password reset, and Staff invite emails |
| `GEMINI_API_KEY`        | _(empty)_                           | `CHATBOT_AI_ENABLED=true`     | Google Gemini API key                                           |
| `CHATBOT_GEMINI_MODEL`  | _(empty)_ (`gemini-3.1-flash-lite`) | Optional                      | Gemini model identifier matching `^gemini-[a-z0-9.-]+$`         |
| `VITE_API_URL`          | `http://localhost:3000/api/v1`      | Yes (`frontend/.env`)         | Base URL for the Frontend Axios client                          |

> Note: Platform operational parameters such as platform commission (`platformFeePercentage`, default `7.0`) and auction anti-sniping windows (`antiSnipingTriggerMinutes`, `antiSnipingExtendMinutes`) are stored in PostgreSQL (`system_settings` via `PlatformSettingsService`) and managed through Admin settings rather than environment variables. Run `npm run env:check` to validate any `.env` file, or `node infra/scripts/sync-railway-env.mjs` to sync Railway variables.
