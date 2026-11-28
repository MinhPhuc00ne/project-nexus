import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { DisputeStatus } from '@prisma/client';

const querySellerReviewsFields = {
  rating: nullAsAbsent(
    z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .describe('Filter by star rating (1 - 5)')
      .meta({ example: 5 }),
  ),
  sortBy: z
    .enum(['newest', 'oldest'])
    .describe('Sort reviews by newest or oldest')
    .default('newest'),
  page: z.coerce.number().int().min(1).describe('Page number (1-based)').default(1),
  limit: z.coerce.number().int().min(1).max(100).describe('Reviews per page (1 - 100)').default(10),
};

export const QuerySellerReviewsSchema = z.object(querySellerReviewsFields).strict();

export type QuerySellerReviewsInput = z.infer<typeof QuerySellerReviewsSchema>;

const querySellerDisputesFields = {
  status: nullAsAbsent(z.enum(DisputeStatus).describe('Filter by dispute status')),
  page: z.coerce.number().int().min(1).describe('Page number (1-based)').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .describe('Disputes per page (1 - 100)')
    .default(10),
};

export const QuerySellerDisputesSchema = z.object(querySellerDisputesFields).strict();

export type QuerySellerDisputesInput = z.infer<typeof QuerySellerDisputesSchema>;

const respondDisputeFields = {
  responseNotes: z.string().trim().min(1).describe('Seller response and explanation notes').meta({
    example: 'The item was packed accurately and handed over to GHN with an intact seal.',
  }),
  evidenceUrls: nullAsAbsent(
    z
      .array(z.string())
      .describe('List of seller supporting image or video URLs')
      .meta({ example: ['https://storage.nexus.vn/evidence/pack_proof_1.jpg'] }),
  ),
};

export const RespondDisputeSchema = z.object(respondDisputeFields).strict();

export type RespondDisputeInput = z.infer<typeof RespondDisputeSchema>;
