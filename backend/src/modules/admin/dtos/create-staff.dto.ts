import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const createStaffFields = {
  email: z
    .email()
    .describe('Personal email to receive the @staff.com account and generated password')
    .meta({ example: 'support.personal@gmail.com' }),
  fullName: z.string().trim().min(1).describe('Staff full name').meta({ example: 'Alex Support' }),
  phoneNumber: nullAsAbsent(
    z.string().describe('Staff phone number').meta({ example: '0987654321' }),
  ),
  department: nullAsAbsent(
    z.string().describe('Assigned department').meta({ example: 'Customer Support' }),
  ),
  password: nullAsAbsent(
    z
      .string()
      .describe(
        'Legacy field accepted but ignored; backend always generates a random password and sends it to the personal email',
      )
      .meta({ example: 'Staff@123456' }),
  ),
};

export const CreateStaffSchema = z.object(createStaffFields).strict();

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
