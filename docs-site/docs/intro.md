---
slug: /
sidebar_position: 1
title: Tổng quan Project Nexus
---

# Project Nexus

**Project Nexus** là nền tảng thương mại điện tử đa cửa hàng (Multi-Shop E-Commerce) kết hợp **đấu giá trực tuyến thời gian thực 3D**, hệ thống ví nội bộ & ký quỹ (Escrow), vận chuyển GHN Express, kiểm duyệt vận hành đa cấp và trợ lý AI mua sắm.

> **Nguyên tắc tài liệu**: Toàn bộ tài liệu trong cổng Docusaurus này được đối chiếu trực tiếp từ mã nguồn thực tế (`backend/prisma/schema.prisma`, `backend/src/modules/*`, `frontend/src/*`, `packages/types/src/*`) và tự động đồng bộ đặc tả REST API từ NestJS Swagger (`docs-site/static/openapi/nexus-openapi.json`).

## Kiến trúc 5 Cổng Người dùng (Portals)

| Cổng (Portal)     | Route Prefix                                   | Đối tượng sử dụng                                | Năng lực chính                                                                                                   |
| :---------------- | :--------------------------------------------- | :----------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **Guest**         | `/`, `/search`, `/product/:id`, `/auction/:id` | Khách vãng lai & người xem                       | Duyệt danh mục 3 cấp, tìm kiếm sản phẩm, xem shop, xem đấu giá 3D live, giỏ hàng tạm                             |
| **Buyer**         | `/buyer/*`, `/cart`, `/checkout`               | Người mua đã xác thực                            | Thanh toán PayOS / Ví NEXUS Pay / COD, theo dõi đơn GHN, đấu giá, ví & nạp/rút, khiếu nại & trả hàng, uy tín     |
| **Seller**        | `/seller/*`                                    | Chủ cửa hàng (chuyển chế độ không cần đăng xuất) | Quản lý sản phẩm & biến thể, tồn kho đa kho, xử lý đơn & tạo vận đơn GHN, ký gửi đấu giá, tài chính & rút tiền   |
| **Support Staff** | `/staff/*`                                     | Nhân viên hỗ trợ (`@staff.com`)                  | Hàng đợi chat hỗ trợ realtime, duyệt hồ sơ nâng cấp Seller, xử lý tranh chấp, hỗ trợ phiên đấu giá, FAQ & banner |
| **Admin**         | `/admin/*`                                     | Quản trị viên sàn                                | Giám sát toàn sàn, quản lý User/Seller/Shop/Category/Product/Order/Auction, đối soát hoàn tiền, cấu hình phí sàn |

## Công nghệ cốt lõi (Tech Stack)

| Tầng hệ thống               | Công nghệ & Phiên bản                                                            | Vai trò chính                                                              |
| :-------------------------- | :------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **Monorepo**                | npm workspaces + Turborepo `2.11`                                                | Điều phối build, lint, test, coverage và cache liên workspace              |
| **Shared Contracts**        | TypeScript `5.9` (`@nexus/types`, `@nexus/config`)                               | Nguồn chân lý duy nhất cho Enum, DTO và WebSocket event names giữa FE/BE   |
| **Backend**                 | NestJS `12` (Modular Monolith Level 1.5)                                         | 10 domain modules cô lập + `@nestjs/event-emitter` in-process bus          |
| **Database & ORM**          | PostgreSQL `17` + Prisma `7`                                                     | Lưu trữ quan hệ, ACID transaction (`$transaction`), pessimistic row lock   |
| **Cache & Realtime**        | Redis `7` + Socket.IO `4.8`                                                      | Distributed lock đấu giá, chống race condition, chat & thông báo realtime  |
| **Thanh toán & Vận chuyển** | PayOS (VietQR), Ví NEXUS Pay, COD, GHN API v2                                    | Thanh toán có `Idempotency-Key`, ký quỹ Escrow `7%`, tạo vận đơn & webhook |
| **AI & Media**              | Google Gemini (`gemini-3.1-flash-lite`) + Cloudinary                             | Trợ lý AI mua sắm có rate-limit, lưu trữ ảnh/chứng thư/model 3D            |
| **Frontend**                | React `19.3` + Vite `8.3` + Tailwind CSS `v4`                                    | SPA 5 cổng, `react-i18next` (10 namespaces), TanStack Query, Zustand       |
| **Chất lượng & Kiểm thử**   | SonarLint, `eslint-plugin-sonarjs`, `node:test`, Vitest `5.1`, Playwright `1.65` | Quality gate 3 tầng và kiểm thử 3 tầng (Unit/Integration/E2E)              |
| **Tài liệu**                | Docusaurus `3` + Scalar OpenAPI + Mermaid + Local Search                         | Tài liệu song ngữ `vi`/`en`, API Reference tương tác, đồng bộ GitLab Wiki  |

## Cấu trúc Thư mục Monorepo

```text
project-nexus/
├── backend/                 # NestJS 12 API, Prisma 7 schema, migrations, seed, node:test
├── frontend/                # React 19 SPA, i18n (vi/en), Vitest + React Testing Library
├── packages/
│   ├── types/               # @nexus/types: Enums, Models, WebSocket Events dùng chung
│   └── config/              # @nexus/config: cấu hình TypeScript/ESLint dùng chung
├── docs-site/               # Docusaurus v3 + Scalar OpenAPI + check-docs-parity + wiki sync
├── e2e/                     # Playwright E2E smoke tests
├── infra/                   # Docker Compose (Postgres, Redis, Backend, Frontend) & Sonar templates
└── .gitlab/                 # GitLab CI/CD & Merge Request templates
```

## Lộ trình đọc tài liệu theo Vai trò

- **Kỹ sư mới tham gia (Onboarding)**: Đọc [Khởi chạy Local & Docker](/getting-started/quickstart) → [Biến môi trường](/getting-started/environment) → [Chuẩn Code & Sonar](/quality/code-standards).
- **Backend Engineer**: Đọc [Kiến trúc Tổng thể](/architecture/system-overview) → [Cơ sở dữ liệu](/architecture/database-schema) → [Quy tắc Nghiệp vụ](/architecture/business-rules) → [Chi tiết 10 Modules](/modules/overview) → [API Reference](/api-reference).
- **Frontend Engineer**: Đọc [Kiến trúc Frontend](/frontend/architecture) → [Đặc tả Giao diện](/frontend/ui-specification) → [Hướng dẫn Đa ngôn ngữ](/frontend/i18n-guide) → [Sự kiện Realtime](/architecture/realtime-events).
- **QA / DevOps / Release**: Đọc [Kiểm thử 3 Tầng & CI](/quality/testing-ci) → [State Machines](/architecture/state-machines) → [Runbook Vận hành](/operations/runbook).
