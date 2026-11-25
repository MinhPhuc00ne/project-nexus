import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { DisputeStatus } from '@prisma/client';

const queryAdminDisputesFields = {
  page: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Trang hiện tại (bắt đầu từ 1)')
    .meta({ example: 1 })
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Số lượng bản ghi trên mỗi trang (tối đa 100)')
    .meta({ example: 10 })
    .default(10),
  status: nullAsAbsent(
    z
      .enum(DisputeStatus)
      .describe(
        'Lọc theo trạng thái khiếu nại (OPEN, UNDER_REVIEW, RESOLVED_SELLER_FAVOR, RESOLVED_BUYER_FAVOR, CANCELLED)',
      ),
  ),
  search: nullAsAbsent(
    z
      .string()
      .describe(
        'Tìm kiếm theo mã khiếu nại (id), mã đơn hàng (orderId), lý do hoặc thông tin người liên quan',
      )
      .meta({ example: 'o1' }),
  ),
};

export const QueryAdminDisputesSchema = z.object(queryAdminDisputesFields).strict();

export type QueryAdminDisputesInput = z.infer<typeof QueryAdminDisputesSchema>;
