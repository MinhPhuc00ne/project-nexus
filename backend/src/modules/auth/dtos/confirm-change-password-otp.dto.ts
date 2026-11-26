import { z } from 'zod';

const confirmChangePasswordOtpFields = {
  otp: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .max(6)
    .regex(/^[0-9]{6}$/)
    .describe('Mã xác thực OTP gồm đúng 6 chữ số gửi qua Gmail')
    .meta({ example: '123456' }),
  newPassword: z
    .string()
    .trim()
    .min(1)
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/)
    .describe('Mật khẩu mới (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 ký tự đặc biệt)')
    .meta({ example: 'NewSecurePassword@2026' }),
};

export const ConfirmChangePasswordOtpSchema = z.object(confirmChangePasswordOtpFields).strict();

export type ConfirmChangePasswordOtpInput = z.infer<typeof ConfirmChangePasswordOtpSchema>;
