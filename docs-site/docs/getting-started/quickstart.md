---
title: Khởi chạy Local & Docker
---

# Bắt đầu nhanh (Quickstart)

Hướng dẫn này giúp bạn dựng đầy đủ môi trường phát triển Project Nexus trên máy cá nhân trong vòng chưa đầy 10 phút.

## 1. Yêu cầu môi trường

- **Node.js** `>= 20.x` (khuyến nghị `22.x` hoặc `24.x` để dùng native `lcov` coverage cho `node:test`).
- **npm** `>= 10.x` (monorepo dùng `npm@11.19.0` với workspaces).
- **Docker & Docker Compose** (chạy PostgreSQL 17 và Redis 7 qua `infra/docker-compose.yml`).
- **GitLab CLI (`glab`)** (tùy chọn, dùng để tạo Merge Request và đồng bộ GitLab Wiki).

## 2. Cài đặt & Khởi chạy từng bước

```bash
# 1. Sao chép file cấu hình môi trường
cp .env.example .env

# 2. Cài đặt dependencies cho toàn bộ workspaces (root, backend, frontend, docs-site, packages/*)
npm install --legacy-peer-deps

# 3. Build gói dùng chung @nexus/types trước khi chạy app
npm run build:types

# 4. Khởi chạy hạ tầng PostgreSQL 17 và Redis 7
npm run docker:infra

# 5. Sinh Prisma Client, chạy migration và seed dữ liệu mẫu
npm run prisma:generate
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
npm run prisma:seed

# 6. Khởi chạy đồng thời Backend (port 3000) và Frontend (port 5173)
npm run dev
```

> **Mẹo**: Nếu muốn chạy từng dịch vụ riêng biệt để dễ debug log, mở 2 terminal và chạy `npm run dev:backend` và `npm run dev:frontend`.

## 3. Chạy toàn bộ bằng Docker (Full Stack Profile)

Nếu không muốn cài Node/Postgres trực tiếp trên host, `docker-compose.yml` hỗ trợ profile `full`:

```bash
# Build và khởi chạy Postgres, Redis, Backend, Frontend
npm run docker:full

# Xem log realtime
npm run docker:logs

# Dừng toàn bộ container (giữ volume dữ liệu)
npm run docker:down

# Dọn sạch cả container lẫn volume (reset DB hoàn toàn)
npm run docker:clean
```

## 4. Các cổng dịch vụ mặc định

| Dịch vụ               | URL mặc định                                 | Ghi chú                                                                |
| :-------------------- | :------------------------------------------- | :--------------------------------------------------------------------- |
| **Frontend Portal**   | `http://localhost:5173`                      | Vite HMR dev server                                                    |
| **Backend REST API**  | `http://localhost:3000/api/v1`               | NestJS prefix `/api/v1`                                                |
| **Swagger UI (Live)** | `http://localhost:3000/api/docs`             | Sinh tự động từ NestJS decorators                                      |
| **Prisma Studio**     | `http://localhost:5555`                      | Chạy qua `npm run prisma:studio`                                       |
| **Docusaurus Docs**   | `http://localhost:3000` (hoặc `--port 3001`) | Chạy qua `npm run docs:dev` (nên đổi port nếu Backend đang chiếm 3000) |

## 5. Kiểm tra nhanh sau khi cài đặt

```bash
# Kiểm tra parity song ngữ của docs-site & OpenAPI spec
npm run docs:check

# Kiểm tra parity khóa dịch i18n của Frontend
npm run i18n:check

# Chạy toàn bộ unit test (Backend + Frontend)
npm test
```
