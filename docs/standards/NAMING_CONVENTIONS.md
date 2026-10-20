# Project Nexus - Naming Conventions Specification

This document establishes the universal naming conventions enforced across all files, classes, methods, variables, database schemas, and API routes in **Project Nexus**.

---

## 1. Summary of Standards

| Code Element                      | Convention                        | Valid Example                                 | Invalid Example                                  |
| :-------------------------------- | :-------------------------------- | :-------------------------------------------- | :----------------------------------------------- |
| **Backend Files & Directories**   | `kebab-case`                      | `auction-engine.service.ts`, `auth-guard.ts`  | `AuctionEngine.ts`, `auth_guard.ts`              |
| **React Components**              | `PascalCase`                      | `ProductImageGallery.tsx`, `StaffSidebar.tsx` | `productImageGallery.tsx`, `staff_sidebar.tsx`   |
| **React Custom Hooks**            | `camelCase` (prefixed with `use`) | `useAuth.ts`, `useLiveAuction.ts`             | `authHook.ts`, `LiveAuctionHook.ts`              |
| **Classes, Interfaces, Types**    | `PascalCase`                      | `UserProfile`, `OrderSummaryDto`, `Role`      | `userProfile`, `order_summary_dto`               |
| **Functions & Methods**           | `camelCase`                       | `calculateEscrowFee()`, `refreshProfile()`    | `CalculateEscrowFee()`, `calculate_escrow_fee()` |
| **Variables & Object Properties** | `camelCase`                       | `walletBalance`, `isSellerActive`             | `wallet_balance`, `IsSellerActive`               |
| **Constants & Env Variables**     | `UPPER_SNAKE_CASE`                | `PLATFORM_FEE_PERCENTAGE`, `VITE_API_URL`     | `platformFeePercentage`, `vite_api_url`          |
| **Database Tables & Columns**     | `snake_case`                      | `escrow_records`, `shipping_fee`              | `EscrowRecords`, `shippingFee`                   |
| **REST Route Paths**              | `kebab-case` (lowercase)          | `/api/v1/users/toggle-seller`                 | `/api/v1/users/toggleSeller`                     |
| **WebSocket Events**              | `domain:action` (colon-delimited) | `auction:bid:placed`, `auction:timer:sync`    | `bidPlaced`, `AUCTION_BID_PLACED`                |
| **Domain Event Classes**          | `PascalCase` (ending in `Event`)  | `OrderCreatedEvent`, `AuctionEndedEvent`      | `orderCreated`, `OrderEvent`                     |
| **DTO Classes / Interfaces**      | `PascalCase` (ending in `Dto`)    | `UserSummaryDto`, `ActivateStaffDto`          | `UserSummary`, `ActivateStaffData`               |

---

## 2. Expressive Semantics & Grammar

### 2.1 Boolean Variable & Property Naming

Booleans must start with an auxiliary verb to indicate condition:

- `is`: `isAuthenticated`, `isLoading`, `isExtended`, `isVerified`
- `has`: `hasPermission`, `hasCompletedCheckout`
- `can`: `canToggleSeller`, `canBid`
- `should`: `shouldRetry`, `shouldExtendCountdown`

Avoid negative booleans that lead to confusing double-negatives:

```typescript
// ❌ Confusing:
const isNotSuspended = true;
if (!isNotSuspended) { ... }

// ✅ Clear:
const isSuspended = false;
if (isSuspended) { ... }
```

### 2.2 Domain Entities & DTOs

- **DTOs (Data Transfer Objects):** Always append the `Dto` suffix to differentiate external contracts from persistent entities (`ProductSummaryDto`, `CreateSellerRequestDto`).
- **Interfaces for Ports / Repositories:** Prefix with `I` when describing abstract domain boundaries (`IPaymentStrategy`, `IOrderRepository`).

### 2.3 Event Names

- **In-Process Domain Events:** Use past-tense descriptive verbs (`OrderCreatedEvent`, `AuctionEndedEvent`, `ReputationPenaltyAppliedEvent`).
- **WebSocket Room Events:** Use lowercase hierarchical namespaces separated by colons:
  - Client-to-Server: `auction:join`, `auction:leave`, `auction:bid:place`, `auction:3d:sync`
  - Server-to-Client: `auction:bid:placed`, `auction:bid:rejected`, `auction:time_extended`, `auction:ended`

---

## 3. Database Naming (Prisma ORM)

All Prisma models map PascalCase TypeScript entities to `snake_case` PostgreSQL tables and columns:

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
