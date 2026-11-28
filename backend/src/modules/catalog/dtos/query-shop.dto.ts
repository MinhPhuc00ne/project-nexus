import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const queryShopFields = {
  search: nullAsAbsent(
    z
      .string()
      .describe('Search keyword by shop name, description, or owner name')
      .meta({ example: 'Royal' }),
  ),
  city: nullAsAbsent(
    z.string().describe('Filter shops by province or city').meta({ example: 'Ho Chi Minh' }),
  ),
  page: z.coerce.number().int().min(1).describe('Current page').meta({ example: 1 }).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Results per page')
    .meta({ example: 12 })
    .default(12),
  sortBy: nullAsAbsent(
    z
      .enum(['reputation', 'newest', 'products_count'])
      .describe('Sort order')
      .meta({ example: 'reputation' }),
  ),
};

export const QueryShopSchema = z.object(queryShopFields).strict();

export type QueryShopInput = z.infer<typeof QueryShopSchema>;
