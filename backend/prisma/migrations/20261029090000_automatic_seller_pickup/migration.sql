-- Carrier verification may be automatic; verified_by is only set for manual support.
ALTER TABLE "seller_pickup_points"
DROP CONSTRAINT "seller_pickup_points_verified_check";

ALTER TABLE "seller_pickup_points"
ADD CONSTRAINT "seller_pickup_points_verified_check" CHECK (
    "status" <> 'VERIFIED'
    OR (
        "ghn_shop_id" > 0
        AND "ghn_shop_id" IS NOT NULL
        AND "carrier_address" IS NOT NULL
        AND "carrier_phone" IS NOT NULL
        AND "verified_at" IS NOT NULL
    )
);
