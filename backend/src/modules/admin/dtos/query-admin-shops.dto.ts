import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const queryAdminShopsFields = {
  page: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Số trang (mặc định 1)').meta({ example: 1 }),
  ),
  limit: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(1)
      .describe('Số lượng gian hàng mỗi trang (mặc định 10)')
      .meta({ example: 10 }),
  ),
  search: nullAsAbsent(
    z
      .string()
      .describe('Tìm kiếm theo tên gian hàng, mô tả hoặc tên/email/sđt chủ shop')
      .meta({ example: 'Gốm sứ' }),
  ),
  status: nullAsAbsent(
    z
      .enum(['ACTIVE', 'SUSPENDED'])
      .describe(
        'Lọc theo trạng thái hoạt động của gian hàng: ACTIVE (đang mở) hoặc SUSPENDED (bị đình chỉ)',
      ),
  ),
  city: nullAsAbsent(
    z
      .string()
      .describe('Lọc theo Tỉnh / Thành phố của gian hàng')
      .meta({ example: 'TP. Hồ Chí Minh' }),
  ),
};

export const QueryAdminShopsSchema = z.object(queryAdminShopsFields).strict();

export type QueryAdminShopsInput = z.infer<typeof QueryAdminShopsSchema>;
