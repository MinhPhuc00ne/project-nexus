# Clean Code and Documentation Standards

This document specifies the engineering criteria for source code quality, complexity management, automated formatting, and technical documentation across Project Nexus.

## 1. File Boundaries and Separation of Concerns

### File Length Management Guidelines

The primary objective of file length boundaries is to maintain high cohesion and rapid maintainability:

- Prevent mixed concerns: Never combine unrelated business processes, complex state machines, financial reconciliation rules, and distinct user interface blocks within a single file.
- Recommended threshold of approximately 300 lines: Maintaining file sizes below 300 lines provides a practical metric for healthy architectural cohesion. When a file approaches 250 to 300 lines, engineers proactively evaluate refactoring opportunities, such as extracting subcomponents, custom hooks, or domain constants.
- Flexibility aligned with the Single Responsibility Principle: The 300-line threshold serves as an architectural heuristic rather than an inflexible limit. If a file exceeds 300 lines while maintaining a single, unified responsibility, and splitting it would artificially fragment related logic, the larger file structure remains fully acceptable.

## 2. Code Comments and Documentation Protocols

### Prohibition of Meaningless Inline Comments

- Strictly prohibit single-line comments (`// ...`) that merely narrate obvious programming syntax or explain self-evident code statements.
- Avoid decorative ASCII separators and comment banners, such as divider lines surrounding utility functions.
- Rely on descriptive identifiers and domain-driven naming conventions to render the source code inherently self-explanatory.

### Standardization of TSDoc and JSDoc Documentation Blocks

- Every class, interface, type alias, service method, controller endpoint, helper function, and WebSocket gateway must feature a formal TSDoc or JSDoc documentation block (`/** ... */`).
- Documentation blocks must summarize the core responsibility, explain parameter semantics with `@param`, state the return value with `@returns`, and list thrown exceptions with `@throws`.
- For Prisma schema definitions, use triple-slash comments (`/// ...`) preceding models and significant columns to support automated database documentation pipelines.

## 3. TypeScript Quality Standards

The monorepo enforces strict compilation rules inherited from `@nexus/config/tsconfig.base.json`:

### Elimination of the any Type

```typescript
// Prohibited pattern:
const handleEvent = (data: any) => { ... };

// Required pattern utilizing explicit contracts or unknown with type guards:
const handleEvent = (data: OrderCreatedEventPayload) => { ... };
const parsePayload = (raw: unknown): UserProfile => {
  if (isUserProfile(raw)) return raw;
  throw new InvalidPayloadException();
};
```

### Explicit Return Type Declarations

All service methods, controller endpoints, and public utility functions must declare explicit return types:

```typescript
// Compliant declaration:
async getSellerSession(): Promise<UserProfile> { ... }

// Non-compliant declaration:
async getSellerSession() { ... }
```

### Safe Handling of Null and Undefined Values

- Prefer the optional chaining operator (`?.`) and the nullish coalescing operator (`??`) over manual truthiness evaluations.
- Avoid the non-null assertion operator (`!`), restricting its usage strictly to DOM root element mounting in client entry points.

## 4. Automated Code Formatting

Source files undergo automated formatting through Prettier governed by `.prettierrc.json`:

- Execute `npm run format` to standardize all repository files automatically.
- Execute `npm run format:check` to verify formatting compliance within test pipelines and Git pre-commit hooks.

## 5. ESLint Static Analysis Protocols

The flat ESLint configuration (`eslint.config.mjs`) guards against common defects:

- Prohibits the `any` type by treating `@typescript-eslint/no-explicit-any` as an error.
- Disallows `debugger` statements and the legacy `var` keyword.
- Enforces strict equality comparisons using the `===` operator.
- Prohibits `console.log` in production services, requiring NestJS `Logger` instances or designated logging levels.
- Requires removing unused variables or prefixing intentionally retained parameters with an underscore (`_`).

## 6. Function Design and Complexity Management

- Function length: Keep functions focused, generally under 30 lines.
- Parameter count: Restrict parameter lists to a maximum of three values. When additional parameters are required, encapsulate them within a typed Data Transfer Object or configuration interface.
- Early return pattern: Use guard clauses and early returns to flatten nested conditional logic, ensuring a readable top-to-bottom flow.
