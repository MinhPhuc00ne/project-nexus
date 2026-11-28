---
title: State Machines and Transaction Lifecycles
---

# State Machines (Orders, Escrow, After-Sales and Auctions)

This document details the state machines governing financial, fulfillment, and auction lifecycles in Project Nexus.

## 1. Escrow Lifecycle (`EscrowStatus`)

```mermaid
stateDiagram-v2
    [*] --> HELD : Payment confirmed (PAYOS / WALLET)
    HELD --> DISBURSED : Buyer confirms delivery / 3-day inspection expires
    HELD --> DISPUTED : Buyer opens dispute or return request
    DISPUTED --> DISBURSED : Staff/Admin rules in favor of Seller
    DISPUTED --> REFUNDED : Staff/Admin approves refund to Buyer
    DISBURSED --> [*]
    REFUNDED --> [*]
```

- On `DISBURSED`: Seller wallet receives `subtotal - platformFee (7%)`, and the Admin wallet records the platform fee.
- On `REFUNDED`: Full refund accounting executes via `RefundService` and `OrderRefund`.

## 2. Cancellation, Returns and Refunds (`AfterSalesRequest` and `OrderRefund`)

```mermaid
flowchart LR
    REQ["AfterSalesRequest"] --> TYPE{"Request Type"}
    TYPE -->|Pre-pickup cancel| CANCEL["Call GHN /v2/switch-status/cancel"]
    CANCEL -->|GHN OK| REFUND["Create OrderRefund (100% confirmed payment)"]
    CANCEL -->|GHN Timeout| PENDING["Keep persistent pending state for reconciliation<br/>DO NOT release funds/stock prematurely"]
    TYPE -->|Return within 3-day window| RETURN["Create return shipment NX-RETURN-orderUUID"]
    RETURN --> INSPECT{"Inspect returned goods"}
    INSPECT -->|Intact| RESTOCK["restock: true -> restore availableQty"]
    INSPECT -->|Damaged| NORESTOCK["restock: false -> DO NOT restore availableQty"]
    RESTOCK --> REFUND
    NORESTOCK --> REFUND
```

### Refund Accounting Rules (`OrderRefund`)

- Scope: Full-order cancellation prior to GHN pickup and full-order return within the 3-day post-delivery inspection window.
- Refund Amount: 100% of confirmed payment (including outbound shipping fee), with no arbitrary deductions.
- Channel Settlement:
  - `WALLET` orders: Instant automatic credit back to Buyer `Wallet.balance` (`OrderRefund.status = SUCCESS`).
  - `PAYOS` orders: Creates an `OrderRefund` in `PENDING` state (moving funds from Admin `balance` to `lockedBalance`), transitioning to `SUCCESS` only when Admin confirms the actual bank transfer `externalReference` (unless Buyer opts for internal wallet credit).

## 3. Multi-Lot Auction Lifecycle (`Auction` → `AuctionItem` → `AuctionAward`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Admin creates session
    DRAFT --> SCHEDULED : Scheduled & lots approved
    SCHEDULED --> ACTIVE : Start time reached (AuctionLifecycleService)
    ACTIVE --> EXTENDED : Anti-sniping (valid bid in final 2 min)
    EXTENDED --> ACTIVE : Bidding continues
    ACTIVE --> ENDED : All lots closed
    EXTENDED --> ENDED : Extension timer expires
    ENDED --> SETTLED : Awards & deposits settled
    DRAFT --> CANCELLED : Session canceled
    SCHEDULED --> CANCELLED : Canceled before start
```

### Lot and Award Flow (`AuctionItem` and `AuctionAward`)

1. Consignment Review (`AuctionItemStatus`): Seller submits item + appraisal certificate → `PENDING_REVIEW` → Staff or Admin marks `APPROVED` or `REJECTED`.
2. Primary Award (`PRIMARY_WINNER`): Highest valid bidder receives `AuctionAward` (`AWAITING_CHECKOUT` / `AWAITING_DEPOSIT` → `PAID`).
3. Second Chance (`SECOND_CHANCE`) and Deposit Forfeit: If the primary winner declines (`DECLINED`), withdraws (`BUYER_WITHDRAWN`), or defaults (`PAYMENT_DEFAULT`), the system records `AUCTION_DEPOSIT_FORFEIT` / `AUCTION_DEPOSIT_COMPENSATION` and can issue a `SECOND_CHANCE` invitation to the next highest bidder.
