---
title: Business Rules (Code-Verified)
---

# Core Business Rules

All constants, thresholds, and operational invariants below are verified directly against `backend/src/modules/*` and `backend/prisma/schema.prisma`.

## 1. User Reputation System (`reputation-policy.ts`)

- Initial Score: `INITIAL_REPUTATION_SCORE = 50` with default `ReputationTrustLevel.PROBATION`, matching `@default(50)` and `@default(PROBATION)` in `schema.prisma`.
- Trust Level Tiers (`trustLevelFor`):

| Trust Level (`ReputationTrustLevel`) | Score Range | Operational Meaning                                                  |
| :----------------------------------- | :---------- | :------------------------------------------------------------------- |
| `EXCELLENT`                          | ≥ 120       | Top-tier trusted account                                             |
| `GOOD`                               | 100 – 119   | Good standing                                                        |
| `STANDARD`                           | 80 – 99     | Standard trading privileges                                          |
| `PROBATION`                          | 40 – 79     | New account (`50`) or under observation                              |
| `SUSPENDED`                          | < 40        | Restricted from trading and bidding due to penalties (`PenaltyType`) |

## 2. Commerce, Cart and Pricing (`cart.service.ts`, `product-price.ts`)

- Anti-Self-Purchase: `CartService.purchasable()` rejects any attempt by a seller to add or purchase their own product (`product.sellerId === userId`) with `CANNOT_PURCHASE_OWN_PRODUCT` (HTTP `400`).
- Promotional Pricing (`effectivePrice`): `salePrice` applies only when all 3 conditions hold:
  1. `salePrice >= 1000` (VND)
  2. `salePrice < basePrice`
  3. Current timestamp is within `[saleStartsAt, saleEndsAt)`
- Inventory Reservation: Checkout creates an `InventoryReservation` moving stock from `availableQty` to `reservedQty` and logs an `InventoryLedger` entry. Expired unpaid reservations release stock back to `availableQty`.

## 3. Escrow, Platform Fee and `NEXUS Pay` Wallet (`order-escrow.service.ts`, `seller-finance.service.ts`)

- Default Platform Fee: `PLATFORM_FEE_PERCENTAGE = 7.0%`, calculated strictly on `subtotal` (item value), excluding `shippingFee`.
- Escrow Lifecycle: Funds enter `EscrowRecord` (`HELD`) upon confirmed payment (`PAYOS` or `WALLET`). Funds are `DISBURSED` to the Seller wallet only after Buyer delivery confirmation or expiration of the 3-day inspection window without disputes.
- Withdrawals (`WithdrawalRequest`):
  - Users may have at most 3 concurrent `PENDING` withdrawal requests.
  - Requested amounts immediately move from `Wallet.balance` to `Wallet.lockedBalance` to prevent double-spending until Admin approves or rejects.

## 4. 3D Multi-Lot Auctions and Anti-Sniping (`auction.service.ts`, `auction.gateway.ts`)

- Session → Lots Structure: Each `Auction` contains multiple `AuctionItem` lots (with optional `.glb` 3D model and appraisal certificate), reviewed via `PENDING_REVIEW` → `APPROVED` / `REJECTED`.
- Bidding RBAC:
  - A `SELLER` account with `isSellerActive = true` is read-only in auction rooms and cannot place bids (Server returns `403 Forbidden`). They must switch to Buyer mode first.
  - Lot owners cannot bid on their own items.
- Anti-Sniping: A valid bid placed within the final `2 minutes` (`AUCTION_ANTI_SNIPING_TRIGGER_MINUTES = 2`) automatically extends the lot deadline and broadcasts `auction:time_extended`.
- Awards and Second Chance (`AuctionAward`):
  - `PRIMARY_WINNER` receives an exclusive checkout window.
  - On `DECLINED`, `BUYER_WITHDRAWN`, or `PAYMENT_DEFAULT`, the system processes deposit forfeiture and compensation (`AUCTION_DEPOSIT_FORFEIT` and `AUCTION_DEPOSIT_COMPENSATION`) and can offer `SECOND_CHANCE` to the runner-up bidder.

## 5. 3-Level Categories and Seller Mode Toggle

- Category Tree: Enforces a maximum depth of 3 levels (`level` 1–3). Both Backend (`CategoryService`) and Frontend (`categoryMoveError`) prevent self and descendant cycles and moves exceeding depth 3.
- Buyer and Seller Mode Toggle: `/api/v1/users/toggle-seller` lets Sellers switch modes without logging out; however, if `isShopSuspended = true`, `AuthContext` forces the effective mode to `BUYER`.
