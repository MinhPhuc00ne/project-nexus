---
title: Code Standards, Naming & Sonar Quality
---

# Code Standards, Naming & Sonar Quality Gate

## 1. Clean Code Rules (`eslint.config.mjs`)

- **No `any`**: `@typescript-eslint/no-explicit-any` is enforced as an error.
- **Explicit Return Types**: Public methods, controllers, and utilities declare explicit return types.
- **Null Safety**: Prefer `?.` and `??`; restrict `!` to root DOM mounting in `main.tsx`.
- **No Trivial Inline Comments**: `no-inline-comments` warns against self-evident comments; use TSDoc/JSDoc (`/** ... */`) for public symbols and `///` in Prisma schemas.
- **Complexity & Size**: Target files under ~300 lines, functions under ~30 lines, max 3 parameters (use typed DTOs beyond that), and early returns.

## 2. Naming Conventions

| Element                    | Convention                      | Example                             |
| :------------------------- | :------------------------------ | :---------------------------------- |
| Backend files & folders    | `kebab-case`                    | `order-escrow.service.ts`           |
| React Components           | `PascalCase`                    | `LanguageSwitcher.tsx`              |
| React Custom Hooks         | `camelCase` (`use*`)            | `useAuth.ts`, `useToast.ts`         |
| Classes, Interfaces, Types | `PascalCase`                    | `UserProfile`, `OrderSummaryDto`    |
| Database Tables & Columns  | `snake_case`                    | `escrow_records`, `seller_payout`   |
| REST Routes                | `kebab-case`                    | `/api/v1/users/toggle-seller`       |
| WebSocket Events           | `domain:action`                 | `auction:bid:placed`                |
| Boolean Variables          | `is` / `has` / `can` / `should` | `isSellerActive`, `hasPriceChanged` |

## 3. 3-Tier Sonar Quality Gate

1. **Tier 1 (IDE Realtime)**: VS Code recommends `SonarSource.sonarlint-vscode` via `.vscode/extensions.json` & `.vscode/settings.json`.
2. **Tier 2 (Lint & Pre-commit Gate)**: `eslint.config.mjs` integrates `eslint-plugin-sonarjs` alongside Prettier, Husky (`lint-staged`), and `commitlint`.
3. **Tier 3 (Online Dashboard Ready)**: `sonar-project.properties` + `infra/templates/sonarcloud.yml.example` are ready for SonarQube Server or SonarQube Cloud.
