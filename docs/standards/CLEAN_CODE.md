# Project Nexus - Clean Code & Quality Standards

This document specifies the coding conventions, formatting requirements, and linting standards enforced across Project Nexus. Compliance with this specification is mandatory for all Pull Requests.

---

## 1. Naming Conventions

| Target                            | Convention                 | Valid Example                                     | Invalid Example                        |
| :-------------------------------- | :------------------------- | :------------------------------------------------ | :------------------------------------- |
| Files & Directories               | `kebab-case`               | `auction-engine.service.ts`, `auth-guard.ts`      | `AuctionEngine.ts`, `auth_guard.ts`    |
| Classes, Interfaces, Types, Enums | `PascalCase`               | `AuctionItem`, `IWalletRepository`, `OrderStatus` | `auctionItem`, `i_wallet_repository`   |
| Functions, Methods, Variables     | `camelCase`                | `calculateEscrowFee()`, `totalAmount`             | `CalculateEscrowFee()`, `total_amount` |
| Constants & Environment Variables | `UPPER_SNAKE_CASE`         | `MAX_BID_INCREMENT`, `REDIS_HOST`                 | `maxBidIncrement`, `redisHost`         |
| Database Tables & Columns         | `snake_case`               | `auction_items`, `created_at`, `wallet_id`        | `AuctionItems`, `createdAt`            |
| React Components                  | `PascalCase`               | `AuctionBidBoard.tsx`, `ThreeCanvas.tsx`          | `auctionBidBoard.tsx`                  |
| React Custom Hooks                | `camelCase` (prefix `use`) | `useLiveAuction.ts`, `useSocket.ts`               | `liveAuctionHook.ts`                   |

### Supplementary Rules

- Expressive Names: Variable and function names must clearly reveal their intent. Avoid single-character identifiers such as `x`, `data`, `item`, `temp`, except for standard short loop counters (`i`, `j`).
- Boolean Identifiers: Prefix boolean variables and functions with auxiliary verbs: `isValid`, `hasPermission`, `canBid`, `isSoldOut`.
- Interface Naming: Interfaces defining persistence ports or repository contracts within the Domain layer should be prefixed with `I` (e.g., `IOrderRepository`, `IPaymentGatewayPort`) to clearly differentiate abstractions from infrastructure implementations (`PrismaOrderRepository`).

---

## 2. Formatting Standards

All project files are formatted automatically with Prettier governed by `.prettierrc.json` in the workspace root.

### 2.1. Standard Configuration

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

### 2.2. Formatting Rules Breakdown

- Indentation: Exactly 2 spaces (no tabs). The `.editorconfig` file enforces this globally.
- Semicolons (`semi`): Mandatory at the end of every statement.
- Quotes (`singleQuote`): Single quotes `'` for JavaScript/TypeScript strings; double quotes `"` in JSON and JSX/HTML attributes.
- Line Length (`printWidth`): Maximum of 100 characters per line.
- Trailing Commas (`trailingComma`): Enforced on all multiline object and array definitions for clean git diffs.
- Line Endings: Mandatory LF (`\n`), never CRLF (`\r\n`).

---

## 3. Linting Standards

The repository enforces ESLint 9 (Flat Config) configured in `eslint.config.mjs`.

### 3.1. Core Rules

1. `@typescript-eslint/no-explicit-any`: 'error'
   - Direct usage of `any` is strictly prohibited.
   - For unstructured external payloads, use `unknown` combined with type guards or schema validation (e.g., Zod or class-validator).
2. `no-console`: 'warn' / 'error'
   - Direct usage of `console.log` and `console.error` in production services is disallowed.
   - Use structured loggers from `backend/src/modules/common/logger` or NestJS `Logger`.
3. `@typescript-eslint/explicit-function-return-type`:
   - Public methods in services, controllers, and use cases must declare explicit return types:

     ```typescript
     // Correct
     async findById(id: string): Promise<OrderResultDto> { ... }

     // Incorrect
     async findById(id: string) { ... }
     ```

4. `@typescript-eslint/no-floating-promises`: 'error'
   - All Promises must be handled with `await` or `.catch()`. Unhandled rejections that risk process instability are prohibited.
