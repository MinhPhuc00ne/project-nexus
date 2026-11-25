---
title: 3-Tier Testing and CI
---

# 3-Tier Testing and Continuous Integration

Project Nexus enforces a 3-tier automated testing pyramid paired with static analysis, i18n parity, and documentation checks before merging into `dev`.

## 1. Testing Pyramid

| Tier                                 | Tooling and Runtime                                                          | Scope Covered                                                                                                                                                                                                                                                                                                                                           | Command and Output                                                           |
| :----------------------------------- | :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------- |
| Tier 1: Backend Unit and Integration | `node:test` + `ts-node` (`backend/test/*.test.mjs`)                          | Order escrow, cancellations and refunds, GHN shipping, pickup, and tracking, reputation, inventory reservations, document security, Staff provisioning, notifications                                                                                                                                                                                   | `npm run test:coverage --workspace=backend` → `backend/coverage/lcov.info`   |
| Tier 2: Frontend Unit and Component  | Vitest `5.1` + React Testing Library + `jsdom` (`frontend/vitest.config.ts`) | Contexts (`AuthContext`, `ToastProvider`, `useAdminContext`), Routing and Guards (`ProtectedRoute`, `RouteErrorBoundary`), Core Services (`api`, `auth`, `authNotice`, `cartSync`, `auction-response.helpers`), `i18n` and formatters, `apiErrors`, `utils` (`category-tree`, `date-time`, `notificationNavigation`), `LanguageSwitcher`, `ScrollToTop` | `npm run test:coverage --workspace=frontend` → `frontend/coverage/lcov.info` |
| Tier 3: E2E Smoke                    | Playwright (`Chromium`, `e2e/`)                                              | Guest and authenticated journeys, `vi` and `en` language switching, end-to-end smoke checks                                                                                                                                                                                                                                                             | `npm run test:e2e:smoke` → `e2e/report/`                                     |

## 2. Frontend Vitest Architecture (`frontend/vitest.config.ts`)

- Global Setup (`frontend/src/test/setup.ts`): Loads `@testing-library/jest-dom/vitest`, runs `cleanup()` in `afterEach`, and initializes `i18n` so components using `useTranslation` work directly.
- Alias Resolution: Maps `@` → `frontend/src` and `@nexus/types` → `packages/types/src/index.ts`.
- Coverage Provider: `@vitest/coverage-v8` emits `text` + `lcov` reports into `frontend/coverage/`.
- Context and Guard Coverage:
  - `AuthContext.test.tsx`: Covers guest initialization, `BUYER`, `SELLER`, `SUPPORT_STAFF`, and `ADMIN` role flags, `isShopSuspended` override, `/seller` and `/buyer` route mode overrides, guest cart merge on Buyer and Seller login (skipped for Admin and Staff), in-flight deduplication, `storage` cross-tab sync, and `switchActiveMode` error propagation.
  - `ToastProvider.test.tsx`: Covers `useToast` guard, portal rendering (`role="status"` and `role="alert"`), 3-toast queue cap, `dismiss`, action callbacks, and auto-dismiss timers.
  - `useAdminContext.test.tsx`: Covers `useOutletContext` sharing inside `AdminLayout`.
  - `ProtectedRoute.test.tsx` and `RouteErrorBoundary.test.tsx`: Covers `/login` redirect with `state.from`, `isLoading` status, role mismatch redirect, `children` and `Outlet` rendering, and crash recovery UI.

## 3. Pre-Pull-Request Verification Checklist (`CONTRIBUTING.md`)

```bash
# 1. Prettier formatting and ESLint + SonarJS static analysis
npm run format:check
npm run lint

# 2. Frontend i18n parity and English docs + OpenAPI checks
npm run i18n:check
npm run docs:check
npm run docs:build

# 3. Full monorepo build and unit test suites
npx turbo run build
npx turbo run test
```
