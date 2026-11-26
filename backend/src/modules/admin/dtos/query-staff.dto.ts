import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const queryStaffFields = {
  search: nullAsAbsent(
    z.string().describe('Từ khóa tìm kiếm theo họ tên hoặc email').meta({ example: 'staff' }),
  ),
  page: z.coerce.number().int().min(1).describe('Trang hiện tại (bắt đầu từ 1)').default(1),
  limit: z.coerce.number().int().min(1).describe('Số bản ghi trên mỗi trang').default(10),
};

export const QueryStaffSchema = z.object(queryStaffFields).strict();

export type QueryStaffInput = z.infer<typeof QueryStaffSchema>;
