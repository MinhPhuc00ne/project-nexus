-- CreateEnum
CREATE TYPE "AuctionItemStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;

CREATE TYPE "CarrierName_new" AS ENUM ('GHN');
ALTER TABLE "shipments" ALTER COLUMN "carrier" DROP DEFAULT;
ALTER TABLE "shipments" ALTER COLUMN "carrier" TYPE "CarrierName_new" USING ("carrier"::text::"CarrierName_new");

ALTER TYPE "CarrierName" RENAME TO "CarrierName_old";

ALTER TYPE "CarrierName_new" RENAME TO "CarrierName";
DROP TYPE "CarrierName_old";
ALTER TABLE "shipments" ALTER COLUMN "carrier" SET DEFAULT 'GHN';

COMMIT;

-- AlterEnum
BEGIN;

CREATE TYPE "PaymentProvider_new" AS ENUM ('PAYOS', 'WALLET', 'COD');

ALTER TABLE "payments" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING ("provider"::text::"PaymentProvider_new");

ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";

ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "PaymentProvider_old";
COMMIT;

-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'AUCTION_BID_LOCK';

ALTER TYPE "WalletTransactionType" ADD VALUE 'AUCTION_BID_REFUND';

-- DropForeignKey
ALTER TABLE "auctions" DROP CONSTRAINT IF EXISTS "auctions_product_id_fkey";

-- DropForeignKey
ALTER TABLE "auctions" DROP CONSTRAINT IF EXISTS "auctions_seller_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_auto_replies" DROP CONSTRAINT IF EXISTS "chat_auto_replies_cancelled_by_fkey";

-- DropForeignKey
ALTER TABLE "chat_auto_replies" DROP CONSTRAINT IF EXISTS "chat_auto_replies_shop_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_conversations" DROP CONSTRAINT IF EXISTS "chat_conversations_assigned_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_conversations" DROP CONSTRAINT IF EXISTS "chat_conversations_participant1_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_conversations" DROP CONSTRAINT IF EXISTS "chat_conversations_participant2_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_conversation_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_sender_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "chat_conversations_participant1_idx";

-- DropIndex
DROP INDEX IF EXISTS "chat_conversations_participant2_idx";

-- AlterTable
ALTER TABLE "auctions" ADD COLUMN     "created_by_admin_id" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "min_buyer_reputation" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "min_seller_reputation" INTEGER NOT NULL DEFAULT 80,
ALTER COLUMN "product_id" DROP NOT NULL,
ALTER COLUMN "seller_id" DROP NOT NULL,
ALTER COLUMN "starting_price" SET DEFAULT 0,
ALTER COLUMN "bid_increment" SET DEFAULT 100000.0;

-- AlterTable
ALTER TABLE "chat_auto_replies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN IF NOT EXISTS "assigned_staff_id" TEXT,
ALTER COLUMN "status" SET DEFAULT 'OPEN',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable


CREATE TABLE "auction_items" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT[],
    "three_model_key" TEXT,
    "proposed_starting_price" DECIMAL(14,2) NOT NULL,
    "proposed_reserve_price" DECIMAL(14,2),
    "proposed_bid_increment" DECIMAL(14,2) NOT NULL DEFAULT 100000,
    "appraisal_certificate_number" TEXT,
    "appraisal_agency" TEXT,
    "certificate_images" TEXT[],
    "certificate_issue_date" TIMESTAMP(3),
    "status" "AuctionItemStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "is_seller_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "rejection_reason" TEXT,
    "lot_number" INTEGER,
    "starting_price" DECIMAL(14,2),
    "reserve_price" DECIMAL(14,2),
    "bid_increment" DECIMAL(14,2),
    "reviewed_by_admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auction_items_auction_id_status_idx" ON "auction_items"("auction_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "auction_items_seller_id_idx" ON "auction_items"("seller_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_conversations_participant1_id_participant2_id_idx" ON "chat_conversations"("participant1_id", "participant2_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_conversations_context_id_context_type_idx" ON "chat_conversations"("context_id", "context_type");

-- AddForeignKey
ALTER TABLE "auctions"
ADD CONSTRAINT "auctions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions"
ADD CONSTRAINT "auctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions"
ADD CONSTRAINT "auctions_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items"
ADD CONSTRAINT "auction_items_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items"
ADD CONSTRAINT "auction_items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_items"
ADD CONSTRAINT "auction_items_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_participant1_id_fkey" FOREIGN KEY ("participant1_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_participant2_id_fkey" FOREIGN KEY ("participant2_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_auto_replies" ADD CONSTRAINT "chat_auto_replies_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_auto_replies" ADD CONSTRAINT "chat_auto_replies_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX IF EXISTS "chat_conversations_context_idx" RENAME TO "chat_conversations_context_id_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "chat_messages_conv_created_idx" RENAME TO "chat_messages_conversation_id_created_at_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "chat_messages_sender_idx" RENAME TO "chat_messages_sender_id_idx";
