import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { SellerRequestStatus } from '@prisma/client';

const querySellerRequestsFields = {
  status: nullAsAbsent(
    z
      .enum(SellerRequestStatus)
      .describe('Lọc theo trạng thái yêu cầu (PENDING, APPROVED, REJECTED)'),
  ),
  page: z.coerce.number().int().min(1).describe('Trang hiện tại (bắt đầu từ 1)').default(1),
  limit: z.coerce.number().int().min(1).describe('Số bản ghi trên mỗi trang').default(10),
};

export const QuerySellerRequestsSchema = z.object(querySellerRequestsFields).strict();

export type QuerySellerRequestsInput = z.infer<typeof QuerySellerRequestsSchema>;
