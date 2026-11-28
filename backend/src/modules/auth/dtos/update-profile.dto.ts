import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateAuthProfileFields = {
  password: nullAsAbsent(z.string().describe('Current password for seller profile verification')),
  verificationToken: nullAsAbsent(
    z.string().describe('PROFILE_UPDATE token issued by reauthenticate (5-minute TTL)'),
  ),
  fullName: nullAsAbsent(
    z
      .string()
      .min(2)
      .max(100)
      .describe('User full name (2 to 100 characters)')
      .meta({ example: 'Nguyen Van A' }),
  ),
  phoneNumber: nullAsAbsent(
    z
      .string()
      .regex(/^\+?[0-9]{9,15}$/)
      .describe('Contact phone number (9 to 15 digits)')
      .meta({ example: '0912345678' }),
  ),
  avatarUrl: nullAsAbsent(
    z
      .string()
      .regex(/^https?:\/\/\S+$/i)
      .describe('Valid avatar image URL (http or https)')
      .meta({ example: 'https://example.com/avatar.jpg' }),
  ),
};

export const UpdateAuthProfileSchema = z.object(updateAuthProfileFields).strict();

export type UpdateAuthProfileInput = z.infer<typeof UpdateAuthProfileSchema>;

const reauthenticateProfileFields = {
  password: z.string().min(1).max(200).describe('Current password for profile verification'),
};

export const ReauthenticateProfileSchema = z.object(reauthenticateProfileFields).strict();

export type ReauthenticateProfileInput = z.infer<typeof ReauthenticateProfileSchema>;
