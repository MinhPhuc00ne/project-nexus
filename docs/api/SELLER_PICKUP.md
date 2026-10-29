# Seller pickup setup

Sellers save their pickup address through the authenticated seller API.
Admin approval is no longer required. This change is backend-only; frontend
integration is outside its scope.

`PUT /api/v1/seller/shipping/pickup-point` resolves the address with GHN,
reuses an active matching unassigned shop, or registers a new shop under the
platform token. It then saves the carrier-confirmed address as `VERIFIED`.
Automatic verification leaves `verifiedBy` null; manual support verification
continues to record the admin. `VERIFIED` means carrier setup completed.

An unchanged address reuses the existing binding. A changed address creates or
recovers a matching binding, leaving previous order snapshots unchanged. On GHN
failure the database transaction rolls back, preserving the previous address.
The ORM upsert serializes saves for the same seller/environment. The transaction
has a 60-second deadline because it includes carrier calls. A retry searches GHN
before registration to recover a shop created before a network timeout; recovery
depends on the shop being visible in GHN's listing.

Apply migrations before running this version:

```sh
npm run prisma:deploy --workspace=backend
```

The new migration allows automatic verification without a manual reviewer.
Existing verified bindings remain usable; existing pending addresses become
ready when the seller saves them again. Configure `GHN_TOKEN`, `GHN_API_URL`,
and an active platform `GHN_SHOP_ID`; the latter is the parent shop header for
registration, not a shared sender address for all sellers.

See [GHN Create Shop](https://developer.ghn.vn/vi/docs/shop/create-shop).
No bank account or COD settings are changed during registration.
