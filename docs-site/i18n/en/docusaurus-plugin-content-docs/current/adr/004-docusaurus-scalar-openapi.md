---
title: 'ADR-004: Docusaurus v3 & Scalar OpenAPI'
---

# ADR-004: Docusaurus v3 & Scalar OpenAPI Portal

- **Status**: Accepted
- **Context**: Legacy raw Markdown files in `docs/` drifted from the live codebase (e.g., outdated initial reputation score and missing auction/after-sales models).
- **Decision**: Consolidate all documentation into `docs-site/` (Docusaurus v3, bilingual `vi`/`en`, Mermaid, Local Search), auto-export `nexus-openapi.json` from NestJS Swagger rendered via `@scalar/api-reference-react`, and enforce CI drift checks (`docs:check`).
- **Consequences**: Keeps API documentation 100% synchronized with NestJS controllers/DTOs and establishes a single source of truth.
