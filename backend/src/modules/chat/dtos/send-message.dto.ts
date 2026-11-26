import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const sendMessageFields = {
  conversationId: nullAsAbsent(
    z.string().describe('ID của cuộc trò chuyện (tùy chọn khi gửi qua endpoint có param :id)'),
  ),
  content: nullAsAbsent(z.string().max(4000).describe('Nội dung tin nhắn văn bản')),
  body: nullAsAbsent(z.string().max(4000).describe('Nội dung văn bản (alias tương đương content)')),
  attachments: nullAsAbsent(
    z.array(z.string()).describe('Danh sách URL hình ảnh / tài liệu đính kèm (URL từ Cloudinary)'),
  ),
};

export const SendMessageSchema = z.object(sendMessageFields).strict();

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
