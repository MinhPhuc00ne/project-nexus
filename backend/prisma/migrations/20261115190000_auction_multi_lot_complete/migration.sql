-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'AUCTION_DEPOSIT_FORFEIT';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'AUCTION_DEPOSIT_COMPENSATION';

-- CreateEnum
CREATE TYPE "AuctionAwardTier" AS ENUM ('PRIMARY_WINNER', 'SECOND_CHANCE');

-- CreateEnum
CREATE TYPE "AuctionAwardStatus" AS ENUM (
  'AWAITING_ACCEPTANCE',
  'AWAITING_DEPOSIT',
  'AWAITING_CHECKOUT',
  'PAID',
  'PAYMENT_DEFAULT',
  'DECLINED',
  'BUYER_WITHDRAWN',
  'EXPIRED'
);

-- CreateEnum
CREATE TYPE "AuctionComplaintStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED');

-- Drop obsolete single-auction partial index so multi-lot offers can coexist per auction item
DROP INDEX IF EXISTS "auction_awards_one_live_offer";

-- AlterTable: notifications
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable: order_items
ALTER TABLE "order_items"
  ALTER COLUMN "product_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "auction_item_id" TEXT,
  ADD COLUMN IF NOT EXISTS "title_snapshot" TEXT;

-- AlterTable: auction_items
ALTER TABLE "auction_items"
  ADD COLUMN IF NOT EXISTS "weight_grams" INTEGER NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS "length_cm" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS "width_cm" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "height_cm" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "lot_status" "AuctionStatus" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN IF NOT EXISTS "staff_note" TEXT,
  ADD COLUMN IF NOT EXISTS "current_highest_bid" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "current_highest_bidder_id" TEXT,
  ADD COLUMN IF NOT EXISTS "total_bids_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "original_end_time" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "is_extended" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: bids
ALTER TABLE "bids"
  ADD COLUMN IF NOT EXISTS "auction_item_id" TEXT;

-- AlterTable: auction_awards
ALTER TABLE "auction_awards"
  ADD COLUMN IF NOT EXISTS "auction_item_id" TEXT,
  ADD COLUMN IF NOT EXISTS "buyer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "tier" "AuctionAwardTier" NOT NULL DEFAULT 'PRIMARY_WINNER',
  ADD COLUMN IF NOT EXISTS "offer_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolution_note" TEXT,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "order_id" DROP NOT NULL;

ALTER TABLE "auction_awards" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "auction_awards"
  ALTER COLUMN "status" TYPE "AuctionAwardStatus"
  USING (
    CASE
      WHEN "status" IN (
        'AWAITING_ACCEPTANCE',
        'AWAITING_DEPOSIT',
        'AWAITING_CHECKOUT',
        'PAID',
        'PAYMENT_DEFAULT',
        'DECLINED',
        'BUYER_WITHDRAWN',
        'EXPIRED'
      ) THEN "status"::"AuctionAwardStatus"
      ELSE 'EXPIRED'::"AuctionAwardStatus"
    END
  );
ALTER TABLE "auction_awards" ALTER COLUMN "status" SET DEFAULT 'AWAITING_CHECKOUT';

-- CreateTable: auction_complaints
CREATE TABLE "auction_complaints" (
  "id" TEXT NOT NULL,
  "auction_id" TEXT NOT NULL,
  "auction_item_id" TEXT,
  "reporter_id" TEXT NOT NULL,
  "reporter_role" "Role" NOT NULL,
  "reason" TEXT NOT NULL,
  "evidence_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "AuctionComplaintStatus" NOT NULL DEFAULT 'OPEN',
  "admin_note" TEXT,
  "handled_by_id" TEXT,
  "handled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auction_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auction_items_auction_id_lot_status_end_time_idx"
  ON "auction_items"("auction_id", "lot_status", "end_time");

CREATE INDEX IF NOT EXISTS "bids_auction_item_id_placed_at_idx"
  ON "bids"("auction_item_id", "placed_at");

CREATE INDEX IF NOT EXISTS "auction_awards_auction_item_id_status_idx"
  ON "auction_awards"("auction_item_id", "status");

CREATE INDEX IF NOT EXISTS "auction_awards_buyer_id_status_idx"
  ON "auction_awards"("buyer_id", "status");

CREATE UNIQUE INDEX "auction_awards_one_live_lot_offer"
  ON "auction_awards"("auction_item_id")
  WHERE "auction_item_id" IS NOT NULL
    AND "status" IN ('AWAITING_ACCEPTANCE', 'AWAITING_DEPOSIT', 'AWAITING_CHECKOUT', 'PAID');

CREATE INDEX "auction_complaints_auction_id_status_idx"
  ON "auction_complaints"("auction_id", "status");

CREATE INDEX "auction_complaints_reporter_id_created_at_idx"
  ON "auction_complaints"("reporter_id", "created_at");

-- AddForeignKey
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_auction_item_id_fkey"
  FOREIGN KEY ("auction_item_id") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bids"
  ADD CONSTRAINT "bids_auction_item_id_fkey"
  FOREIGN KEY ("auction_item_id") REFERENCES "auction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auction_awards"
  ADD CONSTRAINT "auction_awards_auction_item_id_fkey"
  FOREIGN KEY ("auction_item_id") REFERENCES "auction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auction_awards"
  ADD CONSTRAINT "auction_awards_buyer_id_fkey"
  FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auction_complaints"
  ADD CONSTRAINT "auction_complaints_auction_id_fkey"
  FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auction_complaints"
  ADD CONSTRAINT "auction_complaints_auction_item_id_fkey"
  FOREIGN KEY ("auction_item_id") REFERENCES "auction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auction_complaints"
  ADD CONSTRAINT "auction_complaints_reporter_id_fkey"
  FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auction_complaints"
  ADD CONSTRAINT "auction_complaints_handled_by_id_fkey"
  FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
