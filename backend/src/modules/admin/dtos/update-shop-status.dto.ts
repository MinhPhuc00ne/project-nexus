import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateShopStatusFields = {
  isSellerActive: z
    .boolean()
    .describe(
      'Trạng thái hoạt động của gian hàng (true: mở bán bình thường, false: đình chỉ/đóng băng gian hàng)',
    )
    .meta({ example: false }),
  reason: nullAsAbsent(
    z
      .string()
      .max(500)
      .describe('Lý do đình chỉ hoặc mở lại gian hàng gửi đến người bán')
      .meta({ example: 'Gian hàng bị tạm dừng do nhiều lần đăng sản phẩm vi phạm bản quyền' }),
  ),
};

export const UpdateShopStatusSchema = z.object(updateShopStatusFields).strict();

export type UpdateShopStatusInput = z.infer<typeof UpdateShopStatusSchema>;
