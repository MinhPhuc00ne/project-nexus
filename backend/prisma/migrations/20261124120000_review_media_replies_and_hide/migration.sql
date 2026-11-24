-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ReviewMediaType" AS ENUM ('IMAGE', 'VIDEO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "reviews"
ADD COLUMN IF NOT EXISTS "media_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "is_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "hidden_reason" TEXT,
ADD COLUMN IF NOT EXISTS "hidden_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "hidden_by_id" TEXT;

-- AlterTable
ALTER TABLE "product_reviews"
ADD COLUMN IF NOT EXISTS "is_hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "hidden_reason" TEXT,
ADD COLUMN IF NOT EXISTS "hidden_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "hidden_by_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "review_media" (
    "id" TEXT NOT NULL,
    "product_review_id" TEXT,
    "shop_review_id" TEXT,
    "media_type" "ReviewMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "review_replies" (
    "id" TEXT NOT NULL,
    "product_review_id" TEXT,
    "shop_review_id" TEXT,
    "author_id" TEXT NOT NULL,
    "author_role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_reason" TEXT,
    "hidden_at" TIMESTAMP(3),
    "hidden_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "review_reply_media" (
    "id" TEXT NOT NULL,
    "reply_id" TEXT NOT NULL,
    "media_type" "ReviewMediaType" NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_reply_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "review_media_product_review_id_sort_order_idx" ON "review_media"("product_review_id", "sort_order");
CREATE INDEX IF NOT EXISTS "review_media_shop_review_id_sort_order_idx" ON "review_media"("shop_review_id", "sort_order");
CREATE INDEX IF NOT EXISTS "review_replies_product_review_id_created_at_idx" ON "review_replies"("product_review_id", "created_at");
CREATE INDEX IF NOT EXISTS "review_replies_shop_review_id_created_at_idx" ON "review_replies"("shop_review_id", "created_at");
CREATE INDEX IF NOT EXISTS "review_reply_media_reply_id_sort_order_idx" ON "review_reply_media"("reply_id", "sort_order");

-- AddForeignKey
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_product_review_id_fkey" FOREIGN KEY ("product_review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_media" ADD CONSTRAINT "review_media_shop_review_id_fkey" FOREIGN KEY ("shop_review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_product_review_id_fkey" FOREIGN KEY ("product_review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_shop_review_id_fkey" FOREIGN KEY ("shop_review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_replies" ADD CONSTRAINT "review_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_reply_media" ADD CONSTRAINT "review_reply_media_reply_id_fkey" FOREIGN KEY ("reply_id") REFERENCES "review_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
