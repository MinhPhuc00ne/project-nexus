import { z } from 'zod';

const verifyEmailFields = {
  email: z.email().describe('Email address to verify').meta({ example: 'user@nexus.com' }),
  code: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .max(6)
    .describe('6-digit OTP code sent via email')
    .meta({ example: '123456' }),
};

export const VerifyEmailSchema = z.object(verifyEmailFields).strict();

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
