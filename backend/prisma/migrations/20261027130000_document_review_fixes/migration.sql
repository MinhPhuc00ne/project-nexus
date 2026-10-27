BEGIN;

ALTER TABLE "users" ADD COLUMN "shop_avatar_url" TEXT;
-- Copy once to preserve the current shop picture; subsequent updates are independent.
UPDATE "users" SET "shop_avatar_url" = "avatar_url" WHERE "role" = 'SELLER';

ALTER TABLE "products"
  ADD COLUMN "hidden_by_shop_suspension" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sale_price" DECIMAL(14,2),
  ADD COLUMN "sale_starts_at" TIMESTAMP(3),
  ADD COLUMN "sale_ends_at" TIMESTAMP(3),
  ADD COLUMN "review_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rating_sum" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "average_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD CONSTRAINT "products_sale_price_check" CHECK (sale_price IS NULL OR (sale_price >= 1000 AND sale_price < base_price)),
  ADD CONSTRAINT "products_sale_dates_check" CHECK (sale_starts_at IS NULL OR sale_ends_at IS NULL OR sale_starts_at < sale_ends_at),
  ADD CONSTRAINT "products_review_stats_check" CHECK (review_count >= 0 AND rating_sum >= 0 AND average_rating BETWEEN 0 AND 5);

CREATE TABLE "product_options" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "values" TEXT[] NOT NULL,
  CONSTRAINT "product_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_options_values_check" CHECK (cardinality("values") BETWEEN 1 AND 50),
  CONSTRAINT "product_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "product_options_product_id_name_key" ON "product_options"("product_id", "name");

ALTER TABLE "cart_items" ADD COLUMN "option_key" TEXT NOT NULL DEFAULT '', ADD COLUMN "selections" JSONB;
DROP INDEX "cart_items_cart_id_product_id_key";
CREATE UNIQUE INDEX "cart_items_cart_id_product_id_option_key_key" ON "cart_items"("cart_id", "product_id", "option_key");
ALTER TABLE "order_items" ADD COLUMN "selections" JSONB;
ALTER TABLE "orders" ADD COLUMN "cancellation_actor" TEXT,
  ADD CONSTRAINT "orders_cancellation_actor_check" CHECK (cancellation_actor IS NULL OR cancellation_actor IN ('BUYER', 'SELLER', 'SYSTEM', 'ADMIN'));

CREATE TABLE "product_reviews" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "reviewer_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "product_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "product_reviews_order_id_product_id_key" ON "product_reviews"("order_id", "product_id");
CREATE INDEX "product_reviews_product_id_created_at_idx" ON "product_reviews"("product_id", "created_at");

CREATE TABLE "customer_reviews" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "seller_id" TEXT NOT NULL,
  "buyer_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "customer_reviews_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customer_reviews_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "customer_reviews_order_id_key" ON "customer_reviews"("order_id");
CREATE INDEX "customer_reviews_buyer_id_created_at_idx" ON "customer_reviews"("buyer_id", "created_at");

CREATE TABLE "event_banners" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "target_url" TEXT,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "creator_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_banners_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_banners_dates_check" CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
  CONSTRAINT "event_banners_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "event_banners_is_active_starts_at_ends_at_idx" ON "event_banners"("is_active", "starts_at", "ends_at");
ALTER TABLE "shop_violations" ADD COLUMN "product_id" TEXT,
  ADD CONSTRAINT "shop_violations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
