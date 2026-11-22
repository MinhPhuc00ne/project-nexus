---
title: 3-Tier Testing & CI
---

# 3-Tier Testing Architecture

| Tier                            | Tooling                        | Command                                      | Output                        |
| :------------------------------ | :----------------------------- | :------------------------------------------- | :---------------------------- |
| **1. Backend Unit/Integration** | `node:test` + `ts-node`        | `npm run test:coverage --workspace=backend`  | `backend/coverage/lcov.info`  |
| **2. Frontend Unit/Component**  | Vitest + React Testing Library | `npm run test:coverage --workspace=frontend` | `frontend/coverage/lcov.info` |
| **3. E2E Smoke**                | Playwright (Chromium)          | `npm run test:e2e:smoke`                     | `e2e/report/`                 |

## Pre-MR Verification Commands

```bash
npm run format:check
npm run lint
npm run i18n:check
npm run build
npm test
```
