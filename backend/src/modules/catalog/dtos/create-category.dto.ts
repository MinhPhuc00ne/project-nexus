import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const createCategoryFields = {
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe('Tên danh mục hàng hóa')
    .meta({ example: 'Laptop & Máy tính xách tay' }),
  slug: nullAsAbsent(
    z
      .string()
      .describe('Đường dẫn định danh slug (nếu để trống hệ thống sẽ tự sinh từ tên)')
      .meta({ example: 'laptop-may-tinh-xach-tay' }),
  ),
  parentId: nullAsAbsent(
    z
      .string()
      .nullable()
      .describe('ID của danh mục cha (để trống nếu là danh mục gốc cấp 1)')
      .meta({ example: 'cat-parent-uuid-123' }),
  ),
};

export const CreateCategorySchema = z.object(createCategoryFields).strict();

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
