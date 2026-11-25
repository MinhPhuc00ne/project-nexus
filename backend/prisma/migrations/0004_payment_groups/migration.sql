-- One payment covering several orders.
--
-- A cart holding items from two shops becomes two orders, because an order is
-- what one seller packs and ships. Checkout created them and then stopped:
-- `if (createdOrders.length === 1)` guarded the whole payment step, so a
-- multi-shop cart left the buyer with two orders in PENDING_PAYMENT and no way
-- to pay for them from the checkout they had just completed.
--
-- The buyer pays once, so the PayOS link and the order code PayOS settles
-- against belong to the group rather than to any one order. Each order still
-- gets its own payment row when the money arrives, which is what escrow,
-- refunds and the seller payout read.
CREATE TABLE payment_groups (
  id          text NOT NULL,
  buyer_id    text NOT NULL,
  order_code  text NOT NULL,
  amount      numeric(15, 0) NOT NULL,
  status      "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  metadata    jsonb,
  created_at  timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  timestamp(3) NOT NULL,

  CONSTRAINT payment_groups_pkey PRIMARY KEY (id),
  CONSTRAINT payment_groups_buyer_id_fkey FOREIGN KEY (buyer_id)
    REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  -- The amount is the sum of the orders in the group; a group for nothing is a
  -- link that cannot be paid.
  CONSTRAINT payment_groups_amount_check CHECK (amount > 0)
);

-- The callback carries only the order code, so it has to find the group by it,
-- and no two groups may answer to the same one.
CREATE UNIQUE INDEX payment_groups_order_code_key ON payment_groups (order_code);
CREATE INDEX payment_groups_buyer_id_status_idx ON payment_groups (buyer_id, status);

ALTER TABLE orders ADD COLUMN payment_group_id text;

-- A group that is deleted leaves its orders behind rather than taking them:
-- the orders are the record of what was bought.
ALTER TABLE orders ADD CONSTRAINT orders_payment_group_id_fkey
  FOREIGN KEY (payment_group_id) REFERENCES payment_groups (id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX orders_payment_group_id_idx ON orders (payment_group_id);
