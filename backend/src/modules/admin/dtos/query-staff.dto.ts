import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const queryStaffFields = {
  search: nullAsAbsent(
    z.string().describe('Search keyword by full name or email').meta({ example: 'staff' }),
  ),
  page: z.coerce.number().int().min(1).describe('Current page (1-based)').default(1),
  limit: z.coerce.number().int().min(1).describe('Records per page').default(10),
};

export const QueryStaffSchema = z.object(queryStaffFields).strict();

export type QueryStaffInput = z.infer<typeof QueryStaffSchema>;
