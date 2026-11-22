---
title: Code Standards & Sonar Quality Gate
---

# Code Standards & Sonar Quality Gate

The repository enforces a **3-tier** quality assurance architecture:

1. **Tier 1 (IDE Realtime)**: VS Code recommends `SonarSource.sonarlint-vscode` via `.vscode/extensions.json` and `.vscode/settings.json`.
2. **Tier 2 (Lint & Pre-commit Gate)**: `eslint.config.mjs` integrates `eslint-plugin-sonarjs` alongside Prettier, Husky, and `commitlint`.
3. **Tier 3 (Online Dashboard Ready)**: `sonar-project.properties` and `infra/templates/sonarcloud.yml.example` are pre-configured for future SonarQube Server or SonarQube Cloud activation.
