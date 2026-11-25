import { z } from 'zod';

export const DepositWalletSchema = z
  .object({
    amount: z
      .number()
      .min(10000)
      .describe('Số tiền nạp vào ví cá nhân (VND, tối thiểu 10.000 VNĐ)')
      .meta({ example: 500000 }),
    description: z
      .string()
      .describe('Ghi chú lý do nạp tiền')
      .meta({ example: 'Nạp tiền vào ví NEXUS Pay để mua hàng' })
      .optional(),
    provider: z
      .enum(['PAYOS', 'DIRECT'])
      .describe('Phương thức nạp: PAYOS (tạo VietQR thanh toán) hoặc DIRECT (nạp thử nghiệm)')
      .default('PAYOS'),
  })
  .strict();

export type DepositWalletInput = z.infer<typeof DepositWalletSchema>;
