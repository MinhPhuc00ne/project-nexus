import { z } from 'zod';
import { httpUrl, nullAsAbsent } from '../../../core/validation/query-schemas';

const updateStaffProfileFields = {
  fullName: nullAsAbsent(z.string().trim().min(2).max(100)),
  phoneNumber: z
    .string()
    .regex(/^\+?[0-9]{9,15}$/)
    .nullable()
    .optional(),
  avatarUrl: httpUrl.nullable().optional(),
};

export const UpdateStaffProfileSchema = z.object(updateStaffProfileFields).strict();

export type UpdateStaffProfileInput = z.infer<typeof UpdateStaffProfileSchema>;
