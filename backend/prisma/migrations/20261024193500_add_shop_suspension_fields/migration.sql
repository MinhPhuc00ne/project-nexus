-- AlterTable
ALTER TABLE "users"
ADD COLUMN "is_shop_suspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suspension_reason" TEXT;
