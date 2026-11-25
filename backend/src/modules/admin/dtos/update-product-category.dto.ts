import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateProductCategoryFields = {
  categoryId: z
    .string()
    .trim()
    .min(1)
    .describe('ID danh mục mới muốn gắn cho sản phẩm')
    .meta({ example: 'uuid-category-id' }),
  reason: nullAsAbsent(
    z
      .string()
      .trim()
      .max(500)
      .describe('Ghi chú hoặc lý do gắn/đổi danh mục gửi tới Seller')
      .meta({ example: 'Phân loại lại vào danh mục mới phù hợp hơn với sản phẩm' }),
  ),
};

export const UpdateProductCategorySchema = z.object(updateProductCategoryFields).strict();

export type UpdateProductCategoryInput = z.infer<typeof UpdateProductCategorySchema>;
