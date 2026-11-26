import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { PenaltyType, ViolationStatus } from '@prisma/client';

/** Bounds report queues and exposes the existing moderation lifecycle. */
const queryReportsFields = {
  status: nullAsAbsent(z.enum(ViolationStatus)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export const QueryReportsSchema = z.object(queryReportsFields).strict();

export type QueryReportsInput = z.infer<typeof QueryReportsSchema>;

/** Records an explicit, auditable report decision; financial refunds remain separate. */
const reviewReportFields = {
  status: z.enum(['INVESTIGATING', 'CONFIRMED', 'DISMISSED']),
  reason: z.string().min(5).max(2000).describe('Rationale retained in the moderation audit trail'),
  penaltyType: nullAsAbsent(
    z
      .enum([PenaltyType.FRAUD, PenaltyType.MISREPRESENTATION])
      .describe(
        'Admin-only confirmed fraud or counterfeit finding: minus 50 points and immediate suspension',
      ),
  ),
};

export const ReviewReportSchema = z.object(reviewReportFields).strict();

export type ReviewReportInput = z.infer<typeof ReviewReportSchema>;