5. `@typescript-eslint/no-unused-vars`: 'error'
   - Unused imports and variables are flagged as errors. Intentional unused arguments must be prefixed with an underscore `_`.
6. React Hooks Rules (`react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`):
   - All dependency arrays in `useEffect`, `useCallback`, and `useMemo` must be exhaustive.

---

## 4. Strict TypeScript Configuration

The project's `tsconfig.json` files must enforce strict type-checking flags:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## 5. Function Design & Complexity Control

- Function Size:
  - Keep functions focused and concise (20-30 lines maximum). Break larger procedures into private helper methods or separate classes.
- Parameter Count:
  - Maximum of 3 parameters per function. When more arguments are required, consolidate them into a typed parameter object or DTO.
- Guard Clauses & Early Return:
  - Avoid deeply nested conditionals (> 2 levels). Handle edge cases and validation failures first with early returns or thrown exceptions:

  ```typescript
  // Correct (Guard Clauses)
  if (!user) throw new UserNotFoundException(userId);
  if (!user.isActive) throw new UserSuspendedException(userId);
  return this.processWallet(user);

  // Incorrect (Nested pyramid)
  if (user) {
    if (user.isActive) {
      return this.processWallet(user);
    } else {
      throw new UserSuspendedException(userId);
    }
  } else {
    throw new UserNotFoundException(userId);
  }
  ```

---

## 6. Error Handling & Exception Standards

### 6.1. Domain Exception Hierarchy

All business errors must derive from the abstract `DomainException` defined in `backend/src/modules/common/exceptions`:

```typescript
export abstract class DomainException extends Error {
  abstract readonly errorCode: string;
  abstract readonly httpStatus: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InsufficientBalanceException extends DomainException {
  readonly errorCode = 'WALLET_INSUFFICIENT_BALANCE';
  readonly httpStatus = 400;

  constructor(walletId: string, currentBalance: number, requiredAmount: number) {
    super(
      `Wallet ${walletId} has insufficient funds (Current: ${currentBalance}, Required: ${requiredAmount})`,
    );
  }
}
```

### 6.2. Standard JSON Error Response

All errors returned by the NestJS monolithic backend pass through `GlobalHttpExceptionFilter` to produce a uniform schema:

```json
{
  "statusCode": 400,
  "errorCode": "WALLET_INSUFFICIENT_BALANCE",
  "message": "Wallet w-123 has insufficient funds",
  "timestamp": "2026-10-02T15:30:00.000Z",
  "path": "/api/v1/auctions/bid",
  "traceId": "req-9a8b-7c6d-5e4f",
  "errors": null
}
```

---

## 7. DTOs & Input Validation

- Every incoming payload must be defined as a dedicated DTO class.
- Decorate all DTO properties with `class-validator` rules.
- Controllers must enable the global NestJS `ValidationPipe`:

  ```typescript
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips unexpected properties
      forbidNonWhitelisted: true, // Returns 400 if unrecognized fields are passed
      transform: true, // Automatically coerces primitives (strings to numbers/booleans)
    }),
  );
  ```

---

## 8. Logging & Data Privacy

- Structured JSON Logging: Every log line is serialized as JSON containing `context`, `level`, `timestamp`, and `traceId`.
- Log Levels:
  - `DEBUG`: Internal lifecycle details for local development.
  - `INFO`: Business milestones (User logged in, Order created, Bid accepted).
  - `WARN`: Recoverable anomalies (Connection retry, approaching rate limit).
  - `ERROR`: Unhandled exceptions, broken external calls, system failures.
- Data Protection: Never log passwords, PINs, full payment details, JWT tokens, or personally identifiable information (PII).

---

## 9. Automated Local Enforcement

Local verification tools prevent non-compliant code from entering the repository:

- Husky: Automates Git hooks (`pre-commit`, `commit-msg`).
- lint-staged: Runs `eslint --fix` and `prettier --write` automatically on staged files before commit creation.
- commitlint: Enforces Conventional Commits v1.0.0 format (e.g., `feat(auction): add anti-sniping duration extension`).
