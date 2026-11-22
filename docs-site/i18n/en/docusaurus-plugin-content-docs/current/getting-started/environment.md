---
title: Environment Variables
---

# Environment Configuration

Use `.env.example` at the repository root as the template for your local `.env`:

| Group          | Key Variables                                                                  | Description                                                 |
| :------------- | :----------------------------------------------------------------------------- | :---------------------------------------------------------- |
| Database       | `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`            | PostgreSQL 17 connection for Prisma                         |
| Cache          | `REDIS_HOST`, `REDIS_PORT`                                                     | Redis 7 connection for locks and sessions                   |
| Auth & JWT     | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | JWT signing and Google OAuth 2.0                            |
| Payments       | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`                       | PayOS VietQR and webhook verification                       |
| Logistics      | `GHN_TOKEN`, `GHN_SHOP_ID`, `GHN_API_BASE_URL`                                 | GHN Express shipping integration                            |
| Storage & Mail | `CLOUDINARY_*`, `MAIL_*`                                                       | Media uploads and OTP/staff emails                          |
| Frontend       | `VITE_API_URL`                                                                 | Axios base URL (defaults to `http://localhost:3000/api/v1`) |
