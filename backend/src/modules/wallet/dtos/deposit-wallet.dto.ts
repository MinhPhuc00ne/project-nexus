import { z } from 'zod';

export const DepositWalletSchema = z
  .object({
    amount: z
      .number()
      .min(10000)
      .describe('Top-up amount for personal wallet (VND, minimum 10,000 VND)')
      .meta({ example: 500000 }),
    description: z
      .string()
      .describe('Optional deposit note')
      .meta({ example: 'Top up NEXUS Pay wallet for shopping' })
      .optional(),
    provider: z
      .enum(['PAYOS', 'DIRECT'])
      .describe('Deposit method: PAYOS (VietQR link) or DIRECT (test top-up)')
      .default('PAYOS'),
  })
  .strict();

export type DepositWalletInput = z.infer<typeof DepositWalletSchema>;
