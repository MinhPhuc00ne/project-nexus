---
title: 'ADR-003: Zero-Server Sonar Quality Gate'
---

# ADR-003: Three-Tier Zero-Server Sonar Quality Gate

Status: Accepted.

## Context

The repository requires SonarQube-grade static analysis for code smells, cognitive complexity, security rules, and test coverage without provisioning and maintaining a dedicated SonarQube server during local development.

## Decision

Adopt a three-tier zero-server Sonar quality gate:

1. Tier 1 (IDE realtime): recommend `SonarSource.sonarlint-vscode` via `.vscode/extensions.json` and `.vscode/settings.json`.
2. Tier 2 (local and CI lint gate): integrate `eslint-plugin-sonarjs` in `eslint.config.mjs` alongside Prettier, Husky (`pre-commit` and `commit-msg` commitlint), and `npm run test:coverage` generating `lcov.info`.
3. Tier 3 (online dashboard ready): maintain `sonar-project.properties` and `infra/templates/sonarcloud.yml.example` so SonarQube Cloud can be activated later by providing `SONAR_TOKEN`.

## Consequences

- Positive: contributors catch code smells at edit and commit time with zero infrastructure overhead.
- Trade-off: contributors must run `npm run lint` and `npm run test:coverage` locally or in CI before merging.
