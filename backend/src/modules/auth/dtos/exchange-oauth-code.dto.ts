import { z } from 'zod';

const exchangeOAuthCodeFields = {
  code: z
    .string()
    .trim()
    .min(1)
    .max(256)
    .describe('Mã opaque dùng một lần nhận được từ redirect của Google callback')
    .meta({ example: 'q1w2e3r4t5y6u7i8o9p0asdfghjklzxcvbnm1234567890ABCDEF' }),
};

export const ExchangeOAuthCodeSchema = z.object(exchangeOAuthCodeFields).strict();

export type ExchangeOAuthCodeInput = z.infer<typeof ExchangeOAuthCodeSchema>;
