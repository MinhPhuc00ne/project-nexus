import { z } from 'zod';

/**
 * Data transfer object for approving an administrative store appeal and restoring account standing.
 */
const resolveShopAppealFields = {
  reason: z
    .string()
    .trim()
    .min(1)
    .describe('Detailed explanation and justification for approving the merchant appeal')
    .meta({ example: 'Accepted delivery logistics incident justification for order #ord_123' }),
  restoredScore: z
    .number()
    .int()
    .min(50)
    .max(2147483647)
    .describe('Target reputation score to restore (defaults to 100, GOOD tier)')
    .meta({ example: 60 })
    .default(100),
};

export const ResolveShopAppealSchema = z.object(resolveShopAppealFields).strict();

export type ResolveShopAppealInput = z.infer<typeof ResolveShopAppealSchema>;
