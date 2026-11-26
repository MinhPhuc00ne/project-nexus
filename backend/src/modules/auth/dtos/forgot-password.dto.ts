import { z } from 'zod';

const forgotPasswordFields = {
  email: z
    .email()
    .describe(
      'Email đã đăng ký trong hệ thống để nhận mã OTP đặt lại mật khẩu (Admin, Staff, Buyer, Seller)',
    )
    .meta({ example: 'admin@nexus.com' }),
};

export const ForgotPasswordSchema = z.object(forgotPasswordFields).strict();

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
