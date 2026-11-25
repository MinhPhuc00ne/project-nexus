-- AlterTable
ALTER TABLE "auctions" ALTER COLUMN "min_buyer_reputation" SET DEFAULT 40;
ALTER TABLE "auctions" ALTER COLUMN "min_seller_reputation" SET DEFAULT 50;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "is_auction" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "trust_level" SET DEFAULT 'GOOD';

-- CreateTable
CREATE TABLE "auction_awards" (
    "id" TEXT NOT NULL,
    "auction_id" TEXT NOT NULL,
    "bid_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "deposit_amount" DECIMAL(14,2) NOT NULL CHECK ("deposit_amount" >= 0),
    "status" TEXT NOT NULL DEFAULT 'AWAITING_CHECKOUT' CHECK ("status" IN ('AWAITING_CHECKOUT', 'PAID', 'EXPIRED')),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "auction_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auction_awards_bid_id_key" ON "auction_awards"("bid_id");

-- CreateIndex
CREATE UNIQUE INDEX "auction_awards_order_id_key" ON "auction_awards"("order_id");

-- CreateIndex
CREATE INDEX "auction_awards_status_expires_at_idx" ON "auction_awards"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auction_awards_one_live_offer" ON "auction_awards"("auction_id")
    WHERE "status" IN ('AWAITING_CHECKOUT', 'PAID');

-- AddForeignKey
ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "bids"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_awards" ADD CONSTRAINT "auction_awards_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
