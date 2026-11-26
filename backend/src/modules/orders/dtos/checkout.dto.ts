import { z } from 'zod';
import { PaymentProvider } from '@prisma/client';

export const ShippingAddressSchema = z
  .object({
    country: z.enum(['VN']).default('VN'),
    recipientName: z
      .string()
      .trim()
      .min(1)
      .describe('Họ tên người nhận')
      .meta({ example: 'Nguyễn Văn A' }),
    phone: z
      .string()
      .trim()
      .min(1)
      .describe('Số điện thoại người nhận')
      .meta({ example: '0987654321' }),
    city: z.string().trim().min(1).describe('Tỉnh/Thành phố').meta({ example: 'TP. Hồ Chí Minh' }),
    district: z.string().describe('Quận/Huyện').meta({ example: 'Quận 1' }).optional(),
    ward: z.string().describe('Phường/Xã').meta({ example: 'Phường Bến Nghé' }).optional(),
    street: z
      .string()
      .trim()
      .min(1)
      .describe('Địa chỉ đường/số nhà cụ thể')
      .meta({ example: '123 Lê Lợi' }),
  })
  .strict();

export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;

export const CheckoutSchema = z
  .object({
    shippingAddress: ShippingAddressSchema.describe('Thông tin địa chỉ giao hàng'),
    itemIds: z
      .array(z.string())
      .describe(
        'Danh sách ID các CartItem muốn thanh toán (nếu bỏ trống sẽ thanh toán toàn bộ giỏ)',
      )
      .meta({ example: ['item-uuid-1', 'item-uuid-2'] })
      .optional(),
    shippingFee: z
      .number()
      .min(0)
      .describe('Chỉ giữ tương thích request cũ. Backend bỏ qua giá trị này và lấy phí từ GHN.')
      .optional(),
    paymentMethod: z
      .enum(PaymentProvider)
      .describe('Phương thức thanh toán khởi tạo ban đầu')
      .meta({ example: PaymentProvider.PAYOS })
      .default(PaymentProvider.PAYOS),
    returnUrl: z
      .string()
      .describe('URL chuyển hướng khi thanh toán thành công trên PayOS')
      .meta({ example: 'http://localhost:5173/payment/success' })
      .optional(),
    cancelUrl: z
      .string()
      .describe('URL chuyển hướng khi người dùng hủy trên trang PayOS')
      .meta({ example: 'http://localhost:5173/payment/cancel' })
      .optional(),
  })
  .strict();

export type CheckoutInput = z.infer<typeof CheckoutSchema>;
