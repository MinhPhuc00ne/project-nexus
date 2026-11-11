ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "consignment_deadline" TIMESTAMP(3);
ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "is_consignment_locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "auctions" ADD COLUMN IF NOT EXISTS "consignment_locked_at" TIMESTAMP(3);
