import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateProductCategoryFields = {
  categoryId: z
    .string()
    .trim()
    .min(1)
    .describe('Target category ID to assign to the product')
    .meta({ example: 'uuid-category-id' }),
  reason: nullAsAbsent(
    z
      .string()
      .trim()
      .max(500)
      .describe('Note or reason for reassigning the category (sent to Seller)')
      .meta({ example: 'Reclassified to a more accurate product category' }),
  ),
};

export const UpdateProductCategorySchema = z.object(updateProductCategoryFields).strict();

export type UpdateProductCategoryInput = z.infer<typeof UpdateProductCategorySchema>;
