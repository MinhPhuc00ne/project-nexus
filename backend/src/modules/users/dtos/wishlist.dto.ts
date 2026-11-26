import { z } from 'zod';

const syncWishlistFields = {
  productIds: z
    .array(z.string())
    .max(100)
    .describe('List of guest product IDs to sync into the user account')
    .meta({ example: ['prod-uuid-1', 'prod-uuid-2'] }),
};

export const SyncWishlistSchema = z.object(syncWishlistFields).strict();

export type SyncWishlistInput = z.infer<typeof SyncWishlistSchema>;
