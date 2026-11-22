---
title: 'ADR-003: Zero-Server 3-Tier Sonar Quality'
---

# ADR-003: Zero-Server 3-Tier Sonar Quality Gate

- **Status**: Accepted
- **Context**: The repository is hosted on an internal Git host instance without dedicated project runners or a hosted SonarQube server.
- **Decision**: Implement Tier 1 (VS Code SonarLint), Tier 2 (`eslint-plugin-sonarjs` + native `lcov` coverage from `node:test` and Vitest), and pre-configure Tier 3 (`sonar-project.properties` + `infra/templates/sonarcloud.yml.example`).
- **Consequences**: Delivers immediate static analysis and coverage tracking at zero infrastructure cost, while remaining ready for SonarQube Server or SonarQube Cloud activation.
