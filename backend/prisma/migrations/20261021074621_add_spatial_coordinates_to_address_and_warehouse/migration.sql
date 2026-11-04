-- AlterTable
ALTER TABLE "user_addresses"
ADD COLUMN "formatted_address" TEXT,
ADD COLUMN "latitude" DECIMAL(10, 8),
ADD COLUMN "longitude" DECIMAL(11, 8),
ADD COLUMN "place_id" TEXT;

-- AlterTable
ALTER TABLE "warehouses"
ADD COLUMN "latitude" DECIMAL(10, 8),
ADD COLUMN "longitude" DECIMAL(11, 8);
