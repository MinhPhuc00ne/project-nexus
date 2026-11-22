---
title: Kiểm thử 3 Tầng & CI
---

# Hệ thống Kiểm thử 3 Tầng & CI/CD

Project Nexus áp dụng chiến lược kiểm thử 3 tầng kết hợp kiểm tra tĩnh và đối xứng tài liệu/đa ngôn ngữ trước khi hợp nhất vào nhánh `dev`.

## 1. Kiến trúc Kiểm thử 3 Tầng

| Tầng kiểm thử                          | Công cụ & Môi trường                                                             | Phạm vi bao phủ                                                                                                                                                                                                                                 | Lệnh chạy & Đầu ra                                                           |
| :------------------------------------- | :------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------- |
| **Tầng 1: Backend Unit & Integration** | `node:test` + `ts-node` (`backend/test/*.test.mjs`)                              | Escrow, hủy/hoàn tiền, GHN shipping/pickup/tracking, uy tín, tồn kho, bảo mật tài liệu, cấp phát Staff, chat/notifications                                                                                                                      | `npm run test:coverage --workspace=backend` → `backend/coverage/lcov.info`   |
| **Tầng 2: Frontend Unit & Component**  | **Vitest `5.1` + React Testing Library + `jsdom`** (`frontend/vitest.config.ts`) | Contexts (`AuthContext`, `ToastProvider`, `useAdminContext`), Routing & Guards (`ProtectedRoute`, `RouteErrorBoundary`), `i18n` & formatters, `apiErrors`, `utils` (`category-tree`, `date-time`, `notificationNavigation`), `LanguageSwitcher` | `npm run test:coverage --workspace=frontend` → `frontend/coverage/lcov.info` |
| **Tầng 3: E2E Smoke**                  | Playwright (`Chromium`, `e2e/`)                                                  | Luồng Guest/Auth, chuyển ngôn ngữ `vi`/`en`, smoke check toàn hệ thống                                                                                                                                                                          | `npm run test:e2e:smoke` → `e2e/report/`                                     |

## 2. Cấu hình Vitest trên Frontend (`frontend/vitest.config.ts`)

- **Setup File (`frontend/src/test/setup.ts`)**: Import `@testing-library/jest-dom/vitest`, tự động gọi `cleanup()` sau mỗi test (`afterEach`), và khởi tạo `i18n` để mọi test component dùng được `useTranslation` mà không cần mock thủ công.
- **Alias Resolution**: Ánh xạ `@` → `frontend/src` và `@nexus/types` → `packages/types/src/index.ts`.
- **Coverage Provider**: `@vitest/coverage-v8` xuất `text` + `lcov` tại `frontend/coverage/`.
- **Phạm vi Context & Guard đã kiểm thử**:
  - `AuthContext.test.tsx`: Kiểm tra guest state, `BUYER`/`SELLER`/`SUPPORT_STAFF`/`ADMIN` role flags, `isShopSuspended`, `applyModeOverride` theo route `/seller` & `/buyer`, merge giỏ hàng khi Buyer/Seller login (bỏ qua Admin/Staff), in-flight dedup, `storage` cross-tab sync, và lỗi `switchActiveMode`.
  - `ToastProvider.test.tsx`: Kiểm tra `useToast` ngoài provider, portal render `role="status"`/`role="alert"`, giới hạn tối đa 3 toast, `dismiss`, action click và auto-dismiss timer.
  - `useAdminContext.test.tsx`: Kiểm tra `useOutletContext` trong `AdminLayout`.
  - `ProtectedRoute.test.tsx` & `RouteErrorBoundary.test.tsx`: Kiểm tra redirect `/login` kèm `state.from`, trạng thái `isLoading`, chặn sai role, render `children`/`Outlet`, và fallback khi component con crash.

## 3. Checklist Verification trước khi tạo Merge Request (`CONTRIBUTING.md`)

```bash
# 1. Định dạng Prettier & Static Analysis (ESLint + SonarJS)
npm run format:check
npm run lint

# 2. Kiểm tra đối xứng i18n (Frontend) và tài liệu song ngữ + OpenAPI (Docs)
npm run i18n:check
npm run docs:check
npm run docs:build

# 3. Build toàn bộ monorepo & chạy tất cả unit test
npx turbo run build
npx turbo run test
```
