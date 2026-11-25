import { z } from 'zod';

export const CreateWithdrawalSchema = z
  .object({
    amount: z.coerce
      .number()
      .min(1)
      .describe('Số tiền muốn rút (VND, phải lớn hơn 0)')
      .meta({ example: 50000 }),
    bankName: z
      .string()
      .describe(
        'Tên ngân hàng thụ hưởng (e.g., Vietcombank, MB Bank). Nếu để trống sẽ lấy từ Hồ sơ cá nhân.',
      )
      .meta({ example: 'Vietcombank' })
      .optional(),
    accountNumber: z
      .string()
      .describe('Số tài khoản ngân hàng thụ hưởng. Nếu để trống sẽ lấy từ Hồ sơ cá nhân.')
      .meta({ example: '1029384756' })
      .optional(),
    accountHolderName: z
      .string()
      .describe('Họ và tên chủ tài khoản thụ hưởng. Nếu để trống sẽ lấy từ Hồ sơ cá nhân.')
      .meta({ example: 'NGUYEN VAN A' })
      .optional(),
    note: z
      .string()
      .describe('Ghi chú thêm của người bán')
      .meta({ example: 'Rút tiền doanh thu bán hàng tháng 10' })
      .optional(),
  })
  .strict();

export type CreateWithdrawalInput = z.infer<typeof CreateWithdrawalSchema>;
