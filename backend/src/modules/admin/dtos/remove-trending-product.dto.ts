import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const removeTrendingProductFields = {
  reason: nullAsAbsent(
    z
      .string()
      .trim()
      .max(500)
      .describe('Lý do Admin gỡ sản phẩm khỏi danh sách Xu hướng (gửi thông báo tới Seller)')
      .meta({ example: 'Sản phẩm không còn phù hợp hiển thị tại mục Xu hướng' }),
  ),
};

export const RemoveTrendingProductSchema = z.object(removeTrendingProductFields).strict();

export type RemoveTrendingProductInput = z.infer<typeof RemoveTrendingProductSchema>;
