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
    .meta({ example: 'Tôi muốn hủy đơn hàng đã được shop xác nhận' }),
  history: nullAsAbsent(
    z
      .array(ChatbotHistoryMessageSchema)
      .max(12)
      .describe(
        'Tối đa 12 tin gần nhất, không gồm tin hiện tại; không gửi dữ liệu đơn hàng hoặc bí mật.',
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
        'PURCHASES: lịch sử đặt hàng cá nhân cho mọi role; SALES: đơn bán; CART: giỏ cá nhân. Có thể nhận diện từ message nếu bỏ trống.',
      ),
  ),
  status: nullAsAbsent(z.enum(OrderStatus)),
  page: nullAsAbsent(z.coerce.number().int().min(1).max(100000)),
  limit: nullAsAbsent(z.coerce.number().int().min(1).max(20)),
  orderId: nullAsAbsent(z.uuid().describe('Mã đơn NEXUS cần tra cứu; không phải mã vận đơn GHN')),
};

export const ChatbotMessageSchema = z.object(chatbotMessageFields).strict();

export type ChatbotMessageInput = z.infer<typeof ChatbotMessageSchema>;
