# Order cancellations, returns and refunds

Backend-only implementation. All endpoints require JWT authentication and use the
`/api/v1` prefix. Frontend code and package manifests are unchanged.

## Scope and policy

- Whole-order cancellation before carrier pickup, and whole-order returns/refunds.
- Returns after delivery follow the existing three-day inspection policy in
  `docs/architecture/BUSINESS_RULES.md`. Confirming delivery does not remove the
  ability to request a return during that period.
- Refund amount is the full verified payment total, including outbound shipping.
  There are no arbitrary deductions from the buyer's refund. Actual GHN charges
  continue to be reconciled separately by the existing tracking implementation.
- Partial returns/refunds, exchanges, warranties and redelivery are outside this change.
- This implements the project's policy; it does not establish compliance with
  every country's consumer law.

## Endpoints

| Method | Path                                   | Actor and purpose                                                                     |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------- |
| GET    | `/commerce/after-sales`                | Own requests for buyer/seller; all requests for staff; pagination and optional status |
| GET    | `/commerce/refunds`                    | Staff refund queue; defaults to PENDING; pagination and optional status               |
| GET    | `/commerce/disputes`                   | Buyer: actual dispute records and resolution status                                   |
| GET    | `/commerce/orders/:id/after-sales`     | Buyer, seller or staff: request, shipment, escrow and refunds                         |
| POST   | `/commerce/orders/:id/cancel`          | Buyer, seller or staff: cancel before carrier pickup                                  |
| POST   | `/commerce/orders/:id/returns`         | Buyer: request a return                                                               |
| POST   | `/commerce/orders/:id/returns/review`  | Seller or staff: approve/reject                                                       |
| POST   | `/commerce/orders/:id/returns/waybill` | Seller or staff: bind a separate reverse shipment                                     |
| POST   | `/commerce/orders/:id/returns/receive` | Seller or staff: confirm receipt and inspection                                       |
| POST   | `/commerce/refunds/:id/complete`       | Admin: confirm a completed external refund                                            |

Create requests with `reason` (required), optional HTTPS `evidenceUrls` (up to ten),
and optional `refundToWallet: true`. Only the buyer can grant consent to refund an
external payment into NEXUS wallet. Seller/staff cancellation cannot grant it.

Cancellation also accepts `reasonCode`: `BUYER_REQUEST`, `STOCKOUT`,
`SELLER_FAULT`, or `OTHER`. A seller/staff-attributed stockout or seller fault
deducts ten seller reputation points exactly once, following the business rules.
The actor, reason and subsequent transitions are recorded in event logs.

Review uses `{ "decision": "APPROVE" | "REJECT", "reason": "..." }`.
Receive uses `{ "reason": "inspection notes", "restock": true | false }`;
`restock: true` means **all** returned items passed inspection and can be resold.
Damaged items must not be restored to available inventory.

## GHN behavior

- Cancellation calls GHN `POST /v2/switch-status/cancel` when there is a waybill.
  The server verifies the shipment's saved shop/environment and its current state.
- A return while the parcel remains in GHN's network uses
  `POST /v2/switch-status/return`, subject to GHN's allowed statuses.
- HTTP 200 alone does not establish success: the response must contain the exact
  waybill with `result: true`. A timeout leaves a durable request for reconciliation
  and retry. It does not release money or stock.
- A definitive return refusal reopens review; an uncertain approval remains
  `APPROVING` and cannot be concurrently rejected.
- After successful delivery, GHN's switch-status return endpoint cannot collect
  the parcel from the buyer. Arrange a **separate** buyer-to-shop GHN shipment with
  the proper recipient address and `client_order_code = NX-RETURN-<order UUID>`.
  Bind its code using `{ "waybillCode": "..." }`. This API verifies it against GHN.
  It does not pretend the original outbound shipment has been reversed.
- Receipt requires GHN `returned` on the original shipment, or `delivered` on the
  bound reverse shipment. Seller/staff then confirms physical receipt and quality.

References: [GHN cancellation](https://developer.ghn.vn/vi/docs/order/cancel),
[GHN return](https://developer.ghn.vn/vi/docs/order/return).

## Money, idempotency and reconciliation

Wallet payments refund automatically to the buyer's wallet. External payments
default to `ORIGINAL` with refund status `PENDING`; funds move from the platform
wallet's available balance into its locked balance. Cancelling a payment link is
not treated as a refund. This change does not make live bank transfers.

After transferring the refund to the original payment source and verifying it,
Admin submits `{ "externalReference": "unique bank/provider reference" }` to
`/commerce/refunds/:id/complete`. Only then does that refund become `SUCCESS`.
The reference and completion operator are retained. A wallet refund with buyer
consent completes immediately instead.

Post-settlement returns recover the seller payout before issuing a refund.
Insufficient seller/platform funds produce an explicit reconciliation error;
the operation rolls back instead of creating negative balances. Fund the relevant
wallet and retry receipt. This change does not introduce seller debt or lending.

Verified payments arriving after cancellation are recorded once and create a
pending refund to the original source; the order stays cancelled and inventory
is not recommitted. Unique payment/refund references and order row locks prevent
duplicate refunds/restocking. Notifications distinguish pending and completed refunds.

Orders remain `CANCELLED` after cancellation even if their refund is pending.
Use the refund records to inspect money status. Returned orders become `REFUNDED`
only after all their refund records succeed. Request states are separate from the
order/escrow states. Buyer order responses now include `dispute`, `afterSales`
and `refunds`; frontend consumers must use those records rather than inventing an
order status named `DISPUTED`.

Existing dispute arbitration uses the same refund accounting. Staff can still
authorize a full refund without physical return through the dispute route when
that is the appropriate resolution; it does not automatically restock goods.

## Verification

Run `node --test backend/test/*.test.mjs`, `npm run build:backend`, and lint/format
the changed files. PostgreSQL integration testing is opt-in:

```powershell
$env:NEXUS_AFTER_SALES_DB_TEST='1'
node --test backend/test/after-sales-postgres.test.mjs
```

The database test accepts localhost only. All fixtures are inserted in one outer
transaction that always rolls back, and no live GHN or payment requests are sent.
