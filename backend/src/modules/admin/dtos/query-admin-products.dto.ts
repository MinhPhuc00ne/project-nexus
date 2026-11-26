import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ProductStatus } from '@prisma/client';

const queryAdminProductsFields = {
  page: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Số trang (mặc định 1)').meta({ example: 1 }),
  ),
  limit: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(1)
      .describe('Số lượng sản phẩm mỗi trang (mặc định 10)')
      .meta({ example: 10 }),
  ),
  search: nullAsAbsent(
    z
      .string()
      .describe('Từ khóa tìm kiếm theo tên sản phẩm hoặc tên/email người bán')
      .meta({ example: 'đồng hồ' }),
  ),
  status: nullAsAbsent(
    z.enum(ProductStatus).describe('Lọc theo trạng thái sản phẩm: ACTIVE, INACTIVE, DRAFT'),
  ),
  sellerId: nullAsAbsent(z.string().describe('Lọc theo ID người bán (Seller ID)')),
  categoryId: nullAsAbsent(z.string().describe('Lọc theo ID danh mục (Category ID)')),
};

export const QueryAdminProductsSchema = z.object(queryAdminProductsFields).strict();

export type QueryAdminProductsInput = z.infer<typeof QueryAdminProductsSchema>;
