-- CreateTable
CREATE TABLE IF NOT EXISTS "chat_auto_replies" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'SHOP',
    "shop_id" TEXT,
    "name" TEXT,
    "trigger_type" TEXT NOT NULL DEFAULT 'WELCOME',
    "keyword" TEXT,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancel_reason" TEXT,
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_auto_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_auto_replies_shop_id_scope_idx" ON "chat_auto_replies" ("shop_id", "scope");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_auto_replies_status_idx" ON "chat_auto_replies" ("status");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "chat_auto_replies" ADD CONSTRAINT "chat_auto_replies_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

EXCEPTION WHEN duplicate_object THEN null;

END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "chat_auto_replies" ADD CONSTRAINT "chat_auto_replies_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
