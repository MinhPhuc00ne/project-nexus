import { z } from 'zod';

/** One line of the cart a guest built before signing in. */
export const MergeCartItemSchema = z
  .object({
    productId: z.string().trim().min(1, 'productId is required'),
    quantity: z.coerce.number().int().min(1),
    selections: z.record(z.string(), z.string()).optional(),
  })
  .strict();

/**
 * The cart a guest built in their browser, handed over on sign-in.
 *
 * The cap of 100 lines is what `@ArrayMaxSize(100)` enforced: this body comes
 * from local storage, so its length is whatever the client says it is.
 */
export const MergeCartSchema = z
  .object({
    items: z
      .array(MergeCartItemSchema)
      .max(100)
      .describe('Danh sách các sản phẩm và số lượng lưu tạm từ LocalStorage của Guest'),
  })
  .strict();

export type MergeCartItemInput = z.infer<typeof MergeCartItemSchema>;
export type MergeCartInput = z.infer<typeof MergeCartSchema>;
