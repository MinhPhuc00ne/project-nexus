---
title: Chuẩn Code, Naming & Sonar Quality
---

# Tiêu chuẩn Code, Naming & Sonar Quality Gate

## 1. Quy tắc Clean Code (`eslint.config.mjs`)

- **Cấm `any`**: `@typescript-eslint/no-explicit-any` ở mức `error`. Dùng `unknown` + type narrowing hoặc generic cụ thể.
- **Kiểu trả về tường minh**: Service method, controller endpoint và public helper phải khai báo return type rõ ràng.
- **An toàn Null/Undefined**: Ưu tiên `?.` và `??`; hạn chế `!` (non-null assertion chỉ dùng ở `main.tsx` khi mount root).
- **Cấm comment inline dư thừa**: Không viết comment giải thích cú pháp hiển nhiên; dùng TSDoc/JSDoc (`/** ... */`) cho class, interface, hàm public và `///` cho Prisma schema.
- **Độ phức tạp & Kích thước**:
  - Giữ file gọn (khuyến nghị `< 300` dòng), hàm dưới `~30` dòng, tối đa 3 tham số (nhiều hơn hãy gom vào DTO/options object).
  - Ưu tiên early return để giảm nesting depth và cognitive complexity (`sonarjs/cognitive-complexity`).

## 2. Quy ước Đặt tên (Naming Conventions)

| Thành phần                     | Quy ước                         | Ví dụ chuẩn                                            |
| :----------------------------- | :------------------------------ | :----------------------------------------------------- |
| **Backend files & folders**    | `kebab-case`                    | `order-escrow.service.ts`, `ghn-order-api.service.ts`  |
| **React Components**           | `PascalCase`                    | `LanguageSwitcher.tsx`, `ProtectedRoute.tsx`           |
| **React Custom Hooks**         | `camelCase` (`use*`)            | `useAuth.ts`, `useToast.ts`, `useAdminContext.ts`      |
| **Classes, Interfaces, Types** | `PascalCase`                    | `UserProfile`, `AuthContextType`, `OrderSummaryDto`    |
| **Database Tables & Columns**  | `snake_case`                    | `escrow_records`, `seller_payout`, `locked_balance`    |
| **REST Routes**                | `kebab-case`                    | `/api/v1/users/toggle-seller`, `/api/v1/after-sales`   |
| **WebSocket Events**           | `domain:action`                 | `auction:bid:placed`, `notification:unread_count`      |
| **Boolean Variables**          | `is` / `has` / `can` / `should` | `isSellerActive`, `isShopSuspended`, `hasPriceChanged` |

## 3. Kiểm soát Chất lượng 3 Tầng (Zero-Server Sonar)

1. **Tầng 1 (IDE Realtime)**: `.vscode/extensions.json` & `.vscode/settings.json` cấu hình `SonarSource.sonarlint-vscode` để cảnh báo ngay khi gõ code.
2. **Tầng 2 (Lint, Format & Git Hooks)**:
   - `eslint.config.mjs` tích hợp `eslint-plugin-sonarjs` + `typescript-eslint`.
   - Husky `pre-commit` chạy `lint-staged` (ESLint `--fix` + Prettier `--write`).
   - Husky `commit-msg` chạy `@commitlint/cli` kiểm tra Conventional Commits (`<type>(<scope>): <subject>` tối đa 100 ký tự, không dùng `&`).
3. **Tầng 3 (Online Dashboard Ready)**: `sonar-project.properties` và `infra/templates/sonarcloud.yml.example` đọc trực tiếp `backend/coverage/lcov.info` và `frontend/coverage/lcov.info`.
