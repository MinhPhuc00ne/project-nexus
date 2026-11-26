import { z } from 'zod';
import { booleanFromQuery, nullAsAbsent } from '../../../core/validation/query-schemas';
import { ProductStatus } from '@prisma/client';

const queryProductFields = {
  city: nullAsAbsent(
    z.string().max(100).describe('Filter by seller city/province').meta({ example: 'Ho Chi Minh' }),
  ),
  minRating: nullAsAbsent(
    z.coerce
      .number()
      .min(0)
      .max(5)
      .describe('Filter by minimum average product rating (0-5)')
      .meta({ example: 4 }),
  ),
  inStock: nullAsAbsent(
    z
      .enum(['true', 'false'])
      .describe('Filter by stock availability (true = in stock only, false = out of stock only)')
      .meta({ example: 'true' }),
  ),
  trendingOnly: nullAsAbsent(
    booleanFromQuery
      .describe(
        'Filter only trending products (have qualifying purchases and are not excluded from trending)',
      )
      .meta({ example: true }),
  ),
  minPurchaseCount: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(0)
      .describe('Filter products with at least this minimum qualifying purchase count')
      .meta({ example: 1 }),
  ),
  search: nullAsAbsent(
    z
      .string()
      .describe('Search keyword matching product title, description, or shop name')
      .meta({ example: 'Audemars' }),
  ),
  categoryId: nullAsAbsent(
    z.string().describe('Filter by category ID').meta({ example: 'uuid-category-id' }),
  ),
  sellerId: nullAsAbsent(
    z.string().describe('Filter by seller ID').meta({ example: 'uuid-seller-id' }),
  ),
  status: nullAsAbsent(z.enum(ProductStatus).meta({ example: ProductStatus.ACTIVE })),
  minPrice: nullAsAbsent(
    z.coerce.number().min(0).describe('Minimum effective price').meta({ example: 1000000 }),
  ),
  maxPrice: nullAsAbsent(
    z.coerce.number().min(0).describe('Maximum effective price').meta({ example: 500000000 }),
  ),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Page number (1-indexed)')
    .meta({ example: 1 })
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .describe('Items per page (1-100)')
    .meta({ example: 12 })
    .default(12),
  sortBy: nullAsAbsent(
    z
      .enum(['newest', 'price_asc', 'price_desc', 'best_selling', 'trending', 'top_rated'])
      .describe('Sort order for product results')
      .meta({ example: 'newest' }),
  ),
};

export const QueryProductSchema = z.object(queryProductFields).strict();

export type QueryProductInput = z.infer<typeof QueryProductSchema>;
