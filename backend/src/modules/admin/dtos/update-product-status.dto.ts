import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ProductStatus } from '@prisma/client';

const updateProductStatusFields = {
  status: z
    .enum(ProductStatus)
    .describe('Trạng thái sản phẩm mong muốn (ACTIVE: hiển thị bán, INACTIVE: ẩn/khóa)')
    .meta({ example: ProductStatus.INACTIVE }),
  reason: nullAsAbsent(
    z
      .string()
      .max(500)
      .describe('Lý do thay đổi trạng thái hoặc nhắc nhở dành cho Seller')
      .meta({ example: 'Sản phẩm vi phạm tiêu chuẩn cộng đồng hoặc chứa nội dung nhạy cảm' }),
  ),
};

export const UpdateProductStatusSchema = z.object(updateProductStatusFields).strict();

export type UpdateProductStatusInput = z.infer<typeof UpdateProductStatusSchema>;
