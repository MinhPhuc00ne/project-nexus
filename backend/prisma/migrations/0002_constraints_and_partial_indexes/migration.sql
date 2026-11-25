-- Data integrity that Prisma schema syntax cannot express.
--
-- The squashed `0001_init` is generated from `schema.prisma`, which has no way to
-- declare CHECK constraints or partial indexes. Before the squash these lived in
-- hand written migrations, so this layer restores every one of them. Eight further
-- CHECK constraints from the old migrations are deliberately absent: the columns
-- they guarded (`after_sales_requests.kind`/`status`, `banner_disable_history.source`,
-- `order_refunds.destination`/`status`, `orders.cancellation_actor`,
-- `seller_ghn_accounts.environment`/`status`) are now PostgreSQL enum types, which
-- enforce the same domain at the type level.
--
-- `backend/prisma/scripts/verify-constraints.mjs` asserts this file stays in force.

-- Auction awards: a deposit is never negative.
ALTER TABLE "auction_awards"
  ADD CONSTRAINT "auction_awards_deposit_amount_check" CHECK ("deposit_amount" >= 0);

-- Banner disable history is append-only evidence of a completed deactivation,
-- so each row always records the true before and after state.
ALTER TABLE "banner_disable_history"
  ADD CONSTRAINT "banner_disable_history_was_active_check" CHECK ("was_active" = true);

ALTER TABLE "banner_disable_history"
  ADD CONSTRAINT "banner_disable_history_is_active_check" CHECK ("is_active" = false);

-- Ratings are whole stars from 1 to 5.
ALTER TABLE "customer_reviews"
  ADD CONSTRAINT "customer_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "product_reviews"
  ADD CONSTRAINT "product_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

-- A banner's display window runs forwards.
ALTER TABLE "event_banners"
  ADD CONSTRAINT "event_banners_dates_check" CHECK (
    "starts_at" IS NULL
    OR "ends_at" IS NULL
    OR "starts_at" < "ends_at"
  );

-- A refund always moves money.
ALTER TABLE "order_refunds"
  ADD CONSTRAINT "order_refunds_amount_check" CHECK ("amount" > 0);

-- A product option offers between 1 and 50 values.
ALTER TABLE "product_options"
  ADD CONSTRAINT "product_options_values_check" CHECK (
    cardinality("values") BETWEEN 1 AND 50
  );

-- A sale price is a real discount above the minimum sellable amount.
ALTER TABLE "products"
  ADD CONSTRAINT "products_sale_price_check" CHECK (
    "sale_price" IS NULL
    OR (
      "sale_price" >= 1000
      AND "sale_price" < "base_price"
    )
  );

-- A sale window runs forwards.
ALTER TABLE "products"
  ADD CONSTRAINT "products_sale_dates_check" CHECK (
    "sale_starts_at" IS NULL
    OR "sale_ends_at" IS NULL
    OR "sale_starts_at" < "sale_ends_at"
  );

-- Denormalised review counters stay internally consistent.
ALTER TABLE "products"
  ADD CONSTRAINT "products_review_stats_check" CHECK (
    "review_count" >= 0
    AND "rating_sum" >= 0
    AND "average_rating" BETWEEN 0 AND 5
  );

-- A verified carrier registration carries its full proof of verification.
ALTER TABLE "seller_ghn_accounts"
  ADD CONSTRAINT "seller_ghn_accounts_verified_check" CHECK (
    "status" <> 'VERIFIED'
    OR (
      "ghn_shop_id" > 0
      AND "ghn_shop_id" IS NOT NULL
      AND "carrier_address" IS NOT NULL
      AND "carrier_phone" IS NOT NULL
      AND "verified_at" IS NOT NULL
    )
  );

-- At most one live offer per auction lot: a lot cannot be promised to two buyers.
CREATE UNIQUE INDEX "auction_awards_one_live_lot_offer"
  ON "auction_awards" ("auction_item_id")
  WHERE "auction_item_id" IS NOT NULL
    AND "status" IN ('AWAITING_ACCEPTANCE', 'AWAITING_DEPOSIT', 'AWAITING_CHECKOUT', 'PAID');

-- Wallet ownership follows its type: a member's wallet belongs to that member,
-- while the escrow liability and platform revenue ledgers belong to no one.
ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_owner_matches_type_check" CHECK (
    ("type" = 'USER_WALLET' AND "user_id" IS NOT NULL)
    OR ("type" <> 'USER_WALLET' AND "user_id" IS NULL)
  );

-- A balance is never negative, and locked funds never exceed the balance.
ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_balance_check" CHECK (
    "balance" >= 0
    AND "locked_balance" >= 0
    AND "locked_balance" <= "balance"
  );

-- Exactly one ledger wallet exists per platform wallet type.
CREATE UNIQUE INDEX "wallets_one_per_platform_type"
  ON "wallets" ("type")
  WHERE "user_id" IS NULL;
