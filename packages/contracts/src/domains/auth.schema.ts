import { z } from 'zod';

export const LoginSchema = z
  .object({
    email: z.email().describe('Email đăng nhập của người dùng').meta({ example: 'user@nexus.com' }),
    password: z
      .string()
      .trim()
      .min(1)
      .min(6)
      .describe('Mật khẩu người dùng (tối thiểu 6 ký tự)')
      .meta({ example: '123456' }),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    email: z
      .email()
      .regex(/^[a-zA-Z0-9._%+-]+@gmail\.com$/i)
      .describe('Email đăng ký (chỉ chấp nhận @gmail.com)')
      .meta({ example: 'user@gmail.com' }),
    password: z
      .string()
      .trim()
      .min(1)
      .min(8)
      .regex(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/)
      .describe('Mật khẩu (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 ký tự đặc biệt)')
      .meta({ example: 'Password@123' }),
    fullName: z
      .string()
      .trim()
      .min(1)
      .describe('Họ và tên người dùng')
      .meta({ example: 'Nguyễn Văn A' }),
  })
  .strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const ForgotPasswordSchema = z
  .object({
    email: z
      .email()
      .describe(
        'Email đã đăng ký trong hệ thống để nhận mã OTP đặt lại mật khẩu (Admin, Staff, Buyer, Seller)',
      )
      .meta({ example: 'admin@nexus.com' }),
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    email: z
      .email()
      .describe('Email cần đặt lại mật khẩu (Admin, Staff, Buyer, Seller)')
      .meta({ example: 'admin@nexus.com' }),
    code: z
      .string()
      .trim()
      .min(6)
      .max(6)
      .describe('Mã OTP 6 chữ số gửi qua email')
      .meta({ example: '123456' }),
    newPassword: z
      .string()
      .trim()
      .min(8)
      .regex(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/)
      .describe('Mật khẩu mới (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 ký tự đặc biệt)')
      .meta({ example: 'NewPassword@123' }),
  })
  .strict();

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const OAuthExchangeSchema = z
  .object({
    code: z.string().trim().min(1).describe('Single-use OAuth exchange code'),
  })
  .strict();

export type OAuthExchangeInput = z.infer<typeof OAuthExchangeSchema>;
