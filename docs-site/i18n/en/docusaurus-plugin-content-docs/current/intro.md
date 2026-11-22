---
slug: /
sidebar_position: 1
title: Project Nexus Overview
---

# Project Nexus

**Project Nexus** is an enterprise multi-shop e-commerce platform integrated with **real-time 3D live auctions**, an internal wallet and Escrow settlement engine, GHN Express logistics, and an AI shopping assistant.

> **Documentation Principle**: Every specification in this portal is audited directly against the live codebase (`backend/prisma/schema.prisma`, `backend/src/modules/*`, `frontend/src/*`), and the API Reference is auto-generated from NestJS Swagger (`nexus-openapi.json`).

## Core Technology Stack

| Layer                | Technology                                                          | Primary Responsibility                                  |
| :------------------- | :------------------------------------------------------------------ | :------------------------------------------------------ |
| Monorepo             | npm workspaces + Turborepo                                          | Orchestrates build, lint, test, and task caching        |
| Shared Contracts     | TypeScript 5.9 (`@nexus/types`), `@nexus/config`                    | Single source of truth for enums, events, and DTOs      |
| Backend              | NestJS 12 (Modular Monolith)                                        | 10 isolated domain modules + `@nestjs/event-emitter`    |
| Database & ORM       | PostgreSQL 17 + Prisma 7                                            | Relational persistence, ACID transactions, row locks    |
| Cache & Realtime     | Redis 7 + Socket.IO 4                                               | Distributed auction locks, notifications, and live chat |
| Payments & Logistics | PayOS (VietQR), NEXUS Pay Wallet, COD, GHN API                      | Multi-channel payments, escrow, and waybill fulfillment |
| Frontend             | React 19 + Vite 8 + Tailwind CSS v4                                 | 5 portals (Guest, Buyer, Seller, Staff, Admin) + i18n   |
| Quality & Testing    | SonarLint, `eslint-plugin-sonarjs`, `node:test`, Vitest, Playwright | 3-tier quality gate and 3-tier testing pyramid          |
