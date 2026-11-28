import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ChatContextType, ChatConversationType } from '@prisma/client';

const createConversationFields = {
  participantId: nullAsAbsent(
    z.string().describe('Target user ID to chat with (Seller, Buyer, or Staff)'),
  ),
  targetUserId: nullAsAbsent(
    z.string().describe('Target user ID (legacy alias for participantId)'),
  ),
  type: z
    .enum(ChatConversationType)
    .describe('Conversation type: BUYER_SELLER, STAFF_SELLER, STAFF_BUYER')
    .default(ChatConversationType.BUYER_SELLER),
  title: nullAsAbsent(z.string().max(200).describe('Conversation title or topic')),
  contextId: nullAsAbsent(
    z.string().describe('Related context ID (order ID, product ID, dispute ID...)'),
  ),
  contextType: nullAsAbsent(
    z
      .enum(ChatContextType)
      .describe('Context type: GENERAL, ORDER, PRODUCT, AUCTION, DISPUTE, TICKET'),
  ),
  initialMessage: nullAsAbsent(
    z.string().max(1000).describe('Initial message sent when creating the conversation'),
  ),
};

export const CreateConversationSchema = z.object(createConversationFields).strict();

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
