import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { SellerRequestStatus } from '@prisma/client';

const querySellerRequestsFields = {
  status: nullAsAbsent(
    z.enum(SellerRequestStatus).describe('Filter by request status (PENDING, APPROVED, REJECTED)'),
  ),
  page: z.coerce.number().int().min(1).describe('Current page (1-based)').default(1),
  limit: z.coerce.number().int().min(1).describe('Records per page').default(10),
};

export const QuerySellerRequestsSchema = z.object(querySellerRequestsFields).strict();

export type QuerySellerRequestsInput = z.infer<typeof QuerySellerRequestsSchema>;
