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
      .describe('Từ khóa tìm kiếm theo tên, email, sđt hoặc email công tác')
      .meta({ example: 'nguyen van a' }),
  ),
  role: nullAsAbsent(
    z
      .enum(AdminTargetRole)
      .describe(
        'Lọc theo vai trò: BUYER, SELLER, SUPPORT_STAFF, ADMIN (Mặc định không truyền sẽ lấy tất cả vai trò, tự động loại trừ GUEST)',
      )
      .meta({ example: AdminTargetRole.BUYER }),
  ),
  status: z
    .enum(UserStatusFilter)
    .describe('Lọc theo trạng thái tài khoản: ALL, ACTIVE, LOCKED')
    .default(UserStatusFilter.ALL),
  page: z.coerce.number().int().min(1).describe('Trang hiện tại (bắt đầu từ 1)').default(1),
  limit: z.coerce.number().int().min(1).describe('Số lượng người dùng trên mỗi trang').default(10),
};

export const QueryUsersSchema = z.object(queryUsersFields).strict();

export type QueryUsersInput = z.infer<typeof QueryUsersSchema>;
