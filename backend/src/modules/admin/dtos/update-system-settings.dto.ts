import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateSystemSettingsFields = {
  platformFeePercentage: nullAsAbsent(
    z
      .number()
      .min(0)
      .max(100)
      .describe('Tỷ lệ phần trăm hoa hồng / phí sàn thu từ người bán (%)')
      .meta({ example: 7.0 }),
  ),
  cartExpirationDays: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(90)
      .describe('Thời gian giỏ hàng không hoạt động trước khi hết hạn (ngày)')
      .meta({ example: 7 }),
  ),
  checkoutTimeoutMinutes: nullAsAbsent(
    z
      .number()
      .min(5)
      .max(120)
      .describe('Thời gian giữ tạm tồn kho khi người mua checkout (phút)')
      .meta({ example: 15 }),
  ),
  inventoryReservationTimeout: nullAsAbsent(
    z
      .number()
      .min(5)
      .max(240)
      .describe('Thời gian hết hạn khóa tồn kho reservation (phút)')
      .meta({ example: 30 }),
  ),
  maxActiveCartPerUser: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(5)
      .describe('Số lượng giỏ hàng hoạt động tối đa của mỗi người dùng')
      .meta({ example: 1 }),
  ),
  categoryMaxLevel: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(5)
      .describe('Độ sâu phân cấp tối đa của danh mục hàng hóa (cấp)')
      .meta({ example: 3 }),
  ),
  maxProductImages: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(20)
      .describe('Số lượng ảnh tối đa cho mỗi sản phẩm đăng bán')
      .meta({ example: 5 }),
  ),
  antiSnipingTriggerMinutes: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(30)
      .describe('Ngưỡng đếm ngược kích hoạt gia hạn chống bắn tỉa đấu giá (phút)')
      .meta({ example: 2 }),
  ),
  antiSnipingExtendMinutes: nullAsAbsent(
    z
      .number()
      .min(1)
      .max(30)
      .describe('Số phút gia hạn cộng thêm khi chống bắn tỉa kích hoạt (phút)')
      .meta({ example: 5 }),
  ),
};

export const UpdateSystemSettingsSchema = z.object(updateSystemSettingsFields).strict();

export type UpdateSystemSettingsInput = z.infer<typeof UpdateSystemSettingsSchema>;
