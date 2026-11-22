---
title: System Architecture
---

# System Architecture (Modular Monolith)

Project Nexus follows a **Level 1.5 Modular Monolith** architecture inside an `npm workspaces` + `Turborepo` monorepo:

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

## Module Isolation Rules

- Each domain module owns its Prisma tables and communicates via public services or `EventEmitter2`.
- Financial and inventory-sensitive workflows execute inside `prisma.$transaction()` with `SELECT ... FOR UPDATE` or Redis locks.
