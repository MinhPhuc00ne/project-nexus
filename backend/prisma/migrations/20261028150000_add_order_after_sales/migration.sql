-- CreateTable
CREATE TABLE "after_sales_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requested_by" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "refund_to_wallet" BOOLEAN NOT NULL DEFAULT false,
    "decision_reason" TEXT,
    "reviewed_by" TEXT,
    "return_waybill_code" TEXT,
    "received_at" TIMESTAMP(3),
    "restocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "after_sales_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" DECIMAL(14, 2) NOT NULL,
    "destination" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "admin_wallet_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "external_reference" TEXT,
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "after_sales_requests_order_id_key" ON "after_sales_requests" ("order_id");

-- CreateIndex
CREATE INDEX "after_sales_requests_status_created_at_idx" ON "after_sales_requests" ("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_refunds_payment_id_key" ON "order_refunds" ("payment_id");

CREATE UNIQUE INDEX "order_refunds_transaction_id_key" ON "order_refunds" ("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_refunds_external_reference_key" ON "order_refunds" ("external_reference");

-- CreateIndex
CREATE INDEX "order_refunds_status_created_at_idx" ON "order_refunds" ("status", "created_at");

-- AddForeignKey
ALTER TABLE "after_sales_requests"
ADD CONSTRAINT "after_sales_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds"
ADD CONSTRAINT "order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds"
ADD CONSTRAINT "order_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_refunds"
ADD CONSTRAINT "order_refunds_admin_wallet_id_fkey" FOREIGN KEY ("admin_wallet_id") REFERENCES "wallets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_refunds"
ADD CONSTRAINT "order_refunds_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "wallet_transactions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "after_sales_requests"
ADD CONSTRAINT "after_sales_kind_check" CHECK (
    "kind" IN ('CANCEL', 'RETURN')
);

ALTER TABLE "after_sales_requests"
ADD CONSTRAINT "after_sales_status_check" CHECK (
    "status" IN (
        'REQUESTED',
        'APPROVING',
        'APPROVED',
        'RECEIVED',
        'COMPLETED',
        'REJECTED'
    )
);

ALTER TABLE "order_refunds"
ADD CONSTRAINT "order_refunds_amount_check" CHECK ("amount" > 0);

ALTER TABLE "order_refunds"
ADD CONSTRAINT "order_refunds_status_check" CHECK (
    "status" IN ('PENDING', 'SUCCESS')
);

ALTER TABLE "order_refunds"
ADD CONSTRAINT "order_refunds_destination_check" CHECK (
    "destination" IN ('WALLET', 'ORIGINAL')
);
