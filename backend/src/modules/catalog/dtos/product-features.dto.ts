import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const productOptionFields = {
  name: z.string().min(1).max(40).meta({ example: 'Color' }),
  values: z
    .array(z.string().min(1).max(80))
    .min(1)
    .max(50)
    .meta({ example: ['Black', 'White'] }),
};

export const ProductOptionSchema = z.object(productOptionFields).strict();

export type ProductOptionInput = z.infer<typeof ProductOptionSchema>;

const updateProductSaleFields = {
  salePrice: nullAsAbsent(
    z.coerce
      .number()
      .min(1000)
      .nullable()
      .describe('Sale price; pass null to stop sale')
      .meta({ example: 150000 }),
  ),
  saleStartsAt: z.iso.datetime().nullable().optional(),
  saleEndsAt: z.iso.datetime().nullable().optional(),
};

export const UpdateProductSaleSchema = z.object(updateProductSaleFields).strict();

export type UpdateProductSaleInput = z.infer<typeof UpdateProductSaleSchema>;
