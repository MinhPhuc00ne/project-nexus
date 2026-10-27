# GHN shipping pricing

GHN is the sole source of shipping fees. There are no local distance, weight,
insurance, domestic or international price tables. An unavailable GHN gateway,
unsupported route or invalid fee response fails the operation instead of generating
a fallback price. Product prices, platform commission and wallet calculations are
unaffected.

Official API references:

- [Calculate fee](https://developer.ghn.vn/vi/docs/order/calculate-fee)
- [Available services](https://developer.ghn.vn/vi/docs/master-data/get-service)
- [Create order](https://developer.ghn.vn/vi/docs/order/create)

## Configuration and addresses

Configure the platform's `GHN_API_URL` and `GHN_TOKEN` for the intended environment.
`GHN_SHOP_ID` is only the administrator's standalone diagnostic shop. Seller orders
do not fall back to it. No live environment files are changed by this migration.

Each seller has one independent pickup point per environment. It can be anywhere
supported by GHN in Vietnam; there is no shared physical warehouse selected for
all sellers. Sellers hold and pack their stock at that point. GHN manages the
carrier's own sorting/transit network. This is not a multi-warehouse inventory
allocation feature: choosing among several warehouses for one seller remains a
separate extension.

### Setting up each seller

1. Seller calls `PUT /api/v1/seller/shipping/pickup-point` with `name`, `phone`,
   `city`, `district`, `ward`, `street` and optional paired `latitude`/`longitude`.
   Only the authenticated seller's own point can be changed. GHN address codes
   are resolved on the server. The point becomes `PENDING`.
2. Admin creates the corresponding shop/pickup location under the platform's GHN
   account using the GHN portal. This backend does not automatically create shops
   or require sellers to disclose separate GHN tokens.
3. Admin calls `GET /api/v1/admin/shipping/pickup-points` to see pending requests,
   and `GET /api/v1/admin/shipping/ghn-shops?offset=0&limit=100` to find the actual
   GHN shop. Continue pagination using the returned `nextOffset` cursor.
4. Admin calls `POST /api/v1/admin/shipping/pickup-points/:id/verify` with
   `{ "ghnShopId": 123456 }`. The backend verifies token-account membership, active
   status, matching district/ward, Vietnamese phone, and street/house number.
   The actual GHN address and phone become the canonical pickup details.
5. `GET /api/v1/seller/shipping/pickup-point` shows the seller the verified binding.
   Only a `VERIFIED` point can be used for new quotes/checkouts. Updating the
   pickup point clears the binding and requires verification again. The regular
   seller profile and buyer address book are not pickup-point fallback sources.

The database prevents the same GHN shop ID from being assigned to two sellers in
one environment. A version check prevents an admin approval from approving a
seller address changed concurrently. Sandbox and production bindings are isolated.

Quotes and orders freeze the point ID, canonical pickup address, environment and
GHN shop ID. Existing orders continue using their frozen point if a seller moves.
Availability, fees, order creation, recovery, tracking and printing all use that
specific shop ID. Concurrent requests never mutate a shared shop configuration.
Webhooks match the callback's ShopID against the stored shipment, not the global
diagnostic shop. Legacy orders missing explicit pickup/shop context require
manual reconciliation; the backend never guesses a global shop for them.

## Quote and checkout

- `POST /api/v1/fulfillment/shipping/fee` is an Admin-only diagnostic that sends
  a supplied parcel to GHN using the administrator's configured diagnostic shop.
- `POST /api/v1/fulfillment/shipping/quote` loads product dimensions and prices from
  the database. Client-supplied product weights do not override stored values.
- Checkout obtains a separate GHN fee for each seller before entering its database
  transaction. If any quote fails, no orders are created and the cart is retained.
- `CheckoutDto.shippingFee` remains accepted for older clients but is ignored.
  The stored order fee, total and payment amount use the server's GHN quote.
- Parcel weight is the sum of physical item weights. Default packing stacks units
  vertically using the maximum item length/width and summed item heights; this is
  a packaging estimate, not a tariff or volumetric-weight calculation. Sellers may
  supply actual outer dimensions when dispatching. GHN determines the price.
- Service availability is checked against GHN. Heavy shipments include the item
  dimensions and weights required by GHN.
- Dispatch uses the same address resolution and parcel preparation as quotes.
  Checkout freezes the pickup address, parcel items, GHN location codes and quote
  in the order address snapshot. Later product/profile changes cannot silently
  change those inputs. Seller overrides apply to the actual parcel dimensions.
- Only Vietnamese addresses and phone numbers are supported. The optional country
  field is `VN`; foreign destinations are rejected.

## Dispatch, recovery and tracking

`POST /api/v1/commerce/checkout/quote` validates the selected cart and returns
per-seller and combined totals without creating orders, clearing the cart or
starting payment. Checkout independently requotes before saving a payment total.

`POST /api/v1/seller/orders/:id/shipping-quote` previews the actual packed parcel.
The fee collected from the buyer is frozen on checkout. The sender pays GHN
(`payment_type_id=1`, no COD). Any difference is recorded for seller reconciliation;
the backend does not silently debit the buyer or send a bank payment to GHN.

Dispatch saves a durable request marker before calling GHN and sends a stable
`client_order_code=NX-<order-id>`. Order-row locks prevent concurrent sends. Network
errors and malformed success responses leave an UNKNOWN request; retries cannot
resubmit it. Explicit GHN rejection allows a corrected retry. Use
`POST /api/v1/seller/orders/:id/reconcile-ghn` to recover a confirmed order by its
client code, without creating another shipment.

A new waybill is `CREATED`, while the order remains `PREPARING`. Only GHN pickup
confirmation advances it to `SHIPPING`. Buyer/seller/admin/staff may read
`GET /api/v1/commerce/orders/:id/tracking` and explicitly refresh using
`POST /api/v1/commerce/orders/:id/tracking/sync`. Unrelated users are rejected.
Provider timestamps reject stale updates and terminal states cannot regress.
Delivery failures, return events, loss and damage are recorded for attention;
they do not themselves authorize a refund or a second shipment.

`GET /api/v1/seller/orders/:id/ghn-label` generates official GHN A5, 80x80 and
52x70 print links for the authorized seller. These use a short-lived print token,
not the GHN account token. The legacy `print-waybill` endpoint still returns
structured invoice information for existing clients.

The refresh also reconciles carrier charges using GHN's order-fee API. It updates
actual carrier fee and fee difference, leaving the buyer's total unchanged. A
temporary failure of the fee lookup does not block a valid shipment status update.

Register `POST /api/v1/fulfillment/shipping/webhook` in the GHN Developer Portal
with custom header `x-ghn-webhook-secret` matching `GHN_WEBHOOK_SECRET`. Use a
public HTTPS endpoint and a webhook timeout of at least 30 seconds. The handler
checks the secret and the shipment's frozen shop, then re-reads GHN; callback status/amounts
are never applied directly. Unknown local waybills return 503 for a later retry.
The secret is not set automatically. Without it the webhook is disabled.

## Escrow and receipt

PayOS/wallet payments hold money in `EscrowRecord.HELD`; seller/admin balances
are not credited at payment time. Commission is calculated on the merchandise
subtotal, excluding shipping. The seller payout includes the collected shipping
fee because the sender pays the carrier. Payment retries are protected by order
row locks; wallet debits also require sufficient balance atomically.

The buyer calls `POST /api/v1/commerce/orders/:id/confirm-delivery`. GHN delivery
is reverified before funds are released. Confirmation credits seller/admin and
awards completion reputation only once. Buyer disputes use
`POST /api/v1/commerce/orders/:id/dispute` with a reason and freeze escrow.
`POST /api/v1/commerce/orders/:id/resolve-dispute` requires Admin/Staff and an
explicit BUYER/SELLER verdict and reason. Buyer-favor refunds go to the NEXUS
wallet, including orders originally paid with PayOS; no external bank refund is
executed. Legacy already-disbursed orders are never paid out again.

There is no background polling worker or automatic three-day escrow release in
this change. Those autonomous operations require separate approval. Tracking is
driven by authenticated refresh requests or verified GHN callbacks; funds remain
held until buyer confirmation or authorized dispute resolution.

## Distance and legacy clients

The old `shipping` module and `distance.service.ts` have been removed.
`POST /api/v1/shipping/calculate` is no longer registered. Use the GHN endpoints.

`POST /api/v1/fulfillment/shipping/distance` now returns only `distanceKm`,
`durationMinutes` and `method`. It never returns a shipping fee. OSRM/Haversine
are informational routing tools, separate from GHN pricing. GPS coordinates are
optional for a GHN quote; absent coordinates produce null route metrics.

Authoritative quote fields are `feeSource: GHN_API`, `rates.ghnCarrierFee` and
`rates.finalShippingFee`. For compatibility, `rates.distanceTotalFee` is a
deprecated alias of the GHN total; it is not a second price calculation.
`metrics.actualWeightKg` is physical parcel weight. Its deprecated alias
`chargeableWeightKg` does not represent GHN's billable weight.

Frontend files and package manifests are unchanged. The current checkout UI still
displays its existing fixed 30,000 VND estimate before submission; the backend uses
the actual GHN fee. Shipping-page labels and distance-result rendering also need
frontend integration with this contract before they can accurately present it.

## Verification

Run `node --test backend/test/*.test.mjs`, then `npm run build:backend`.
Tests mock external responses; they do not create GHN shipments or read credentials.

The `20261026235000_add_seller_pickup_points` migration creates the new pickup
table and constraints without inventing bindings for existing sellers. Start the
local PostgreSQL service and apply migrations with
`npm run prisma:deploy --workspace=backend` before using these endpoints. Generate the client with
`npm run prisma:generate`. A database migration and real GHN account verification
are separate from the mocked regression tests.
