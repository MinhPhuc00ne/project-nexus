---
title: Runbook Vận hành & Xử lý Sự cố
---

# Runbook Vận hành & Xử lý Sự cố

## 1. Lỗi thiếu cột DB khi khởi động Backend / Đấu giá

- **Triệu chứng**: `The column auction_items.lot_status does not exist` hoặc lỗi Prisma schema mismatch.
- **Cách xử lý**:
  ```bash
  npx prisma migrate deploy --schema=backend/prisma/schema.prisma
  npx prisma generate --schema=backend/prisma/schema.prisma
  ```

## 2. Lỗi kết nối PostgreSQL / Redis ở Local

- **Triệu chứng**: `ECONNREFUSED 127.0.0.1:5432` hoặc `6379`.
- **Cách xử lý**:
  ```bash
  npm run docker:infra
  docker compose ps
  ```

## 3. Lỗi đặt giá đấu giá trả về `403 Forbidden`

- **Nguyên nhân**: Tài khoản `SELLER` đang bật chế độ Người bán (`isSellerActive = true`) hoặc là chủ sở hữu của vật phẩm đấu giá.
- **Cách xử lý**: Tắt chế độ Người bán về chế độ Người mua trước khi đặt giá.

## 4. Lệch OpenAPI hoặc kiểm tra Wiki trước khi Merge

- Chạy lại đồng bộ OpenAPI & kiểm tra Wiki:
  ```bash
  npm run docs:openapi
  npm run docs:check
  npm run docs:build
  ```
- Đồng bộ trang Wiki lên GitLab Wiki (yêu cầu đã đăng nhập `glab`):
  ```bash
  npm run docs:sync-gitlab-wiki
  ```
