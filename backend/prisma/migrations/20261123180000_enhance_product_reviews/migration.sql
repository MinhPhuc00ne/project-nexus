-- AlterTable
ALTER TABLE "product_reviews"
ADD COLUMN IF NOT EXISTS "media_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "seller_reply" TEXT,
ADD COLUMN IF NOT EXISTS "seller_replied_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "helpful_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "product_review_helpful_votes" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_review_helpful_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "product_review_helpful_votes_review_id_user_id_key" ON "product_review_helpful_votes"("review_id", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "product_review_helpful_votes_user_id_idx" ON "product_review_helpful_votes"("user_id");

-- AddForeignKey
ALTER TABLE "product_review_helpful_votes" ADD CONSTRAINT "product_review_helpful_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_helpful_votes" ADD CONSTRAINT "product_review_helpful_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
