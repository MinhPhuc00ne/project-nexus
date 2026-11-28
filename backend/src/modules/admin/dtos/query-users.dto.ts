import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

export enum UserStatusFilter {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
}

export enum AdminTargetRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  SUPPORT_STAFF = 'SUPPORT_STAFF',
  ADMIN = 'ADMIN',
}

const queryUsersFields = {
  search: nullAsAbsent(
    z
      .string()
      .describe('Search keyword by name, email, phone, or staff email')
      .meta({ example: 'jane doe' }),
  ),
  role: nullAsAbsent(
    z
      .enum(AdminTargetRole)
      .describe(
        'Filter by role: BUYER, SELLER, SUPPORT_STAFF, ADMIN (returns all non-GUEST roles when omitted)',
      )
      .meta({ example: AdminTargetRole.BUYER }),
  ),
  status: z
    .enum(UserStatusFilter)
    .describe('Filter by account status: ALL, ACTIVE, LOCKED')
    .default(UserStatusFilter.ALL),
  page: z.coerce.number().int().min(1).describe('Current page (1-based)').default(1),
  limit: z.coerce.number().int().min(1).describe('Users per page').default(10),
};

export const QueryUsersSchema = z.object(queryUsersFields).strict();

export type QueryUsersInput = z.infer<typeof QueryUsersSchema>;
