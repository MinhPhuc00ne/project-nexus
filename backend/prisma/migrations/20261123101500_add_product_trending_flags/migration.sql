-- AlterTable
ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "trending_excluded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "trending_excluded_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "trending_notified_at" TIMESTAMP(3);
