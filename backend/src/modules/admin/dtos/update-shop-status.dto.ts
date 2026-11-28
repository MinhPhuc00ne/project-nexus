import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateShopStatusFields = {
  isSellerActive: z
    .boolean()
    .describe('Shop operating state (true: active, false: suspended/frozen)')
    .meta({ example: false }),
  reason: nullAsAbsent(
    z
      .string()
      .max(500)
      .describe('Reason for suspending or reopening the shop (sent to Seller)')
      .meta({ example: 'Shop suspended due to repeated copyright-infringing listings' }),
  ),
};

export const UpdateShopStatusSchema = z.object(updateShopStatusFields).strict();

export type UpdateShopStatusInput = z.infer<typeof UpdateShopStatusSchema>;
