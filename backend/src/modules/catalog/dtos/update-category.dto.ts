import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateCategoryFields = {
  name: nullAsAbsent(
    z
      .string()
      .max(100)
      .describe('Tên danh mục hàng hóa mới')
      .meta({ example: 'Laptop Gaming & Workstation' }),
  ),
  slug: nullAsAbsent(
    z
      .string()
      .describe('Đường dẫn định danh slug mới')
      .meta({ example: 'laptop-gaming-workstation' }),
  ),
  parentId: nullAsAbsent(
    z
      .string()
      .nullable()
      .describe('ID của danh mục cha mới (truyền null nếu muốn đưa về danh mục gốc cấp 1)')
      .meta({ example: 'cat-parent-uuid-456' }),
  ),
};

export const UpdateCategorySchema = z.object(updateCategoryFields).strict();

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
