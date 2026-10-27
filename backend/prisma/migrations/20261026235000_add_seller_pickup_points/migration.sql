CREATE TABLE "seller_pickup_points" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "ward" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "district_id" INTEGER NOT NULL,
    "ward_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "ghn_shop_id" INTEGER,
    "ghn_client_id" INTEGER,
    "carrier_name" TEXT,
    "carrier_phone" TEXT,
    "carrier_address" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seller_pickup_points_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "seller_pickup_points_environment_check" CHECK ("environment" IN ('SANDBOX', 'PRODUCTION')),
    CONSTRAINT "seller_pickup_points_status_check" CHECK ("status" IN ('PENDING', 'VERIFIED')),
    CONSTRAINT "seller_pickup_points_verified_check" CHECK (
      "status" <> 'VERIFIED' OR ("ghn_shop_id" > 0 AND "ghn_shop_id" IS NOT NULL
        AND "carrier_address" IS NOT NULL AND "verified_at" IS NOT NULL AND "verified_by" IS NOT NULL)
    )
);
CREATE UNIQUE INDEX "seller_pickup_points_seller_id_environment_key" ON "seller_pickup_points"("seller_id", "environment");
CREATE UNIQUE INDEX "seller_pickup_points_environment_ghn_shop_id_key" ON "seller_pickup_points"("environment", "ghn_shop_id");
CREATE INDEX "seller_pickup_points_environment_status_idx" ON "seller_pickup_points"("environment", "status");
ALTER TABLE "seller_pickup_points" ADD CONSTRAINT "seller_pickup_points_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
