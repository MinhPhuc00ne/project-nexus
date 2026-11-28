import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateCategoryFields = {
  name: nullAsAbsent(
    z
      .string()
      .max(100)
      .describe('New product category name')
      .meta({ example: 'Gaming & Workstation Laptops' }),
  ),
  slug: nullAsAbsent(
    z.string().describe('New URL slug').meta({ example: 'gaming-workstation-laptops' }),
  ),
  parentId: nullAsAbsent(
    z
      .string()
      .nullable()
      .describe('New parent category ID (pass null to move to root level 1)')
      .meta({ example: 'cat-parent-uuid-456' }),
  ),
};

export const UpdateCategorySchema = z.object(updateCategoryFields).strict();

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
