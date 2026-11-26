import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const toggleSellerFields = {
  isSellerActive: nullAsAbsent(
    z
      .boolean()
      .describe(
        'Chế độ người bán (true: bật chế độ Seller, false: chuyển về chế độ Buyer). Nếu không truyền trường này, hệ thống sẽ tự động đảo trạng thái hiện tại.',
      )
      .meta({ example: true }),
  ),
};

export const ToggleSellerSchema = z.object(toggleSellerFields).strict();

export type ToggleSellerInput = z.infer<typeof ToggleSellerSchema>;
