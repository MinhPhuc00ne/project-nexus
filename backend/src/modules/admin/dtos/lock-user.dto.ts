import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const lockUserFields = {
  reason: nullAsAbsent(
    z
      .string()
      .max(500)
      .describe('Reason for locking or unlocking the user account')
      .meta({ example: 'Policy violation or fraudulent transaction activity' }),
  ),
};

export const LockUserSchema = z.object(lockUserFields).strict();

export type LockUserInput = z.infer<typeof LockUserSchema>;

const updateUserStatusFields = {
  isLocked: nullAsAbsent(
    z
      .boolean()
      .describe('Account lock state: true (locked) or false (unlocked)')
      .meta({ example: true }),
  ),
  reason: nullAsAbsent(
    z
      .string()
      .max(500)
      .describe('Reason for updating account status')
      .meta({ example: 'Account locked following violation review' }),
  ),
};

export const UpdateUserStatusSchema = z.object(updateUserStatusFields).strict();

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>;
