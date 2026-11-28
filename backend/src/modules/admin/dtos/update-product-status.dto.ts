import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { ProductStatus } from '@prisma/client';

const updateProductStatusFields = {
  status: z
    .enum(ProductStatus)
    .describe('Target product status (ACTIVE: visible for sale, INACTIVE: hidden/locked)')
    .meta({ example: ProductStatus.INACTIVE }),
  reason: nullAsAbsent(
    z
      .string()
      .max(500)
      .describe('Reason for status change or notice to Seller')
      .meta({ example: 'Product violates community guidelines or contains sensitive content' }),
  ),
};

export const UpdateProductStatusSchema = z.object(updateProductStatusFields).strict();

export type UpdateProductStatusInput = z.infer<typeof UpdateProductStatusSchema>;
