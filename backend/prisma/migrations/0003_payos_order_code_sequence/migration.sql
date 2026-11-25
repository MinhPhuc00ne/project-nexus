-- PayOS identifies a transfer by an integer `orderCode` that the platform
-- chooses and must keep unique for the life of the merchant account.
--
-- Two places chose one, and both built it out of a clock and a random suffix:
-- checkout used the last six digits of the millisecond plus four random digits,
-- and the wallet top-up used unix seconds plus two. Neither can promise
-- uniqueness — two checkouts in the same millisecond collide one time in ten
-- thousand — and nothing stopped the two paths from choosing the same number,
-- which the callback dispatcher would then settle against whichever record it
-- found first.
--
-- A sequence cannot repeat. It starts above every code the old scheme could
-- produce (the clock-based codes run to about 1.8e11) and stops below the
-- largest integer PayOS accepts.
CREATE SEQUENCE IF NOT EXISTS payos_order_code_seq
  AS bigint
  START WITH 1000000000000
  INCREMENT BY 1
  MINVALUE 1000000000000
  MAXVALUE 9007199254740991
  NO CYCLE;

-- With the codes unique by construction, make the database say so: a second
-- record claiming a code now fails the write instead of quietly shadowing the
-- first one in the callback lookup.
--
-- Both indexes are partial. A payment's transaction code is only a PayOS order
-- code when PayOS took the money; COD and wallet payments leave it null or use
-- it for their own reference. A wallet transaction's reference id points at a
-- PayOS order code only for a DEPOSIT, and at a payment or an order for every
-- other type.
CREATE UNIQUE INDEX IF NOT EXISTS payments_payos_transaction_code_key
  ON payments (transaction_code)
  WHERE provider = 'PAYOS' AND transaction_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_deposit_reference_key
  ON wallet_transactions (reference_id)
  WHERE type = 'DEPOSIT' AND reference_id IS NOT NULL;
