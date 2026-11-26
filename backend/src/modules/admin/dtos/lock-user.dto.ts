import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const lockUserFields = {
  reason: nullAsAbsent(
    z
      .string()
      .max(500)
      .describe('Lý do khóa hoặc mở khóa tài khoản người dùng')
      .meta({ example: 'Vi phạm quy định giao dịch hoặc có hành vi gian lận' }),
  ),
};

export const LockUserSchema = z.object(lockUserFields).strict();

export type LockUserInput = z.infer<typeof LockUserSchema>;

const updateUserStatusFields = {
  isLocked: nullAsAbsent(
    z
      .boolean()
      .describe('Trạng thái khóa tài khoản: true (khóa) hoặc false (mở khóa)')
      .meta({ example: true }),
  ),
  reason: nullAsAbsent(
    z
      .string()
      .max(500)
      .describe('Lý do thay đổi trạng thái tài khoản')
      .meta({ example: 'Khóa tài khoản theo yêu cầu xử lý vi phạm' }),
  ),
};

export const UpdateUserStatusSchema = z.object(updateUserStatusFields).strict();

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>;
