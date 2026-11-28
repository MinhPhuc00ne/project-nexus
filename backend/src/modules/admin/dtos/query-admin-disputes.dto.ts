import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { DisputeStatus } from '@prisma/client';

const queryAdminDisputesFields = {
  page: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Current page (1-based)')
    .meta({ example: 1 })
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .describe('Records per page (max 100)')
    .meta({ example: 10 })
    .default(10),
  status: nullAsAbsent(
    z
      .enum(DisputeStatus)
      .describe(
        'Filter by dispute status (OPEN, UNDER_REVIEW, RESOLVED_SELLER_FAVOR, RESOLVED_BUYER_FAVOR, CANCELLED)',
      ),
  ),
  search: nullAsAbsent(
    z
      .string()
      .describe('Search by dispute ID, orderId, reason, or participant details')
      .meta({ example: 'o1' }),
  ),
};

export const QueryAdminDisputesSchema = z.object(queryAdminDisputesFields).strict();

export type QueryAdminDisputesInput = z.infer<typeof QueryAdminDisputesSchema>;
