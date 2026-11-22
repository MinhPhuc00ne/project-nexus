---
title: Kiểm thử 3 Tầng & CI
---

# Hệ thống Kiểm thử 3 Tầng

| Tầng                            | Công cụ                        | Lệnh chạy                                    | Đầu ra                        |
| :------------------------------ | :----------------------------- | :------------------------------------------- | :---------------------------- |
| **1. Backend Unit/Integration** | `node:test` + `ts-node`        | `npm run test:coverage --workspace=backend`  | `backend/coverage/lcov.info`  |
| **2. Frontend Unit/Component**  | Vitest + React Testing Library | `npm run test:coverage --workspace=frontend` | `frontend/coverage/lcov.info` |
| **3. E2E Smoke**                | Playwright (Chromium)          | `npm run test:e2e:smoke`                     | `e2e/report/`                 |

## Lệnh kiểm tra nhanh trước khi tạo Merge Request

```bash
npm run format:check
npm run lint
npm run i18n:check
npm run build
npm test
```
