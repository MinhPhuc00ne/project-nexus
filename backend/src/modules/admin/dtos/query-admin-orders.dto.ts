import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';
import { OrderStatus } from '@prisma/client';

const queryAdminOrdersFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: nullAsAbsent(z.enum(OrderStatus)),
  search: nullAsAbsent(
    z.string().trim().max(200).describe('Order code, waybill code, or buyer/seller name or email'),
  ),
  sellerId: nullAsAbsent(z.string().max(100)),
  buyerId: nullAsAbsent(z.string().max(100)),
};

export const QueryAdminOrdersSchema = z.object(queryAdminOrdersFields).strict();

export type QueryAdminOrdersInput = z.infer<typeof QueryAdminOrdersSchema>;
