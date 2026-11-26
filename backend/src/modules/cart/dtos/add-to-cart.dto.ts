import { z } from 'zod';

/**
 * What a shopper sends to put a product in their cart.
 *
 * The shape was a class of `class-validator` decorators, which meant the rules
 * lived in annotations the compiler could not read and were enforced by a
 * global pipe configured somewhere else entirely. As a schema the rules are the
 * type: `z.infer` is what the handler receives, so a field that is optional
 * here is optional there too.
 *
 * `.strict()` keeps the behaviour the global `ValidationPipe` gave with
 * `forbidNonWhitelisted`: a body carrying a field nobody asked for is rejected
 * rather than quietly trimmed.
 */
export const AddToCartSchema = z
  .object({
    /** Which product, as its id. */
    productId: z
      .string()
      .trim()
      .min(1, 'productId is required')
      .describe('ID của sản phẩm muốn thêm vào giỏ')
      .meta({ example: 'uuid-product-id' }),

    /**
     * How many to add. Sent as a string by form posts, so it is coerced the way
     * `@Type(() => Number)` used to.
     */
    quantity: z.coerce.number().int().min(1).describe('Số lượng mua').meta({ example: 1 }),

    /** The chosen variant, as option name to chosen value. */
    selections: z
      .record(z.string(), z.string())
      .optional()
      .meta({ example: { 'Màu sắc': 'Đen', Size: 'M' } }),
  })
  .strict();

export type AddToCartInput = z.infer<typeof AddToCartSchema>;
