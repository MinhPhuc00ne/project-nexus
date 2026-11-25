---
title: 'ADR-002: Frontend i18n (Namespace-based)'
---

# ADR-002: Namespace-Based Frontend i18n Architecture (`vi` / `en`)

- Status: Accepted

## Context

Project Nexus serves both Vietnamese and international users across 5 distinct portals (`Guest`, `Buyer`, `Seller`, `Staff`, `Admin`). Hardcoded UI strings prevented localization and risked missing translations during parallel feature development.

## Decision

- Adopt `i18next` + `react-i18next` + `i18next-browser-languagedetector` with URL preservation (default `vi`), `<html lang>` synchronization, and automatic `Accept-Language` header injection in Axios (`services/api.ts`).
- Partition translation resources into 10 domain namespaces: `common`, `errors`, `auth`, `guest`, `auction`, `commerce`, `buyer`, `seller`, `staff`, `admin`.
- Enforce 100% key and interpolation (`{{...}}`) parity via `npm run i18n:check` (`frontend/scripts/check-i18n-parity.mjs`) and Vitest (`i18n.test.ts`).

## Consequences

- Positive: Clean domain ownership, manageable JSON files, and zero missing-key regressions across `vi` and `en`.
- Trade-off: All new UI strings and backend `errorCode` mappings must be added to both `vi` and `en` before merging.
