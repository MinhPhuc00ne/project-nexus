import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const registerBuyerFields = {
  email: z.email().describe('Buyer email').meta({ example: 'buyer@example.com' }),
  password: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .describe('Password (min 6 characters)')
    .meta({ example: 'Password123!' }),
  fullName: z.string().trim().min(1).describe('Full name').meta({ example: 'Nguyen Van A' }),
  phoneNumber: nullAsAbsent(z.string().describe('Phone number').meta({ example: '0901234567' })),
};

export const RegisterBuyerSchema = z.object(registerBuyerFields).strict();

export type RegisterBuyerInput = z.infer<typeof RegisterBuyerSchema>;

const loginFields = {
  email: z
    .string()
    .trim()
    .min(1)
    .describe('Email or platform-assigned staff email (e.g. HuyNQ@staff.com)')
    .meta({ example: 'admin@nexus.com' }),
  password: z
    .string()
    .trim()
    .min(1)
    .describe('User password')
    .meta({ example: 'AdminPassword123!' }),
};

export const LoginSchema = z.object(loginFields).strict();

export type LoginInput = z.infer<typeof LoginSchema>;

const refreshTokenFields = {
  refreshToken: z.string().trim().min(1).describe('Refresh token string'),
};

export const RefreshTokenSchema = z.object(refreshTokenFields).strict();

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

const changePasswordFields = {
  currentPassword: z
    .string()
    .trim()
    .min(1)
    .describe('Current password')
    .meta({ example: 'CurrentPassword123!' }),
  newPassword: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .describe('New password (min 6 characters)')
    .meta({ example: 'NewPassword123!' }),
};

export const ChangePasswordSchema = z.object(changePasswordFields).strict();

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

const forgotPasswordRequestFields = {
  email: z.email().describe('Registered email').meta({ example: 'user@example.com' }),
};

export const ForgotPasswordRequestSchema = z.object(forgotPasswordRequestFields).strict();

export type ForgotPasswordRequestInput = z.infer<typeof ForgotPasswordRequestSchema>;

const resetPasswordWithOtpFields = {
  email: z.email().describe('Registered email').meta({ example: 'user@example.com' }),
  otp: z
    .string()
    .trim()
    .min(1)
    .regex(/^\d{6}$/)
    .describe('6-digit OTP code received in email')
    .meta({ example: '123456' }),
  newPassword: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .describe('New password')
    .meta({ example: 'NewPassword123!' }),
};

export const ResetPasswordWithOtpSchema = z.object(resetPasswordWithOtpFields).strict();

export type ResetPasswordWithOtpInput = z.infer<typeof ResetPasswordWithOtpSchema>;

const inviteStaffFields = {
  fullName: z
    .string()
    .trim()
    .min(1)
    .describe('Staff full name')
    .meta({ example: 'Nguyen Van Staff' }),
  email: z
    .email()
    .describe('Personal email to receive the assigned staff login and random initial password')
    .meta({ example: 'staff_personal@gmail.com' }),
  phoneNumber: z.string().trim().min(1).describe('Phone number').meta({ example: '0912345678' }),
  department: nullAsAbsent(
    z.string().describe('Assigned department').meta({ example: 'Customer Support' }),
  ),
};

export const InviteStaffSchema = z.object(inviteStaffFields).strict();

export type InviteStaffInput = z.infer<typeof InviteStaffSchema>;

const activateStaffFields = {
  token: z
    .string()
    .trim()
    .min(1)
    .describe('Mã token kích hoạt tài khoản nhận qua email cá nhân')
    .meta({ example: 'a1b2c3d4e5f6...' }),
  fullName: z
    .string()
    .trim()
    .min(1)
    .describe('Xác nhận Họ và tên nhân viên')
    .meta({ example: 'Nguyễn Quang Huy' }),
  phoneNumber: nullAsAbsent(
    z.string().describe('Xác nhận Số điện thoại nhân viên').meta({ example: '0912345678' }),
  ),
  newPassword: z
    .string()
    .trim()
    .min(1)
    .min(8)
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).+$/)
    .describe(
      'Mật khẩu mới (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt)',
    )
    .meta({ example: 'Staff@123456' }),
  confirmPassword: z
    .string()
    .trim()
    .min(1)
    .describe('Xác nhận lại mật khẩu mới')
    .meta({ example: 'Staff@123456' }),
};

export const ActivateStaffSchema = z.object(activateStaffFields).strict();

export type ActivateStaffInput = z.infer<typeof ActivateStaffSchema>;

const staffForgotPasswordFields = {
  email: z
    .email()
    .describe('Tài khoản công tác @staff.com; OTP gửi về email cá nhân đã liên kết')
    .meta({ example: 'HuyNQ@staff.com' }),
};

export const StaffForgotPasswordSchema = z.object(staffForgotPasswordFields).strict();

export type StaffForgotPasswordInput = z.infer<typeof StaffForgotPasswordSchema>;

const staffResetPasswordFields = {
  email: z
    .email()
    .describe('Tài khoản công tác @staff.com dùng khi yêu cầu OTP')
    .meta({ example: 'HuyNQ@staff.com' }),
  otp: z
    .string()
    .trim()
    .min(1)
    .regex(/^\d{6}$/)
    .describe('Mã OTP 6 số nhận qua email cá nhân')
    .meta({ example: '123456' }),
  newPassword: z
    .string()
    .trim()
    .min(1)
    .min(6)
    .describe('Mật khẩu mới')
    .meta({ example: 'NewStaffPassword123!' }),
};

export const StaffResetPasswordSchema = z.object(staffResetPasswordFields).strict();

export type StaffResetPasswordInput = z.infer<typeof StaffResetPasswordSchema>;
