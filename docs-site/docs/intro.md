---
slug: /
sidebar_position: 1
title: Tổng quan Project Nexus
---

# Project Nexus

**Project Nexus** là nền tảng thương mại điện tử đa cửa hàng (Multi-Shop E-Commerce) kết hợp **đấu giá trực tuyến thời gian thực 3D**, hệ thống ví nội bộ & ký quỹ (Escrow), vận chuyển GHN Express, và trợ lý AI mua sắm.

> **Nguyên tắc tài liệu**: Toàn bộ tài liệu trong cổng Docusaurus này được đối chiếu trực tiếp từ mã nguồn thực tế (`backend/prisma/schema.prisma`, `backend/src/modules/*`, `frontend/src/*`) và tự động đồng bộ API Reference từ NestJS Swagger (`nexus-openapi.json`).

## Công nghệ cốt lõi (Tech Stack)

| Tầng hệ thống           | Công nghệ                                                           | Vai trò chính                                        |
| :---------------------- | :------------------------------------------------------------------ | :--------------------------------------------------- |
| Monorepo                | npm workspaces + Turborepo                                          | Điều phối build, lint, test và cache                 |
| Shared Contracts        | TypeScript 5.9 (`@nexus/types`), `@nexus/config`                    | Dùng chung Enum, Event và DTO giữa FE/BE             |
| Backend                 | NestJS 12 (Modular Monolith)                                        | 10 domain modules cô lập + `@nestjs/event-emitter`   |
| Database & ORM          | PostgreSQL 17 + Prisma 7                                            | Lưu trữ quan hệ, ACID transaction, pessimistic lock  |
| Cache & Realtime        | Redis 7 + Socket.IO 4                                               | Distributed lock đấu giá, thông báo và chat realtime |
| Thanh toán & Vận chuyển | PayOS (VietQR), Ví NEXUS Pay, COD, GHN API                          | Thanh toán, ký quỹ Escrow và tạo vận đơn             |
| Frontend                | React 19 + Vite 8 + Tailwind CSS v4                                 | 5 cổng: Guest, Buyer, Seller, Staff, Admin + i18n    |
| Chất lượng & Kiểm thử   | SonarLint, `eslint-plugin-sonarjs`, `node:test`, Vitest, Playwright | Quality gate 3 tầng và kiểm thử 3 tầng               |
