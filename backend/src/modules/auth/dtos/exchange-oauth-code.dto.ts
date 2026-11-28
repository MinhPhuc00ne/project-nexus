import { z } from 'zod';

const exchangeOAuthCodeFields = {
  code: z
    .string()
    .trim()
    .min(1)
    .max(256)
    .describe('Single-use opaque code received from Google callback redirect')
    .meta({ example: 'q1w2e3r4t5y6u7i8o9p0asdfghjklzxcvbnm1234567890ABCDEF' }),
};

export const ExchangeOAuthCodeSchema = z.object(exchangeOAuthCodeFields).strict();

export type ExchangeOAuthCodeInput = z.infer<typeof ExchangeOAuthCodeSchema>;
