import { z } from 'zod';

const verifyEmailFields = {
  email: z.email().describe('Email cần xác thực').meta({ example: 'user@nexus.com' }),
  code: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .max(6)
    .describe('Mã OTP 6 chữ số gửi qua email')
    .meta({ example: '123456' }),
};

export const VerifyEmailSchema = z.object(verifyEmailFields).strict();

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
