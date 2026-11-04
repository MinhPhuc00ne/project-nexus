# Naming Conventions Specification

This document establishes the universal naming conventions enforced across all files, classes, methods, variables, database schemas, and API routes throughout Project Nexus.

## 1. Summary of Standards

| Code Element                        | Convention                        | Valid Example                                 | Invalid Example                                  |
| :---------------------------------- | :-------------------------------- | :-------------------------------------------- | :----------------------------------------------- |
| Backend Files and Directories       | `kebab-case`                      | `auction-engine.service.ts`, `auth-guard.ts`  | `AuctionEngine.ts`, `auth_guard.ts`              |
| React Components                    | `PascalCase`                      | `ProductImageGallery.tsx`, `StaffSidebar.tsx` | `productImageGallery.tsx`, `staff_sidebar.tsx`   |
| React Custom Hooks                  | `camelCase` (prefixed with `use`) | `useAuth.ts`, `useLiveAuction.ts`             | `authHook.ts`, `LiveAuctionHook.ts`              |
| Classes, Interfaces, Types          | `PascalCase`                      | `UserProfile`, `OrderSummaryDto`, `Role`      | `userProfile`, `order_summary_dto`               |
| Functions and Methods               | `camelCase`                       | `calculateEscrowFee()`, `refreshProfile()`    | `CalculateEscrowFee()`, `calculate_escrow_fee()` |
| Variables and Object Properties     | `camelCase`                       | `walletBalance`, `isSellerActive`             | `wallet_balance`, `IsSellerActive`               |
| Constants and Environment Variables | `UPPER_SNAKE_CASE`                | `PLATFORM_FEE_PERCENTAGE`, `VITE_API_URL`     | `platformFeePercentage`, `vite_api_url`          |
| Database Tables and Columns         | `snake_case`                      | `escrow_records`, `shipping_fee`              | `EscrowRecords`, `shippingFee`                   |
| REST Route Paths                    | `kebab-case` (lowercase)          | `/api/v1/users/toggle-seller`                 | `/api/v1/users/toggleSeller`                     |
| WebSocket Events                    | `domain:action` (colon-delimited) | `auction:bid:placed`, `auction:timer:sync`    | `bidPlaced`, `AUCTION_BID_PLACED`                |
| Domain Event Classes                | `PascalCase` (ending in `Event`)  | `OrderCreatedEvent`, `AuctionEndedEvent`      | `orderCreated`, `OrderEvent`                     |
| DTO Classes and Interfaces          | `PascalCase` (ending in `Dto`)    | `UserSummaryDto`, `ActivateStaffDto`          | `UserSummary`, `ActivateStaffData`               |

## 2. Expressive Semantics and Grammar

### Boolean Variable and Property Naming

Booleans must begin with an auxiliary verb to clearly communicate their conditional nature:

- `is`: Indicates a current state, such as `isAuthenticated`, `isLoading`, `isExtended`, or `isVerified`.
- `has`: Indicates possession or completion, such as `hasPermission` or `hasCompletedCheckout`.
- `can`: Indicates capability or authorization, such as `canToggleSeller` or `canBid`.
- `should`: Indicates recommended or impending action, such as `shouldRetry` or `shouldExtendCountdown`.

Avoid negative boolean identifiers that produce convoluted double-negative logic:

```typescript
// Confusing negative condition:
const isNotSuspended = true;
if (!isNotSuspended) { ... }

// Clear positive condition:
const isSuspended = false;
if (isSuspended) { ... }
```

### Domain Entities and Data Transfer Objects

Always append the `Dto` suffix to external boundary contracts to clearly distinguish them from database models (`ProductSummaryDto`, `CreateSellerRequestDto`). Prefix abstract domain boundary interfaces with the letter `I` when defining port abstractions (`IPaymentStrategy`, `IOrderRepository`).

### Event Naming Conventions

- In-process domain events: Name events using descriptive past-tense verbs reflecting completed actions (`OrderCreatedEvent`, `AuctionEndedEvent`, `ReputationPenaltyAppliedEvent`).
- WebSocket gateway events: Use lowercase hierarchical namespaces separated by colons:
  - Client to server emissions: `auction:join`, `auction:leave`, `auction:bid:place`, `auction:3d:sync`.
  - Server to client emissions: `auction:bid:placed`, `auction:bid:rejected`, `auction:time_extended`, `auction:ended`.

## 3. Database Naming with Prisma ORM

Prisma models map PascalCase TypeScript entities to `snake_case` PostgreSQL tables and columns using explicit mapping annotations:

```prisma
model EscrowRecord {
  id           String       @id @default(uuid())
  orderId      String       @map("order_id")
  totalAmount  Decimal      @map("total_amount") @db.Decimal(14, 2)
  platformFee  Decimal      @map("platform_fee") @db.Decimal(14, 2)
  sellerPayout Decimal      @map("seller_payout") @db.Decimal(14, 2)
  status       EscrowStatus @default(HELD)

  @@map("escrow_records")
}
```
