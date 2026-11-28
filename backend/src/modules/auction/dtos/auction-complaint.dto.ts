import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

/**
 * Data transfer object for Seller or Buyer to submit an auction-related complaint request.
 */
const createAuctionComplaintFields = {
  auctionItemId: nullAsAbsent(z.uuid().describe('Related auction lot identifier (AuctionItem ID)')),
  reason: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .describe('Detailed complaint reason submitted to Admin')
    .meta({
      example: 'Winning buyer has not completed payment after the checkout deadline.',
    }),
  evidenceUrls: nullAsAbsent(
    z.array(z.string()).describe('Optional evidence image or document URLs'),
  ),
};

export const CreateAuctionComplaintSchema = z.object(createAuctionComplaintFields).strict();

export type CreateAuctionComplaintInput = z.infer<typeof CreateAuctionComplaintSchema>;

export enum ResolveAuctionComplaintDecision {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

/**
 * Data transfer object used by Admin to accept or reject an auction complaint request.
 */
const resolveAuctionComplaintFields = {
  status: z
    .enum(ResolveAuctionComplaintDecision)
    .describe('Admin decision on the complaint request')
    .meta({ example: ResolveAuctionComplaintDecision.ACCEPTED }),
  adminNote: nullAsAbsent(
    z
      .string()
      .max(1000)
      .describe('Optional resolution note sent back to the requester')
      .meta({ example: 'Complaint accepted and escalated to payment default processing.' }),
  ),
};

export const ResolveAuctionComplaintSchema = z.object(resolveAuctionComplaintFields).strict();

export type ResolveAuctionComplaintInput = z.infer<typeof ResolveAuctionComplaintSchema>;
