---
title: 3-Tier Testing & CI
---

# 3-Tier Testing & CI/CD

Project Nexus enforces a 3-tier automated testing pyramid paired with static analysis, i18n parity, and documentation parity gates before merging into `dev`.

## 1. Testing Pyramid

| Tier                                   | Tooling & Runtime                                                                | Scope Covered                                                                                                                                                                                                                                   | Command & Output                                                             |
| :------------------------------------- | :------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- |
| **Tier 1: Backend Unit & Integration** | `node:test` + `ts-node` (`backend/test/*.test.mjs`)                              | Order escrow, cancellation/refunds, GHN shipping/pickup/tracking, reputation, inventory reservations, document security, Staff provisioning, notifications                                                                                      | `npm run test:coverage --workspace=backend` → `backend/coverage/lcov.info`   |
| **Tier 2: Frontend Unit & Component**  | **Vitest `5.1` + React Testing Library + `jsdom`** (`frontend/vitest.config.ts`) | Contexts (`AuthContext`, `ToastProvider`, `useAdminContext`), Routing & Guards (`ProtectedRoute`, `RouteErrorBoundary`), `i18n` & formatters, `apiErrors`, `utils` (`category-tree`, `date-time`, `notificationNavigation`), `LanguageSwitcher` | `npm run test:coverage --workspace=frontend` → `frontend/coverage/lcov.info` |
| **Tier 3: E2E Smoke**                  | Playwright (`Chromium`, `e2e/`)                                                  | Guest/Auth journeys, `vi`/`en` language switching, end-to-end smoke checks                                                                                                                                                                      | `npm run test:e2e:smoke` → `e2e/report/`                                     |

## 2. Frontend Vitest Architecture (`frontend/vitest.config.ts`)

- **Global Setup (`frontend/src/test/setup.ts`)**: Loads `@testing-library/jest-dom/vitest`, runs `cleanup()` in `afterEach`, and initializes `i18n` so components using `useTranslation` work seamlessly.
- **Alias Resolution**: Maps `@` → `frontend/src` and `@nexus/types` → `packages/types/src/index.ts`.
- **Coverage Provider**: `@vitest/coverage-v8` emits `text` + `lcov` reports into `frontend/coverage/`.
- **Context & Guard Coverage**:
  - `AuthContext.test.tsx`: Covers guest initialization, `BUYER`/`SELLER`/`SUPPORT_STAFF`/`ADMIN` role flags, `isShopSuspended` override, `/seller` & `/buyer` route mode overrides, guest cart merge on Buyer/Seller login (skipped for Admin/Staff), in-flight deduplication, `storage` cross-tab sync, and `switchActiveMode` error propagation.
  - `ToastProvider.test.tsx`: Covers `useToast` guard, portal rendering (`role="status"` / `role="alert"`), 3-toast queue cap, `dismiss`, action callbacks, and auto-dismiss timers.
  - `useAdminContext.test.tsx`: Covers `useOutletContext` sharing inside `AdminLayout`.
  - `ProtectedRoute.test.tsx` & `RouteErrorBoundary.test.tsx`: Covers `/login` redirect with `state.from`, `isLoading` status, role mismatch redirect, `children`/`Outlet` rendering, and crash recovery UI.

## 3. Pre-Merge Request Verification Checklist (`CONTRIBUTING.md`)

```bash
# 1. Prettier formatting & ESLint + SonarJS static analysis
npm run format:check
npm run lint

# 2. Frontend i18n parity & bilingual docs + OpenAPI checks
npm run i18n:check
npm run docs:check
npm run docs:build

# 3. Full monorepo build & unit test suites
npx turbo run build
npx turbo run test
```
