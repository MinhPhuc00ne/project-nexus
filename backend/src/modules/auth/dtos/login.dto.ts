import { z } from 'zod';

const loginFields = {
  email: z.email().describe('Email đăng nhập của người dùng').meta({ example: 'user@nexus.com' }),
  password: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .describe('Mật khẩu người dùng (tối thiểu 6 ký tự)')
    .meta({ example: '123456' }),
};

export const LoginSchema = z.object(loginFields).strict();

export type LoginInput = z.infer<typeof LoginSchema>;
