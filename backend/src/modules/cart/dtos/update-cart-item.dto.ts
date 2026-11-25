import { z } from 'zod';

/**
 * A new quantity for a line already in the cart.
 *
 * Zero is allowed and means remove the line, which is why the floor is 0 rather
 * than 1 as it is when adding.
 */
export const UpdateCartItemSchema = z
  .object({
    quantity: z.coerce
      .number()
      .int()
      .min(0)
      .describe('Số lượng mới của món hàng (nếu truyền 0 sẽ tự động xóa khỏi giỏ)')
      .meta({ example: 2 }),
  })
  .strict();

export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
