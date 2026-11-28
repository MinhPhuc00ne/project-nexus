---
title: Code Standards, Naming and Sonar Quality
---

# Code Standards, Naming and Sonar Quality Gate

## 1. Clean Code Rules (`eslint.config.mjs`)

- No `any`: `@typescript-eslint/no-explicit-any` is enforced at `error` level. Use `unknown` with type narrowing or explicit generics.
- Explicit Return Types: Public service methods, controller endpoints, and exported helpers must declare explicit return types.
- Null and Undefined Safety: Prefer `?.` and `??`; avoid `!` non-null assertions (permitted only in `main.tsx` root mount).
- No Redundant Inline Comments: Avoid narrating obvious syntax; write TSDoc and JSDoc (`/** ... */`) on public classes, interfaces, and functions, and `///` doc comments in Prisma schema.
- Complexity and Size:
  - Keep files focused (target `< 300` lines), functions concise (`~30` lines), and parameters $\le 3$ (bundle into DTO or options objects otherwise).
  - Favor early returns to minimize nesting and cognitive complexity (`sonarjs/cognitive-complexity`).

## 2. Naming Conventions

| Artifact                    | Convention                      | Example                                                |
| :-------------------------- | :------------------------------ | :----------------------------------------------------- |
| Backend files and folders   | `kebab-case`                    | `order-escrow.service.ts`, `ghn-order-api.service.ts`  |
| React Components            | `PascalCase`                    | `LanguageSwitcher.tsx`, `ProtectedRoute.tsx`           |
| React Custom Hooks          | `camelCase` (`use*`)            | `useAuth.ts`, `useToast.ts`, `useAdminContext.ts`      |
| Classes, Interfaces, Types  | `PascalCase`                    | `UserProfile`, `AuthContextType`, `OrderSummaryDto`    |
| Database Tables and Columns | `snake_case`                    | `escrow_records`, `seller_payout`, `locked_balance`    |
| REST Routes                 | `kebab-case`                    | `/api/v1/users/toggle-seller`, `/api/v1/after-sales`   |
| WebSocket Events            | `domain:action`                 | `auction:bid:placed`, `notification:unread_count`      |
| Boolean Variables           | `is` / `has` / `can` / `should` | `isSellerActive`, `isShopSuspended`, `hasPriceChanged` |

## 3. Automated Quality Gate (Zero-Server ESLint SonarJS)

1. Tier 1 (Editor Formatting Baseline): `.editorconfig` and `.prettierrc.json` define consistent indentation, line endings, and formatting across editors without committing IDE-specific `.vscode/` directories.
2. Tier 2 (Lint, Format, and Git Hooks):
   - `eslint.config.mjs` integrates `eslint-plugin-sonarjs` and `typescript-eslint`.
   - Husky `pre-commit` runs `lint-staged` (batched `eslint --cache --fix` and `prettier --cache --write`).
   - Husky `commit-msg` runs `@commitlint/cli` enforcing Conventional Commits (`<type>(<scope>): <subject>`, max 100 chars, spell out "and" instead of `&`).
3. Tier 3 (Coverage and CI Verification): `npm run test:coverage` emits `backend/coverage/lcov.info` and `frontend/coverage/lcov.info` alongside `npm run verify` in GitHub Actions CI.
