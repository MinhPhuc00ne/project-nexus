---
title: Environment Variables
---

# Environment Configuration

Project Nexus loads environment variables from the monorepo root `.env` file (via `ConfigModule.forRoot({ envFilePath: ['.env', '../.env'] })` in Backend) and `VITE_*` variables for Frontend. Use `.env.example` as the authoritative template.

## 1. Database and Cache (PostgreSQL 17 and Redis 7)

| Variable            | Example (`.env.example`)                                                          | Required | Description                                        |
| :------------------ | :-------------------------------------------------------------------------------- | :------- | :------------------------------------------------- |
| `NODE_ENV`          | `development`                                                                     | Yes      | Runtime mode (`development`, `test`, `production`) |
| `POSTGRES_USER`     | `postgres`                                                                        | Yes      | PostgreSQL container username                      |
| `POSTGRES_PASSWORD` | `nexus_secret_2026`                                                               | Yes      | PostgreSQL password                                |
| `POSTGRES_DB`       | `nexus_main`                                                                      | Yes      | Primary database name                              |
| `POSTGRES_PORT`     | `5432`                                                                            | Yes      | PostgreSQL port                                    |
| `DATABASE_URL`      | `postgresql://postgres:nexus_secret_2026@localhost:5432/nexus_main?schema=public` | Yes      | Prisma 7 connection string                         |
| `REDIS_HOST`        | `localhost`                                                                       | Yes      | Redis hostname                                     |
| `REDIS_PORT`        | `6379`                                                                            | Yes      | Redis port                                         |
| `REDIS_PASSWORD`    | _(empty)_                                                                         | No       | Optional Redis password                            |
| `REDIS_URL`         | `redis://localhost:6379`                                                          | Yes      | Redis connection URL for locks and caching         |

## 2. Authentication, OAuth and Server

| Variable                   | Example                                             | Required | Description                                                    |
| :------------------------- | :-------------------------------------------------- | :------- | :------------------------------------------------------------- |
| `JWT_SECRET`               | `super-secret-jwt-key-...`                          | Yes      | Access token signing secret (must rotate in production)        |
| `JWT_EXPIRES_IN`           | `7d`                                                | Yes      | Access token lifetime                                          |
| `REFRESH_TOKEN_SECRET`     | `super-secret-refresh-key-...`                      | Yes      | Refresh token signing secret                                   |
| `REFRESH_TOKEN_EXPIRES_IN` | `30d`                                               | Yes      | Refresh token lifetime (stored in `RefreshToken` for rotation) |
| `PORT_BACKEND`             | `3000`                                              | Yes      | NestJS HTTP and WebSocket port                                 |
| `FRONTEND_URL`             | `http://localhost:5173`                             | Yes      | Allowed CORS origin and redirect target for emails and OAuth   |
| `GOOGLE_CLIENT_ID`         | `your-google-client-id`                             | Optional | Google OAuth 2.0 client ID                                     |
| `GOOGLE_CLIENT_SECRET`     | `your-google-client-secret`                         | Optional | Google OAuth 2.0 client secret                                 |
| `GOOGLE_CALLBACK_URL`      | `http://localhost:3000/api/v1/auth/google/callback` | Optional | Authorized Google OAuth callback URL                           |

## 3. Payments (PayOS) and Logistics (GHN Express)

| Variable             | Example                                                 | Required  | Description                                    |
| :------------------- | :------------------------------------------------------ | :-------- | :--------------------------------------------- |
| `PAYOS_CLIENT_ID`    | `your-payos-client-id`                                  | Optional* | PayOS VietQR client ID                         |
| `PAYOS_API_KEY`      | `your-payos-api-key`                                    | Optional* | PayOS API key                                  |
| `PAYOS_CHECKSUM_KEY` | `your-payos-checksum-key`                               | Optional* | HMAC checksum key for verifying PayOS webhooks |
| `GHN_API_URL`        | `https://dev-online-gateway.ghn.vn/shiip/public-api/v2` | Yes       | GHN Sandbox or Production API base URL         |
| `GHN_TOKEN`          | `your-ghn-sandbox-token`                                | Optional* | GHN API token                                  |
| `GHN_SHOP_ID`        | `123456`                                                | Optional* | Default GHN shop ID                            |
| `GHN_CLIENT_ID`      | `123456`                                                | Optional* | GHN client ID                                  |
| `GHN_WEBHOOK_SECRET` | `nexus_ghn_webhook_secret_2026`                         | Yes       | Secret for verifying GHN tracking webhooks     |

_\*Note_: Local development without external sandbox keys still supports Wallet and COD flows; PayOS and GHN live integration tests require valid sandbox credentials.

## 4. Business Rules, Media, Mail and AI Chatbot

| Variable                                                            | Example                        | Description                                                          |
| :------------------------------------------------------------------ | :----------------------------- | :------------------------------------------------------------------- |
| `PLATFORM_FEE_PERCENTAGE`                                           | `7.0`                          | Default platform commission (%) deducted upon Escrow disbursement    |
| `AUCTION_ANTI_SNIPING_TRIGGER_MINUTES`                              | `2`                            | Final-minutes threshold that triggers auction anti-sniping extension |
| `AUCTION_ANTI_SNIPING_EXTEND_MINUTES`                               | `5`                            | Configurable anti-sniping extension parameter                        |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET`                  | `your-*`                       | Cloud media storage (falls back to local `/uploads` when unset)      |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | `smtp.gmail.com` (`465`)       | Sends OTP verification, password reset, and Staff invite emails      |
| `CHATBOT_AI_ENABLED`                                                | `true`                         | Feature flag for the AI shopping assistant                           |
| `GEMINI_API_KEY`                                                    | `your-gemini-api-key`          | Google Gemini API key                                                |
| `CHATBOT_GEMINI_MODEL`                                              | `gemini-3.1-flash-lite`        | Gemini model used by `ChatbotAiService`                              |
| `VITE_API_URL`                                                      | `http://localhost:3000/api/v1` | Base URL for the Frontend Axios client                               |
