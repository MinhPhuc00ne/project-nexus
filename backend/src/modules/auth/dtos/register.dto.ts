import { z } from 'zod';

const registerFields = {
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
};

export const RegisterSchema = z.object(registerFields).strict();

export type RegisterInput = z.infer<typeof RegisterSchema>;
