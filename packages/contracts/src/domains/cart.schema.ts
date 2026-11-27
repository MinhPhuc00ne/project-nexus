import { z } from 'zod';

export const AddToCartSchema = z
  .object({
    productId: z
      .string()
      .trim()
      .min(1, 'productId is required')
      .describe('ID of the product to add to the cart')
      .meta({ example: 'uuid-product-id' }),
    quantity: z.coerce.number().int().min(1).describe('Purchase quantity').meta({ example: 1 }),
    selections: z
      .record(z.string(), z.string())
      .optional()
      .meta({ example: { Color: 'Black', Size: 'M' } }),
  })
  .strict();

export type AddToCartInput = z.infer<typeof AddToCartSchema>;

export const UpdateCartItemSchema = z
  .object({
    quantity: z.coerce
      .number()
      .int()
      .min(0)
      .describe('Updated item quantity (passing 0 removes the item from the cart)')
      .meta({ example: 2 }),
  })
  .strict();

export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
