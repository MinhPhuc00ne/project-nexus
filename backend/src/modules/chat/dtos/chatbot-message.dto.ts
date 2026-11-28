import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { OrderStatus } from '@prisma/client';

const chatbotHistoryMessageFields = {
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
};

export const ChatbotHistoryMessageSchema = z.object(chatbotHistoryMessageFields).strict();

export type ChatbotHistoryMessageInput = z.infer<typeof ChatbotHistoryMessageSchema>;

const guestChatbotMessageFields = {
  message: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .meta({ example: 'I want to cancel an order already confirmed by the shop' }),
  history: nullAsAbsent(
    z
      .array(ChatbotHistoryMessageSchema)
      .max(12)
      .describe(
        'Up to 12 recent messages excluding the current one; never include order data or secrets.',
      ),
  ),
};

export const GuestChatbotMessageSchema = z.object(guestChatbotMessageFields).strict();

export type GuestChatbotMessageInput = z.infer<typeof GuestChatbotMessageSchema>;

const chatbotMessageFields = {
  ...guestChatbotMessageFields,
  intent: nullAsAbsent(
    z
      .enum(['PURCHASES', 'SALES', 'CART'])
      .describe(
        'PURCHASES: personal order history for any role; SALES: seller orders; CART: personal cart. Inferred from message if omitted.',
      ),
  ),
  status: nullAsAbsent(z.enum(OrderStatus)),
  page: nullAsAbsent(z.coerce.number().int().min(1).max(100000)),
  limit: nullAsAbsent(z.coerce.number().int().min(1).max(20)),
  orderId: nullAsAbsent(z.uuid().describe('NEXUS order UUID to query (not a GHN waybill code)')),
};

export const ChatbotMessageSchema = z.object(chatbotMessageFields).strict();

export type ChatbotMessageInput = z.infer<typeof ChatbotMessageSchema>;
