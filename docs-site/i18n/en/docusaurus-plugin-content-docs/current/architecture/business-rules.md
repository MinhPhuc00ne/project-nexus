---
title: Business Rules (Code-Verified)
---

# Core Business Rules

All constants and rules below are verified directly against the live source code (`reputation-policy.ts`, `schema.prisma`, `cart.service.ts`, `order-escrow.service.ts`, `auction.service.ts`):

## 1. User Reputation (`reputation-policy.ts`)

- **Initial Score**: `INITIAL_REPUTATION_SCORE = 50` (`PROBATION`), matching `@default(50)` and `@default(PROBATION)` in `schema.prisma`.
- **Trust Level Thresholds (`trustLevelFor`)**:
  - `EXCELLENT`: $\ge 120$
  - `GOOD`: $100 - 119$
  - `STANDARD`: $80 - 99$
  - `PROBATION`: $40 - 79$
  - `SUSPENDED`: $< 40$

## 2. Commerce, Cart & Self-Purchase Prevention

- **Anti-Self-Purchase**: `CartService.purchasable()` blocks sellers from adding or purchasing their own products (`product.sellerId === userId` → HTTP 400).
- **Sale Window Validation**: `effectivePrice()` applies `salePrice` only when `salePrice >= 1000`, `salePrice < basePrice`, and current time is within `[saleStartsAt, saleEndsAt)`.
- **Escrow & Platform Fee**: Paid orders lock funds in `EscrowRecord` (`HELD`). The default `7%` platform fee is calculated on `subtotal` (excluding `shippingFee`).

## 3. Multi-Lot Auctions & Awards

- An `Auction` session contains multiple `AuctionItem` lots reviewed via `PENDING_REVIEW` → `APPROVED` / `REJECTED`.
- When a lot closes, `AuctionAward` is issued to `PRIMARY_WINNER`; upon expiry/decline/withdrawal, it can cascade to `SECOND_CHANCE` or trigger deposit forfeiture/compensation.
- **Anti-Sniping**: Valid bids placed in the final 2 minutes automatically extend `endTime` by 2 minutes.
