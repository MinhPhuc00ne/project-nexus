import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const QuerySellerOrdersSchema = z
  .object({
    status: z.enum(OrderStatus).describe('Lọc theo trạng thái đơn hàng').optional(),
    search: z.string().describe('Tìm kiếm theo mã đơn, tên hoặc SĐT người mua').optional(),
    page: z.coerce.number().int().min(1).describe('Số trang (bắt đầu từ 1)').default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .describe('Số lượng đơn mỗi trang (1 - 100)')
      .default(10),
  })
  .strict();

export type QuerySellerOrdersInput = z.infer<typeof QuerySellerOrdersSchema>;
