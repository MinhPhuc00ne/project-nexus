---
title: Khởi chạy Local & Docker
---

# Bắt đầu nhanh (Quickstart)

## Yêu cầu môi trường

- **Node.js** `>= 20.x` (khuyến nghị `22.x` hoặc `24.x` để dùng native `lcov` test coverage)
- **npm** `>= 10.x`
- **Docker & Docker Compose** (để chạy PostgreSQL 17 và Redis 7)

## Cài đặt & Khởi chạy

```bash
# 1. Cài đặt dependencies cho toàn monorepo
npm install --legacy-peer-deps

# 2. Khởi chạy PostgreSQL 17 và Redis 7
npm run docker:infra

# 3. Sinh Prisma Client, chạy migration và seed dữ liệu mẫu
npx prisma generate --schema=backend/prisma/schema.prisma
npx prisma migrate dev --schema=backend/prisma/schema.prisma
npm run prisma:seed

# 4. Chạy đồng thời Backend (3000) và Frontend (5173)
npm run dev
```

## Các cổng dịch vụ mặc định

- **Frontend Portal**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:3000/api/v1`
- **Swagger UI (Live)**: `http://localhost:3000/api/docs`
- **Docusaurus Docs**: `npm run docs:dev` (`http://localhost:3000` nếu backend tắt, hoặc chạy kèm port riêng)
