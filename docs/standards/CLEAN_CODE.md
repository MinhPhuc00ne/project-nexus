# Project Nexus - Clean Code and Documentation Standards

This document specifies the engineering conventions, code limits, formatting rules, and documentation standards enforced across Project Nexus. Strict adherence is required for all codebase contributions.

---

## 1. Core Architecture Constraints & File Limits

### 1.1 Maximum File Length Limit (< 300 Lines Rule)

To prevent the emergence of "God Files" and ensure high maintainability, readability, and testability, all contributors must adhere to the mentor-enforced rule:

- **No single component or source file may exceed 300 lines of code.**
- When a file approaches 250-280 lines, engineers must proactively decompose it using:
  - **Subcomponent Extraction:** Split complex JSX into cohesive child components in dedicated subdirectories (e.g., `ProductImageGallery.tsx`, `ProductInfoTabs.tsx`).
  - **Custom Hook Extraction:** Move state machines, event handlers, and data fetching into dedicated hooks (e.g., `useLiveAuction.ts`, `useStaffNavigation.ts`).
  - **Metadata / Configuration Separation:** Extract static tables, navigation items, and constants into configuration files (e.g., `staffNavigationData.ts`).

### 1.2 Modular Page Decomposition

- **`HomePage.tsx`:** Decomposed from 895 lines into modular subcomponents located in `components/home/` (`HomeHeroBanner.tsx`, `HomeLiveAuction.tsx`, `HomeFlashSaleCard.tsx`, `HomeAuctionCard.tsx`, `HomeRecommendationCard.tsx`, `HomeBenefit.tsx`, `HomeCountdown.tsx`) and mock data in `mocks/home.mock.ts`. The orchestrator page is now ~175 lines, strictly satisfying the < 300 lines Clean Code limit.

### 1.3 Commenting & Documentation Hygiene

- **No ASCII Art or Visual Noise:** Redundant ASCII banners, decorative section dividers (e.g., `// ================== HELPER FUNCTIONS ==================`), and boilerplate comments must be removed.
- **Meaningful Docstrings:** Preserve clear JSDoc comments explaining business rationale, non-obvious algorithms, mathematical models, or edge-case handling.
- **Self-Documenting Code:** Choose expressive variable and function names so that the code speaks for itself without relying on inline commentary.

---

## 2. TypeScript Quality Standards

Project Nexus enforces strict TypeScript configuration (`tsconfig.base.json`):

### 2.1 Elimination of `any`

```typescript
// ❌ STRICTLY FORBIDDEN:
const handleEvent = (data: any) => { ... };

// ✅ MANDATORY: Use precise types, generics, or unknown with type guards:
const handleEvent = (data: OrderCreatedEventPayload) => { ... };
const parsePayload = (raw: unknown): UserProfile => {
  if (isUserProfile(raw)) return raw;
  throw new InvalidPayloadException();
};
```

### 2.2 Explicit Return Types on Public Methods

All exported service methods, controllers, and domain interfaces must declare explicit return types:

```typescript
// ✅ Good:
async getSellerSession(): Promise<UserProfile> { ... }

// ❌ Bad:
async getSellerSession() { ... }
```

### 2.3 Strict Null Checks & Optional Chaining

- Leverage optional chaining `?.` and nullish coalescing `??` rather than manual truthiness checks.
- Avoid non-null assertion operator `!` unless dealing with standard DOM root mounting in `main.tsx`.

---

## 3. Formatting Standards (Prettier)

All files are automatically formatted via Prettier according to `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- Run `npm run format` to automatically format all files.
- Run `npm run format:check` to verify code compliance before opening a Pull/Merge Request.

---

## 4. Linting Rules (ESLint 9 Flat Config)

Governed by `eslint.config.mjs`:

- `@typescript-eslint/no-explicit-any`: `'error'`
- `no-debugger`: `'error'`
- `no-var`: `'error'`
- `prefer-const`: `'error'`
- `eqeqeq`: `['error', 'always']`
- `no-console`: `['warn', { allow: ['warn', 'error', 'info'] }]` (disallows raw `console.log` in production services).
- `@typescript-eslint/no-unused-vars`: Unused variables must be removed or prefixed with `_` if intentionally ignored.

---

## 5. Function Design & Complexity Control

- **Function Size:** Functions should ideally not exceed 25-30 lines.
- **Parameter Count:** Limit parameters to $\le 3$. Group larger sets into typed DTOs or options objects.
- **Early Return / Guard Clauses:** Eliminate nested `if-else` pyramids:

```typescript
// ✅ Clean Early Return:
function processPayment(user: User, amount: number) {
  if (!user.isVerified) throw new UnverifiedUserException();
  if (user.walletBalance < amount) throw new InsufficientFundsException();

  return executeTransfer(user, amount);
}
```

---

## 6. Commit Message & Git Quality Gates

We enforce [Conventional Commits v1.0.0](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <summary>
```

Examples:

- `feat(auction): implement anti-sniping duration extension`
- `fix(types): resolve ESM named export alias in vite config`
- `refactor(staff): decompose dashboard into modular subpanels`

Local automation via **Husky** and **lint-staged** automatically verifies format and lint on every staged commit.
