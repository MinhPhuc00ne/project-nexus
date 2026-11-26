import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ChatContextType, ChatConversationStatus } from '@prisma/client';

/**
 * The ticket lifecycle is the conversation status column, re-exported under its
 * domain name so controllers and the Swagger schema stay readable.
 */
export const TicketLifecycleStatus = ChatConversationStatus;
export type TicketLifecycleStatus = ChatConversationStatus;

const requestSupportFields = {
  subject: nullAsAbsent(
    z
      .string()
      .max(200)
      .describe('Tiêu đề tóm tắt yêu cầu hỗ trợ')
      .meta({ example: 'Khiếu nại đơn hàng không nhận được' }),
  ),
  message: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .describe('Nội dung chi tiết yêu cầu hỗ trợ gửi đến nhân viên CSKH')
    .meta({
      example: 'Tôi đã thanh toán đơn hàng #ORD-123 nhưng người bán không gửi hàng theo hẹn.',
    }),
  contextId: nullAsAbsent(
    z
      .string()
      .describe('Mã định danh ngữ cảnh liên quan (mã tranh chấp, mã đơn hàng)')
      .meta({ example: 'dispute-uuid-456' }),
  ),
  contextType: z
    .enum(ChatContextType)
    .describe('Loại ngữ cảnh: DISPUTE (Tranh chấp), ORDER (Đơn hàng), GENERAL (Hỗ trợ chung)')
    .meta({ example: ChatContextType.DISPUTE })
    .default(ChatContextType.GENERAL),
  attachments: nullAsAbsent(
    z
      .array(z.string())
      .describe('Danh sách URL hình ảnh / bằng chứng đính kèm')
      .meta({ example: ['https://res.cloudinary.com/nexus/evidence1.jpg'] }),
  ),
};

export const RequestSupportSchema = z.object(requestSupportFields).strict();

export type RequestSupportInput = z.infer<typeof RequestSupportSchema>;

const updateConversationStatusFields = {
  status: z
    .enum(TicketLifecycleStatus)
    .describe('Trạng thái mới của cuộc trò chuyện / ticket hỗ trợ')
    .meta({ example: TicketLifecycleStatus.RESOLVED }),
  resolutionNotes: nullAsAbsent(
    z
      .string()
      .max(1000)
      .describe('Ghi chú giải quyết hoặc lý do đóng cuộc trò chuyện')
      .meta({ example: 'Đã hoàn tiền cho người mua thành công.' }),
  ),
};

export const UpdateConversationStatusSchema = z.object(updateConversationStatusFields).strict();

export type UpdateConversationStatusInput = z.infer<typeof UpdateConversationStatusSchema>;

const queryQueueFields = {
  page: z.coerce.number().int().min(1).describe('Trang hiện tại (bắt đầu từ 1)').default(1),
  limit: z.coerce.number().int().min(1).describe('Số lượng yêu cầu mỗi trang').default(20),
  contextType: nullAsAbsent(z.string().describe('Lọc theo loại ngữ cảnh: DISPUTE, ORDER, GENERAL')),
};

export const QueryQueueSchema = z.object(queryQueueFields).strict();

export type QueryQueueInput = z.infer<typeof QueryQueueSchema>;
