import { z } from 'zod';
import { PaymentProvider } from '@prisma/client';

export const PayOrderSchema = z
  .object({
    provider: z
      .enum(PaymentProvider)
      .describe('Cổng thanh toán muốn sử dụng (PAYOS, WALLET, COD)')
      .default(PaymentProvider.PAYOS),
    returnUrl: z
      .string()
      .describe('URL chuyển hướng khi thanh toán thành công')
      .meta({ example: 'http://localhost:5173/payment/success' })
      .optional(),
    cancelUrl: z
      .string()
      .describe('URL chuyển hướng khi người dùng bấm hủy')
      .meta({ example: 'http://localhost:5173/payment/cancel' })
      .optional(),
  })
  .strict();

export type PayOrderInput = z.infer<typeof PayOrderSchema>;
