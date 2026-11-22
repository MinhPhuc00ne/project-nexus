---
title: Operations & Troubleshooting Runbook
---

# Operations & Troubleshooting Runbook

## 1. Missing Database Columns on Startup

- **Symptom**: `The column auction_items.lot_status does not exist` or Prisma schema mismatch.
- **Resolution**:
  ```bash
  npx prisma migrate deploy --schema=backend/prisma/schema.prisma
  npx prisma generate --schema=backend/prisma/schema.prisma
  ```

## 2. Local PostgreSQL / Redis Connection Refused

- **Symptom**: `ECONNREFUSED 127.0.0.1:5432` or `6379`.
- **Resolution**:
  ```bash
  npm run docker:infra
  docker compose ps
  ```

## 3. Auction Bid Returns `403 Forbidden`

- **Cause**: A `SELLER` account currently has Seller Mode enabled (`isSellerActive = true`) or owns the auction lot.
- **Resolution**: Switch back to Buyer Mode before placing bids.

## 4. OpenAPI Drift & Wiki Sync Before Merging

- Re-export OpenAPI, verify bilingual docs parity, and build Docusaurus:
  ```bash
  npm run docs:openapi
  npm run docs:check
  npm run docs:build
  ```
- Sync documentation pages to GitLab Wiki (requires authenticated `glab`):
  ```bash
  npm run docs:sync-gitlab-wiki
  ```
