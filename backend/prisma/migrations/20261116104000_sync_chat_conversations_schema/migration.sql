-- AlterTable: align chat_conversations.participant2_id nullability and indexes with schema.prisma
ALTER TABLE "chat_conversations"
  ALTER COLUMN "participant2_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_conversations_assigned_staff_id_idx"
  ON "chat_conversations"("assigned_staff_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chat_conversations_status_idx"
  ON "chat_conversations"("status");
