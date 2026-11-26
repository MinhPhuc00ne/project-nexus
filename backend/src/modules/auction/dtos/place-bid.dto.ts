import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

/**
 * Data transfer object for submitting a bid on a specific auction lot.
 */
const placeBidFields = {
  auctionItemId: nullAsAbsent(z.uuid().describe('Target auction lot identifier (AuctionItem ID)')),
  bidAmount: z.coerce
    .number()
    .min(1000)
    .describe('Submitted bid amount in VND currency')
    .meta({ example: 125000000 }),
};

export const PlaceBidSchema = z.object(placeBidFields).strict();

export type PlaceBidInput = z.infer<typeof PlaceBidSchema>;
