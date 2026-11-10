ALTER TABLE "seller_pickup_points" RENAME TO "seller_ghn_accounts";
ALTER TABLE "seller_ghn_accounts" ADD COLUMN "profile_fingerprint" TEXT;

UPDATE "seller_ghn_accounts" SET
  "carrier_name" = COALESCE("carrier_name", "name"),
  "carrier_phone" = COALESCE("carrier_phone", "phone"),
  "carrier_address" = COALESCE("carrier_address", concat_ws(', ', "street", "ward", "district", "city"));

ALTER TABLE "seller_ghn_accounts"
  DROP COLUMN "name",
  DROP COLUMN "phone",
  DROP COLUMN "city",
  DROP COLUMN "district",
  DROP COLUMN "ward",
  DROP COLUMN "street",
  DROP COLUMN "latitude",
  DROP COLUMN "longitude";

ALTER TABLE "seller_ghn_accounts" RENAME CONSTRAINT "seller_pickup_points_pkey" TO "seller_ghn_accounts_pkey";
ALTER TABLE "seller_ghn_accounts" RENAME CONSTRAINT "seller_pickup_points_seller_id_fkey" TO "seller_ghn_accounts_seller_id_fkey";
ALTER TABLE "seller_ghn_accounts" RENAME CONSTRAINT "seller_pickup_points_environment_check" TO "seller_ghn_accounts_environment_check";
ALTER TABLE "seller_ghn_accounts" RENAME CONSTRAINT "seller_pickup_points_status_check" TO "seller_ghn_accounts_status_check";
ALTER TABLE "seller_ghn_accounts" RENAME CONSTRAINT "seller_pickup_points_verified_check" TO "seller_ghn_accounts_verified_check";
ALTER INDEX "seller_pickup_points_seller_id_environment_key" RENAME TO "seller_ghn_accounts_seller_id_environment_key";
ALTER INDEX "seller_pickup_points_environment_ghn_shop_id_key" RENAME TO "seller_ghn_accounts_environment_ghn_shop_id_key";
ALTER INDEX "seller_pickup_points_environment_status_idx" RENAME TO "seller_ghn_accounts_environment_status_idx";
