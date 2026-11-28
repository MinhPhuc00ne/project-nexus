import { z } from 'zod';
import { PaymentProvider } from '@prisma/client';

export const PayOrderSchema = z
  .object({
    provider: z
      .enum(PaymentProvider)
      .describe('Payment provider (PAYOS, WALLET, COD)')
      .default(PaymentProvider.PAYOS),
    returnUrl: z
      .string()
      .describe('Redirect URL on successful payment')
      .meta({ example: 'http://localhost:5173/payment/success' })
      .optional(),
    cancelUrl: z
      .string()
      .describe('Redirect URL when payment is canceled')
      .meta({ example: 'http://localhost:5173/payment/cancel' })
      .optional(),
  })
  .strict();

export type PayOrderInput = z.infer<typeof PayOrderSchema>;
