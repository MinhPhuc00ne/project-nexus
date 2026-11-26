import { z } from 'zod';
import { Role } from '@prisma/client';

const updateUserRoleFields = {
  role: z
    .enum(Role)
    .describe('Vai trò mới muốn gán cho tài khoản')
    .meta({ example: Role.SUPPORT_STAFF }),
};

export const UpdateUserRoleSchema = z.object(updateUserRoleFields).strict();

export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;
