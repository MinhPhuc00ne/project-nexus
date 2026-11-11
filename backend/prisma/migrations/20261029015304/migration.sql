-- AlterTable
ALTER TABLE "chat_auto_replies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "chat_conversations" ADD COLUMN     "assigned_staff_id" TEXT,
ALTER COLUMN "participant2_id" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'OPEN',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "chat_conversations_assigned_staff_id_idx" ON "chat_conversations"("assigned_staff_id");

-- CreateIndex
CREATE INDEX "chat_conversations_context_id_context_type_idx" ON "chat_conversations"("context_id", "context_type");

-- CreateIndex
CREATE INDEX "chat_conversations_status_idx" ON "chat_conversations"("status");

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_assigned_staff_id_fkey" FOREIGN KEY ("assigned_staff_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
