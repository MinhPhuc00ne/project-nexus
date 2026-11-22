---
title: Chuẩn Code, Naming & Sonar Quality
---

# Tiêu chuẩn Code, Naming & Sonar Quality Gate

## 1. Quy tắc Clean Code (`eslint.config.mjs`)

- **Cấm `any`**: `@typescript-eslint/no-explicit-any` ở mức `error`.
- **Kiểu trả về tường minh**: Service method, controller endpoint và public helper phải khai báo return type rõ ràng.
- **An toàn Null/Undefined**: Ưu tiên `?.` và `??`; hạn chế `!` (chỉ dùng ở `main.tsx` mount root).
- **Cấm comment inline dư thừa**: `no-inline-comments` cảnh báo các comment giải thích cú pháp hiển nhiên; dùng TSDoc/JSDoc (`/** ... */`) cho class, interface, hàm public và `///` cho Prisma schema.
- **Độ phức tạp & Độ dài**: Khuyến nghị file dưới ~300 dòng, hàm gọn dưới ~30 dòng, tối đa 3 tham số (nhiều hơn hãy gom vào DTO/interface), ưu tiên early return.

## 2. Quy ước Đặt tên (Naming Conventions)

| Thành phần                 | Quy ước                         | Ví dụ chuẩn                         |
| :------------------------- | :------------------------------ | :---------------------------------- |
| Backend files & folders    | `kebab-case`                    | `order-escrow.service.ts`           |
| React Components           | `PascalCase`                    | `LanguageSwitcher.tsx`              |
| React Custom Hooks         | `camelCase` (`use*`)            | `useAuth.ts`, `useToast.ts`         |
| Classes, Interfaces, Types | `PascalCase`                    | `UserProfile`, `OrderSummaryDto`    |
| Database Tables & Columns  | `snake_case`                    | `escrow_records`, `seller_payout`   |
| REST Routes                | `kebab-case`                    | `/api/v1/users/toggle-seller`       |
| WebSocket Events           | `domain:action`                 | `auction:bid:placed`                |
| Boolean Variables          | `is` / `has` / `can` / `should` | `isSellerActive`, `hasPriceChanged` |

## 3. Kiểm soát Chất lượng 3 Tầng (Sonar)

1. **Tầng 1 (IDE Realtime)**: VS Code gợi ý `SonarSource.sonarlint-vscode` qua `.vscode/extensions.json` & `.vscode/settings.json`.
2. **Tầng 2 (Lint & Pre-commit Gate)**: `eslint.config.mjs` tích hợp `eslint-plugin-sonarjs`, chạy cùng Prettier, Husky (`lint-staged`) và `commitlint`.
3. **Tầng 3 (Online Dashboard Ready)**: `sonar-project.properties` + `infra/templates/sonarcloud.yml.example` sẵn sàng kích hoạt khi kết nối SonarQube Server hoặc SonarQube Cloud.
