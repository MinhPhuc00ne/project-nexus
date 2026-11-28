import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const removeTrendingProductFields = {
  reason: nullAsAbsent(
    z
      .string()
      .trim()
      .max(500)
      .describe('Reason for removing the product from Trending (notifies the Seller)')
      .meta({ example: 'Product is no longer eligible for the Trending section' }),
  ),
};

export const RemoveTrendingProductSchema = z.object(removeTrendingProductFields).strict();

export type RemoveTrendingProductInput = z.infer<typeof RemoveTrendingProductSchema>;
