-- AlterTable
ALTER TABLE "seller_upgrade_requests"
ADD COLUMN "city" TEXT,
ADD COLUMN "district" TEXT,
ADD COLUMN "formatted_address" TEXT,
ADD COLUMN "latitude" DECIMAL(10, 8),
ADD COLUMN "longitude" DECIMAL(11, 8),
ADD COLUMN "place_id" TEXT,
ADD COLUMN "street" TEXT,
ADD COLUMN "ward" TEXT;
