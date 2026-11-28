import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ProductStatus } from '@prisma/client';

const queryAdminProductsFields = {
  page: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Page number (default 1)').meta({ example: 1 }),
  ),
  limit: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Products per page (default 10)').meta({ example: 10 }),
  ),
  search: nullAsAbsent(
    z
      .string()
      .describe('Search keyword by product title or seller name/email')
      .meta({ example: 'watch' }),
  ),
  status: nullAsAbsent(
    z.enum(ProductStatus).describe('Filter by product status: ACTIVE, INACTIVE, DRAFT'),
  ),
  sellerId: nullAsAbsent(z.string().describe('Filter by seller ID')),
  categoryId: nullAsAbsent(z.string().describe('Filter by category ID')),
};

export const QueryAdminProductsSchema = z.object(queryAdminProductsFields).strict();

export type QueryAdminProductsInput = z.infer<typeof QueryAdminProductsSchema>;
