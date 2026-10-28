import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

export async function ensureChatDatabaseTables(
  prisma: PrismaService,
  logger: Logger,
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id TEXT NOT NULL PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'BUYER_SELLER',
        participant1_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        participant2_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        context_id TEXT,
        context_type TEXT,
        last_message TEXT,
        last_message_at TIMESTAMP(3),
        unread_count_user1 INTEGER NOT NULL DEFAULT 0,
        unread_count_user2 INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT NOT NULL PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        is_read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMP(3),
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS chat_auto_replies (
        id TEXT NOT NULL PRIMARY KEY,
        scope TEXT NOT NULL DEFAULT 'SHOP',
        shop_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT,
        trigger_type TEXT NOT NULL DEFAULT 'WELCOME',
        keyword TEXT,
        content TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        cancel_reason TEXT,
        cancelled_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        cancelled_at TIMESTAMP(3),
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Lưu ý khởi tạo bảng chat: ${msg}`);
  }
}
