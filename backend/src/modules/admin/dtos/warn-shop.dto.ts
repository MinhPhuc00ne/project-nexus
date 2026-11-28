import { z } from 'zod';

const warnShopFields = {
  reason: z
    .string()
    .trim()
    .min(1)
    .describe('Reason for warning the shop')
    .meta({ example: 'Published misleading product specifications' }),
  penaltyPoints: z
    .number()
    .min(0)
    .describe('Reputation score penalty points to deduct (if any)')
    .meta({ example: 10 })
    .default(0),
};

export const WarnShopSchema = z.object(warnShopFields).strict();

export type WarnShopInput = z.infer<typeof WarnShopSchema>;
