import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const queryAdminShopsFields = {
  page: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Page number (default 1)').meta({ example: 1 }),
  ),
  limit: nullAsAbsent(
    z.coerce.number().int().min(1).describe('Shops per page (default 10)').meta({ example: 10 }),
  ),
  search: nullAsAbsent(
    z
      .string()
      .describe('Search by shop name, description, or owner name/email/phone')
      .meta({ example: 'Ceramic' }),
  ),
  status: nullAsAbsent(
    z.enum(['ACTIVE', 'SUSPENDED']).describe('Filter by shop status: ACTIVE or SUSPENDED'),
  ),
  city: nullAsAbsent(
    z.string().describe('Filter by shop province or city').meta({ example: 'Ho Chi Minh City' }),
  ),
};

export const QueryAdminShopsSchema = z.object(queryAdminShopsFields).strict();

export type QueryAdminShopsInput = z.infer<typeof QueryAdminShopsSchema>;
