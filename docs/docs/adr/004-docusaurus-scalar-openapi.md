---
title: 'ADR-004: Docusaurus v3 and Scalar OpenAPI'
---

# ADR-004: Docusaurus v3 and Scalar OpenAPI Documentation Portal

Status: Accepted.

## Context

Scattered Markdown files across the repository drifted out of sync with NestJS and Prisma code, lacked full-text search and architecture diagrams, and could not render interactive REST API documentation statically.

## Decision

- Maintain the `docs/` workspace powered by Docusaurus v3 in English, with `@docusaurus/theme-mermaid` for diagrams and `@easyops-cn/docusaurus-search-local` for static search.
- Embed Scalar OpenAPI Reference (`docs/src/pages/api-reference.tsx`) reading `docs/static/openapi/nexus-openapi.json`, generated from NestJS Swagger via `npm run docs:openapi`.
- Enforce OpenAPI validity and engineering writing standards via `npm run docs:check` (`docs/scripts/check-docs.mjs`) and publish the static portal automatically to GitHub Pages via `.github/workflows/docs-pages.yml`.

## Consequences

- Positive: architecture guides, ERDs, state machines, and 236 REST API paths live in a single searchable static portal.
- Trade-off: documentation changes must pass automated style checks and a full Docusaurus build before merging.
