import { z } from 'zod';

const confirmChangePasswordOtpFields = {
  otp: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .max(6)
    .regex(/^[0-9]{6}$/)
    .describe('6-digit OTP verification code sent to email')
    .meta({ example: '123456' }),
  newPassword: z
    .string()
    .trim()
    .min(1)
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/)
    .describe('New password (min 8 chars, at least 1 uppercase and 1 special character)')
    .meta({ example: 'NewSecurePassword@2026' }),
};

export const ConfirmChangePasswordOtpSchema = z.object(confirmChangePasswordOtpFields).strict();

export type ConfirmChangePasswordOtpInput = z.infer<typeof ConfirmChangePasswordOtpSchema>;
