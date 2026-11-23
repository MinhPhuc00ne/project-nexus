---
title: 'ADR-003: Zero-Server Sonar Quality Gate'
---

# ADR-003: 3-Tier Zero-Server Sonar Quality Gate

- **Status**: Accepted

## Context

The team needed SonarQube-grade enforcement for code smells, cognitive complexity, security rules, and test coverage without provisioning and maintaining a dedicated SonarQube Server during local development.

## Decision

Adopt a **3-Tier Zero-Server Sonar Quality Gate**:

1. **Tier 1 (IDE Realtime)**: Recommend `SonarSource.sonarlint-vscode` via `.vscode/extensions.json` and `.vscode/settings.json`.
2. **Tier 2 (Local & CI Lint Gate)**: Integrate `eslint-plugin-sonarjs` into `eslint.config.mjs` alongside Prettier, Husky (`pre-commit` + `commit-msg` commitlint), and `npm run test:coverage` generating `lcov.info`.
3. **Tier 3 (Online Dashboard Ready)**: Pre-configure `sonar-project.properties` and `infra/templates/sonarcloud.yml.example` so SonarQube Cloud/Server can be enabled later by providing `SONAR_TOKEN`.

## Consequences

- **Positive**: Zero infrastructure overhead while catching code smells at edit and commit time.
- **Trade-off**: Contributors must run `npm run lint` and `npm run test:coverage` locally/in CI before merging.
