CREATE TYPE "BannerCreatorRole" AS ENUM ('ADMIN', 'STAFF');
ALTER TABLE "event_banners" ADD COLUMN "creator_role" "BannerCreatorRole";
UPDATE "event_banners" AS banner SET "creator_role" =
  CASE WHEN account."role" = 'ADMIN' THEN 'ADMIN'::"BannerCreatorRole" ELSE 'STAFF'::"BannerCreatorRole" END
  FROM "users" AS account WHERE banner."creator_id" = account."id";
ALTER TABLE "event_banners" ALTER COLUMN "creator_role" SET NOT NULL;
ALTER TABLE "event_banners" ADD COLUMN "auction_id" TEXT;
ALTER TABLE "event_banners" ADD CONSTRAINT "event_banners_auction_id_fkey"
  FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "event_banners_creator_role_created_at_id_idx" ON "event_banners"("creator_role", "created_at", "id");

CREATE TABLE "banner_disable_history" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "banner_id" TEXT NOT NULL,
  "banner_title" TEXT NOT NULL,
  "creator_id" TEXT NOT NULL,
  "creator_name" TEXT NOT NULL,
  "creator_role" "BannerCreatorRole" NOT NULL,
  "actor_id" TEXT NOT NULL,
  "actor_name" TEXT NOT NULL,
  "actor_role" "Role" NOT NULL,
  "source" TEXT NOT NULL CHECK ("source" IN ('UPDATE', 'DELETE', 'DISABLE')),
  "was_active" BOOLEAN NOT NULL DEFAULT true CHECK ("was_active" = true),
  "is_active" BOOLEAN NOT NULL DEFAULT false CHECK ("is_active" = false),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "banner_disable_history_banner_id_fkey" FOREIGN KEY ("banner_id") REFERENCES "event_banners"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "banner_disable_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "banner_disable_history_banner_id_created_at_idx" ON "banner_disable_history"("banner_id", "created_at");
CREATE INDEX "banner_disable_history_actor_id_created_at_idx" ON "banner_disable_history"("actor_id", "created_at");
CREATE INDEX "banner_disable_history_created_at_id_idx" ON "banner_disable_history"("created_at", "id");
ALTER TABLE "notifications" ADD COLUMN "auction_id" TEXT, ADD COLUMN "target_url" TEXT;
