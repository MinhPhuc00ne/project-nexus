---
title: Runbook Vận hành & Xử lý Sự cố
---

# Runbook Vận hành & Xử lý Sự cố

Tài liệu hướng dẫn xử lý nhanh các sự cố thường gặp trong quá trình phát triển, kiểm thử tích hợp và vận hành Project Nexus.

## 1. Lỗi thiếu cột DB hoặc lệch Prisma Client

- **Triệu chứng**: `The column auction_items.lot_status does not exist` hoặc `PrismaClientKnownRequestError` khi khởi động Backend.
- **Nguyên nhân**: Chưa áp dụng migration mới nhất từ `backend/prisma/migrations/` hoặc chưa tái tạo Prisma Client.
- **Cách xử lý**:
  ```bash
  npx prisma migrate deploy --schema=backend/prisma/schema.prisma
  npm run prisma:generate
  ```

## 2. Lỗi kết nối PostgreSQL / Redis ở Local (`ECONNREFUSED`)

- **Triệu chứng**: `ECONNREFUSED 127.0.0.1:5432` (PostgreSQL) hoặc `6379` (Redis).
- **Cách xử lý**:
  ```bash
  npm run docker:infra
  docker compose -f infra/docker-compose.yml ps
  ```
  Nếu cần reset sạch volume và seed lại dữ liệu mẫu:
  ```bash
  npm run docker:clean
  npm run docker:infra
  npx prisma migrate deploy --schema=backend/prisma/schema.prisma
  npm run prisma:seed
  ```

## 3. Lỗi đặt giá đấu giá trả về `403 Forbidden`

- **Triệu chứng**: Người dùng đã đăng nhập gọi `auction:bid:place` nhưng nhận `auction:bid:rejected` hoặc HTTP `403`.
- **Nguyên nhân**:
  1. Tài khoản `SELLER` đang bật chế độ Người bán (`isSellerActive = true`) — hệ thống chỉ cho phép xem ở chế độ Seller.
  2. Người dùng là chủ sở hữu của vật phẩm đấu giá (`sellerId === userId`).
- **Cách xử lý**: Gọi `/api/v1/users/toggle-seller` (hoặc chuyển mode trên UI Header) về chế độ Người mua (`BUYER`) trước khi đặt giá.

## 4. Sự cố Hủy đơn GHN Timeout & Đối soát Hoàn tiền PayOS

- **Hủy đơn trước lấy hàng khi GHN timeout**:
  - Hệ thống giữ `AfterSalesRequest` ở trạng thái pending bền vững (không nhả tiền Escrow hay cộng lại tồn kho vội).
  - Kiểm tra log `GhnOrderActionService` và trạng thái vận đơn trên portal GHN; nếu đơn đã hủy trên GHN, thực thi đối soát lại yêu cầu hủy.
- **Hoàn tiền đơn `PAYOS` (`OrderRefund.status = PENDING`)**:
  - Tiền hoàn đang nằm trong `lockedBalance` của ví Admin.
  - Sau khi chuyển khoản hoàn thực tế qua ngân hàng/PayOS, Admin nhập mã `externalReference` trên màn hình `/admin/refunds` để chốt trạng thái `SUCCESS`.

## 5. Lỗi Frontend i18n hoặc Build `@nexus/types`

- **Triệu chứng**: `Cannot find module '@nexus/types'` hoặc lỗi thiếu key dịch khi chạy `vitest` / `vite build`.
- **Cách xử lý**:
  ```bash
  npm run build:types
  npm run i18n:check
  ```

## 6. Đồng bộ OpenAPI, Kiểm tra Docs & Đẩy GitLab Wiki

Mỗi khi thêm/sửa Controller DTO trên Backend hoặc cập nhật tài liệu `docs-site/`:

```bash
# 1. Tái sinh file OpenAPI JSON từ NestJS Swagger
npm run docs:openapi

# 2. Kiểm tra đối xứng 100% trang vi <-> en và tính hợp lệ OpenAPI
npm run docs:check

# 3. Build production Docusaurus (bắt lỗi broken links & Mermaid syntax)
npm run docs:build

# 4. Đồng bộ toàn bộ trang tiếng Việt lên GitLab Wiki (cần đăng nhập glab)
npm run docs:sync-gitlab-wiki
```
