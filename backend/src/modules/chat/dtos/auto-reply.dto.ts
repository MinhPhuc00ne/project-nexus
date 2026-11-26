import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ChatAutoReplyScope, ChatAutoReplyStatus, ChatAutoReplyTriggerType } from '@prisma/client';

const createAutoReplyFields = {
  name: nullAsAbsent(
    z
      .string()
      .max(100)
      .describe('Tên cấu hình tin nhắn tự động')
      .meta({ example: 'Tin nhắn chào mừng' }),
  ),
  triggerType: z
    .enum(ChatAutoReplyTriggerType)
    .describe(
      'Loại kích hoạt: WELCOME (lần đầu chat), OFFLINE (ngoài giờ), KEYWORD (từ khóa), DEFAULT',
    )
    .default(ChatAutoReplyTriggerType.WELCOME),
  keyword: nullAsAbsent(
    z
      .string()
      .max(100)
      .describe('Từ khóa kích hoạt (nếu triggerType là KEYWORD)')
      .meta({ example: 'bảo hành' }),
  ),
  content: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .describe('Nội dung tin nhắn tự động gửi đến khách hàng')
    .meta({
      example: 'Chào bạn! Cảm ơn bạn đã nhắn tin cho shop. Shop sẽ phản hồi trong giây lát.',
    }),
  isActive: z.boolean().describe('Trạng thái kích hoạt (mặc định true)').default(true),
};

export const CreateAutoReplySchema = z.object(createAutoReplyFields).strict();

export type CreateAutoReplyInput = z.infer<typeof CreateAutoReplySchema>;

const updateAutoReplyFields = {
  name: nullAsAbsent(z.string().max(100).describe('Tên cấu hình tin nhắn tự động')),
  triggerType: nullAsAbsent(
    z.enum(ChatAutoReplyTriggerType).describe('Loại kích hoạt: WELCOME, OFFLINE, KEYWORD, DEFAULT'),
  ),
  keyword: nullAsAbsent(z.string().max(100).describe('Từ khóa kích hoạt')),
  content: nullAsAbsent(z.string().max(1000).describe('Nội dung tin nhắn tự động')),
  isActive: nullAsAbsent(z.boolean().describe('Trạng thái kích hoạt')),
};

export const UpdateAutoReplySchema = z.object(updateAutoReplyFields).strict();

export type UpdateAutoReplyInput = z.infer<typeof UpdateAutoReplySchema>;

const cancelAutoReplyFields = {
  cancelReason: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe('Lý do Admin hủy/khóa tin nhắn tự động của Seller')
    .meta({ example: 'Nội dung chứa thông tin sai lệch hoặc vi phạm chính sách của sàn.' }),
};

export const CancelAutoReplySchema = z.object(cancelAutoReplyFields).strict();

export type CancelAutoReplyInput = z.infer<typeof CancelAutoReplySchema>;

const queryAutoRepliesFields = {
  page: z.coerce.number().int().min(1).describe('Trang hiện tại (bắt đầu từ 1)').default(1),
  limit: z.coerce.number().int().min(1).describe('Số lượng mục trên một trang').default(20),
  scope: nullAsAbsent(
    z.enum(ChatAutoReplyScope).describe('Phạm vi: SYSTEM (hệ thống/staff) hoặc SHOP (của seller)'),
  ),
  status: nullAsAbsent(
    z.enum(ChatAutoReplyStatus).describe('Trạng thái: ACTIVE hoặc CANCELLED_BY_ADMIN'),
  ),
  shopId: nullAsAbsent(z.string().describe('ID gian hàng / Seller cụ thể (dành cho Admin lọc)')),
};

export const QueryAutoRepliesSchema = z.object(queryAutoRepliesFields).strict();

export type QueryAutoRepliesInput = z.infer<typeof QueryAutoRepliesSchema>;
