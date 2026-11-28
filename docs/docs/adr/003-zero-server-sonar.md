---
title: 'ADR-003: Zero-Server ESLint SonarJS Quality Gate'
---

# ADR-003: Zero-Server ESLint SonarJS Quality Gate

Status: Accepted (updated for Repository Hygiene).

## Context

The repository requires static analysis for code smells, cognitive complexity, security rules, and test coverage without provisioning and maintaining a dedicated SonarQube server. Additionally, tracking IDE-specific configuration under `.vscode/` or unused SonarCloud templates at the repository root imposes editor preferences and stale cloud metadata on open-source contributors.

## Decision

Adopt a lint-and-coverage static quality gate without server or IDE lock-in:

1. Enforce `eslint-plugin-sonarjs` in `eslint.config.mjs` alongside TypeScript ESLint, Prettier, Husky (`pre-commit` and `commit-msg` commitlint), and `npm run test:coverage` generating `lcov.info`.
2. Retire unused Tier 3 SonarCloud templates (`sonar-project.properties` and `infra/templates/sonarcloud.yml.example`).
3. Remove `.vscode/` from git tracking and ignore `.vscode/` in `.gitignore` so contributors keep personal IDE and SonarLint settings local.

## Consequences

- Positive: contributors catch code smells and complexity regressions during local lint and CI runs with zero server overhead and zero forced IDE settings.
- Trade-off: contributors who want real-time in-editor Sonar diagnostics configure their own IDE extensions locally.
