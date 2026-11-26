import { z } from 'zod';

export const AddToCartSchema = z
  .object({
    productId: z
      .string()
      .trim()
      .min(1, 'productId is required')
      .describe('ID của sản phẩm muốn thêm vào giỏ')
      .meta({ example: 'uuid-product-id' }),
    quantity: z.coerce.number().int().min(1).describe('Số lượng mua').meta({ example: 1 }),
    selections: z
      .record(z.string(), z.string())
      .optional()
      .meta({ example: { 'Màu sắc': 'Đen', Size: 'M' } }),
  })
  .strict();

export type AddToCartInput = z.infer<typeof AddToCartSchema>;

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
