import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const queryShopFields = {
  search: nullAsAbsent(
    z
      .string()
      .describe('Từ khóa tìm kiếm theo tên gian hàng, mô tả hoặc tên chủ shop')
      .meta({ example: 'Hoàng Gia' }),
  ),
  city: nullAsAbsent(
    z.string().describe('Lọc shop theo tỉnh / thành phố').meta({ example: 'Hồ Chí Minh' }),
  ),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Số trang hiện tại')
    .meta({ example: 1 })
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Số lượng kết quả mỗi trang')
    .meta({ example: 12 })
    .default(12),
  sortBy: nullAsAbsent(
    z
      .enum(['reputation', 'newest', 'products_count'])
      .describe('Tiêu chí sắp xếp kết quả')
      .meta({ example: 'reputation' }),
  ),
};

export const QueryShopSchema = z.object(queryShopFields).strict();

export type QueryShopInput = z.infer<typeof QueryShopSchema>;
