import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { AuctionStatus } from '@prisma/client';

/**
 * Filter and pagination parameters for auction listing queries.
 */
const auctionQueryFields = {
  status: nullAsAbsent(z.enum(AuctionStatus).describe('Filter auctions by operational state')),
  sellerId: nullAsAbsent(z.string().describe('Filter auctions by owner seller account identifier')),
  search: nullAsAbsent(z.string().describe('Search string for auction or product title')),
  page: z.coerce.number().min(1).describe('Target page number for pagination').default(1),
  limit: z.coerce.number().min(1).describe('Maximum item count per page').default(20),
};

export const AuctionQuerySchema = z.object(auctionQueryFields).strict();

export type AuctionQueryInput = z.infer<typeof AuctionQuerySchema>;
