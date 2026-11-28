import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const createCategoryFields = {
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe('Product category name')
    .meta({ example: 'Laptops & Notebooks' }),
  slug: nullAsAbsent(
    z
      .string()
      .describe('URL slug (auto-generated from name if omitted)')
      .meta({ example: 'laptops-notebooks' }),
  ),
  parentId: nullAsAbsent(
    z
      .string()
      .nullable()
      .describe('Parent category ID (omit for root level 1 category)')
      .meta({ example: 'cat-parent-uuid-123' }),
  ),
};

export const CreateCategorySchema = z.object(createCategoryFields).strict();

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
