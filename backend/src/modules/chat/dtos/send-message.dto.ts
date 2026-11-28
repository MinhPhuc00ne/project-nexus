import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const sendMessageFields = {
  conversationId: nullAsAbsent(
    z.string().describe('Conversation ID (optional when passed via :id route parameter)'),
  ),
  content: nullAsAbsent(z.string().max(4000).describe('Message text content')),
  body: nullAsAbsent(z.string().max(4000).describe('Message text content (alias for content)')),
  attachments: nullAsAbsent(
    z.array(z.string()).describe('List of attachment URLs (e.g., Cloudinary URLs)'),
  ),
};

export const SendMessageSchema = z.object(sendMessageFields).strict();

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
