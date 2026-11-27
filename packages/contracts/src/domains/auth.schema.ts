import { z } from 'zod';

export const LoginSchema = z
  .object({
    email: z.email().describe('User sign-in email address').meta({ example: 'user@nexus.com' }),
    password: z
      .string()
      .trim()
      .min(1)
      .min(6)
      .describe('User password (minimum 6 characters)')
      .meta({ example: '123456' }),
  })
  .strict();

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    email: z
      .email()
      .regex(/^[a-zA-Z0-9._%+-]+@gmail\.com$/i)
      .describe('Registration email address (only @gmail.com is accepted)')
      .meta({ example: 'user@gmail.com' }),
    password: z
      .string()
      .trim()
      .min(1)
      .min(8)
      .regex(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/)
      .describe(
        'Password (at least 8 characters, including 1 uppercase letter and 1 special character)',
      )
      .meta({ example: 'Password@123' }),
    fullName: z.string().trim().min(1).describe('User full name').meta({ example: 'Alex Morgan' }),
  })
  .strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const ForgotPasswordSchema = z
  .object({
    email: z
      .email()
      .describe(
        'Registered account email to receive a password reset OTP (Admin, Staff, Buyer, Seller)',
      )
      .meta({ example: 'admin@nexus.com' }),
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    email: z
      .email()
      .describe('Account email for password reset (Admin, Staff, Buyer, Seller)')
      .meta({ example: 'admin@nexus.com' }),
    code: z
      .string()
      .trim()
      .min(6)
      .max(6)
      .describe('6-digit OTP code sent via email')
      .meta({ example: '123456' }),
    newPassword: z
      .string()
      .trim()
      .min(8)
      .regex(/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/)
      .describe(
        'New password (at least 8 characters, including 1 uppercase letter and 1 special character)',
      )
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
