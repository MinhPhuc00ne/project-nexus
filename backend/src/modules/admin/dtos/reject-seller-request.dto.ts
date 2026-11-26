import { z } from 'zod';

const rejectSellerRequestFields = {
  rejectionReason: z
    .string()
    .trim()
    .min(1)
    .describe('Lý do từ chối yêu cầu nâng cấp')
    .meta({ example: 'Thông tin giấy tờ CCCD/CMND không khớp với tên đăng ký tài khoản.' }),
};

export const RejectSellerRequestSchema = z.object(rejectSellerRequestFields).strict();

export type RejectSellerRequestInput = z.infer<typeof RejectSellerRequestSchema>;
