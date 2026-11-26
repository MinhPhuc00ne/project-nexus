import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ChatContextType, ChatConversationType } from '@prisma/client';

const createConversationFields = {
  participantId: nullAsAbsent(
    z.string().describe('ID của người dùng muốn trò chuyện cùng (Seller, Buyer hoặc Staff)'),
  ),
  targetUserId: nullAsAbsent(
    z.string().describe('ID người nhận (alias tương đương participantId, tương thích format cũ)'),
  ),
  type: z
    .enum(ChatConversationType)
    .describe('Loại cuộc trò chuyện: BUYER_SELLER, STAFF_SELLER, STAFF_BUYER')
    .default(ChatConversationType.BUYER_SELLER),
  title: nullAsAbsent(z.string().max(200).describe('Tiêu đề cuộc trò chuyện / chủ đề trao đổi')),
  contextId: nullAsAbsent(
    z.string().describe('ID ngữ cảnh liên quan (mã đơn hàng, mã sản phẩm, mã khiếu nại...)'),
  ),
  contextType: nullAsAbsent(
    z
      .enum(ChatContextType)
      .describe('Loại ngữ cảnh: GENERAL, ORDER, PRODUCT, AUCTION, DISPUTE, TICKET'),
  ),
  initialMessage: nullAsAbsent(
    z
      .string()
      .max(1000)
      .describe('Nội dung tin nhắn đầu tiên gửi kèm khi khởi tạo cuộc trò chuyện'),
  ),
};

export const CreateConversationSchema = z.object(createConversationFields).strict();

export type CreateConversationInput = z.infer<typeof CreateConversationSchema>;
