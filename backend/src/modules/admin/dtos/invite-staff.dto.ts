import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const adminInviteStaffFields = {
  fullName: z.string().trim().min(1).describe('Staff full name').meta({ example: 'Alex Staff' }),
  email: z
    .email()
    .describe('Staff personal email to receive verification link')
    .meta({ example: 'staff.personal@gmail.com' }),
  phoneNumber: nullAsAbsent(
    z.string().describe('Staff phone number').meta({ example: '0912345678' }),
  ),
  department: nullAsAbsent(
    z.string().describe('Assigned department').meta({ example: 'Customer Support' }),
  ),
};

export const AdminInviteStaffSchema = z.object(adminInviteStaffFields).strict();

export type AdminInviteStaffInput = z.infer<typeof AdminInviteStaffSchema>;
