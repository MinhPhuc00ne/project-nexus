---
title: 'ADR-004: Docusaurus v3 & Scalar OpenAPI'
---

# ADR-004: Docusaurus v3 & Scalar OpenAPI Documentation Portal

- **Status**: Accepted

## Context

Scattered Markdown files across the repository drifted out of sync with NestJS/Prisma code, lacked full-text search and architecture diagrams, and could not render interactive REST API docs statically.

## Decision

- Create the `docs-site/` workspace powered by **Docusaurus v3** with bilingual `vi` (default) and `en` locales, `@docusaurus/theme-mermaid`, and `@easyops-cn/docusaurus-search-local`.
- Embed **Scalar OpenAPI Reference** (`docs-site/src/pages/api-reference.tsx`) reading `docs-site/static/openapi/nexus-openapi.json` (generated from NestJS Swagger via `npm run docs:openapi`).
- Enforce bilingual parity and OpenAPI validity via `npm run docs:check` (`check-docs-parity.mjs`) and automate GitLab Wiki publishing via `npm run docs:sync-gitlab-wiki`.

## Consequences

- **Positive**: Architecture guides, ERDs, state machines, and 229+ API paths live in a single searchable static portal.
- **Trade-off**: Any new or renamed page under `docs-site/docs/` requires a matching translation under `docs-site/i18n/en/...` to pass `docs:check`.
