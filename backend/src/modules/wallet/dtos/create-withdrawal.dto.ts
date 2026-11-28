import { z } from 'zod';

export const CreateWithdrawalSchema = z
  .object({
    amount: z.coerce
      .number()
      .min(1)
      .describe('Withdrawal amount (VND, must be greater than 0)')
      .meta({ example: 50000 }),
    bankName: z
      .string()
      .describe(
        'Beneficiary bank name (e.g., Vietcombank, MB Bank). Defaults to user profile bank if omitted.',
      )
      .meta({ example: 'Vietcombank' })
      .optional(),
    accountNumber: z
      .string()
      .describe('Beneficiary bank account number. Defaults to user profile if omitted.')
      .meta({ example: '1029384756' })
      .optional(),
    accountHolderName: z
      .string()
      .describe('Beneficiary account holder full name. Defaults to user profile if omitted.')
      .meta({ example: 'NGUYEN VAN A' })
      .optional(),
    note: z
      .string()
      .describe('Optional seller withdrawal note')
      .meta({ example: 'October sales payout withdrawal' })
      .optional(),
  })
  .strict();

export type CreateWithdrawalInput = z.infer<typeof CreateWithdrawalSchema>;
