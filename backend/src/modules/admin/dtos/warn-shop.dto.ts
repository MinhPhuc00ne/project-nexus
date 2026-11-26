import { z } from 'zod';

const warnShopFields = {
  reason: z
    .string()
    .trim()
    .min(1)
    .describe('Lý do cảnh cáo gian hàng')
    .meta({ example: 'Đăng tải thông tin sản phẩm sai lệch với thực tế' }),
  penaltyPoints: z
    .number()
    .min(0)
    .describe('Số điểm uy tín (reputationScore) bị trừ kèm theo (nếu có)')
    .meta({ example: 10 })
    .default(0),
};

export const WarnShopSchema = z.object(warnShopFields).strict();

export type WarnShopInput = z.infer<typeof WarnShopSchema>;
