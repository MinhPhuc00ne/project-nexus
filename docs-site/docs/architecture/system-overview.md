---
title: Kiến trúc Tổng thể
---

# Kiến trúc Hệ thống (Modular Monolith)

Project Nexus được tổ chức theo mô hình **Level 1.5 Modular Monolith** trong một monorepo `npm workspaces` + `Turborepo`:

```mermaid
flowchart TB
    FE["Frontend (React 19 + Vite 8 + i18next)<br/>5 Portals: Guest, Buyer, Seller, Staff, Admin"]
    TYPES["@nexus/types (Shared Enums, DTOs, WS Events)"]

    subgraph BE["Backend (NestJS 12)"]
        CORE["Core Layer<br/>Prisma, Redis, Mail, Cloudinary, JWT/RBAC, Filters"]
        MODS["10 Domain Modules<br/>auth, users, catalog, commerce, auction,<br/>fulfillment, chat, notifications, admin, media"]
        BUS["EventEmitter2 (In-process Domain Bus)"]
    end

    PG[(PostgreSQL 17)]
    RD[(Redis 7)]
    EXT["PayOS • GHN • Gemini AI • Cloudinary"]

    TYPES -.-> FE
    TYPES -.-> BE
    FE -->|REST + Socket.IO + Accept-Language| BE
    MODS --> CORE
    MODS <--> BUS
    CORE --> PG
    CORE --> RD
    MODS --> EXT
```

## Quy tắc cô lập Module

- Mỗi module sở hữu các bảng Prisma riêng và giao tiếp qua Service public hoặc `EventEmitter2`.
- Các thao tác đa bước nhạy cảm tài chính/tồn kho (thanh toán, đặt giá đấu giá, escrow, hoàn tiền) thực thi bên trong `prisma.$transaction()` kết hợp `SELECT ... FOR UPDATE` hoặc Redis lock.
