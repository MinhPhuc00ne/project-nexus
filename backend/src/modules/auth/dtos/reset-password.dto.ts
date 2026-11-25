import { z } from 'zod';

const resetPasswordFields = {
  email: z
    .email()
    .describe('Email cần đặt lại mật khẩu (Admin, Staff, Buyer, Seller)')
    .meta({ example: 'admin@nexus.com' }),
  code: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .max(6)
    .describe('Mã OTP 6 chữ số gửi qua email')
    .meta({ example: '123456' }),
  newPassword: z
    .string()
    .trim()
    .min(1)
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/)
    .describe('Mật khẩu mới (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 ký tự đặc biệt)')
    .meta({ example: 'NewPassword@123' }),
};

export const ResetPasswordSchema = z.object(resetPasswordFields).strict();

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
