import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const queryConversationsFields = {
  page: z.coerce.number().int().min(1).describe('Trang hiện tại (bắt đầu từ 1)').default(1),
  limit: z.coerce.number().int().min(1).describe('Số lượng mục trên một trang').default(20),
  type: nullAsAbsent(
    z.string().describe('Lọc theo loại cuộc trò chuyện: BUYER_SELLER, STAFF_SELLER, STAFF_BUYER'),
  ),
  search: nullAsAbsent(
    z.string().describe('Tìm kiếm theo tên người tham gia hoặc tiêu đề hội thoại'),
  ),
};

export const QueryConversationsSchema = z.object(queryConversationsFields).strict();

export type QueryConversationsInput = z.infer<typeof QueryConversationsSchema>;

const queryMessagesFields = {
  limit: z.coerce.number().int().min(1).describe('Số lượng tin nhắn cần lấy').default(50),
  before: nullAsAbsent(
    z.string().describe('Lấy tin nhắn trước mốc thời gian này (ISO string) để phân trang ngược'),
  ),
};

export const QueryMessagesSchema = z.object(queryMessagesFields).strict();

export type QueryMessagesInput = z.infer<typeof QueryMessagesSchema>;
