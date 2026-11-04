-- CreateEnum
CREATE TYPE "ShopActionType" AS ENUM ('WARN', 'SUSPEND', 'RESTORE');

-- CreateEnum
CREATE TYPE "ViolationStatus" AS ENUM ('PENDING', 'INVESTIGATING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "shop_action_logs" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" "ShopActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shop_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_violations" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "reporter_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "penalty_level" TEXT,
    "status" "ViolationStatus" NOT NULL DEFAULT 'PENDING',
    "resolution_notes" TEXT,
    "handled_by_admin_id" TEXT,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shop_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(14, 2) NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "admin_note" TEXT,
    "reviewed_by_admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shop_action_logs_shop_id_created_at_idx" ON "shop_action_logs" ("shop_id", "created_at");

-- CreateIndex
CREATE INDEX "shop_violations_shop_id_status_idx" ON "shop_violations" ("shop_id", "status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_user_id_status_idx" ON "withdrawal_requests" ("user_id", "status");

-- AddForeignKey
ALTER TABLE "shop_action_logs"
ADD CONSTRAINT "shop_action_logs_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_action_logs"
ADD CONSTRAINT "shop_action_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_violations"
ADD CONSTRAINT "shop_violations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_violations"
ADD CONSTRAINT "shop_violations_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_violations"
ADD CONSTRAINT "shop_violations_handled_by_admin_id_fkey" FOREIGN KEY ("handled_by_admin_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests"
ADD CONSTRAINT "withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests"
ADD CONSTRAINT "withdrawal_requests_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
