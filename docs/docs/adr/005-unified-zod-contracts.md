---
title: 'ADR-005: Unified Zod Contracts and Canonical AppErrorCode'
---

# ADR-005: Unified Zod Contracts and Canonical AppErrorCode

Status: Accepted.

## Context

Previously, `packages/types` (`@nexus/types`) and `packages/contracts` (`@nexus/contracts`) coexisted, while several NestJS controllers used bare `@Param()` / `@Query()` decorators without schema validation and returned ad-hoc prose error strings without machine-readable codes.

## Decision

- Consolidate all shared enums, Zod 4 request/query/parameter schemas, response envelopes, and WebSocket event contracts into `@nexus/contracts` (`packages/contracts/`), removing `packages/types/`.
- Enforce `@ZodBody`, `@ZodQuery`, and `@ZodParam` (`@nexus/contracts/nest`) across all 16 backend domain modules via `StandardSchemaValidationPipe`.
- Define 30 canonical `AppErrorCode` constants in `packages/contracts/src/common/error-codes.ts` and map every code in `frontend/src/i18n/locales/{en,vi}/errors.json` so `GlobalHttpExceptionFilter` emits structured `errorCode`s that the frontend translates dynamically.

## Consequences

- Positive: single source of truth for compile-time TypeScript types, runtime NestJS validation, Swagger OpenAPI schemas, and localized frontend error messages.
- Trade-off: changing a shared contract requires running `npm run build:contracts` and regenerating `docs/static/openapi/nexus-openapi.json` via `npm run docs:openapi`.
