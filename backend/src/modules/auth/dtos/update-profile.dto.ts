import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const updateAuthProfileFields = {
  password: nullAsAbsent(z.string().describe('Mật khẩu xác minh lại khi Seller cập nhật hồ sơ')),
  verificationToken: nullAsAbsent(
    z.string().describe('Token PROFILE_UPDATE do API reauthenticate cấp, hạn 5 phút'),
  ),
  fullName: nullAsAbsent(
    z
      .string()
      .min(2)
      .max(100)
      .describe('Họ và tên của người dùng (từ 2 đến 100 ký tự)')
      .meta({ example: 'Nguyen Van A' }),
  ),
  phoneNumber: nullAsAbsent(
    z
      .string()
      .regex(/^\+?[0-9]{9,15}$/)
      .describe('Số điện thoại liên lạc (9 đến 15 chữ số)')
      .meta({ example: '0912345678' }),
  ),
  avatarUrl: nullAsAbsent(
    z
      .string()
      .regex(/^https?:\/\/\S+$/i)
      .describe('Đường dẫn ảnh đại diện hợp lệ (http hoặc https)')
      .meta({ example: 'https://example.com/avatar.jpg' }),
  ),
};

export const UpdateAuthProfileSchema = z.object(updateAuthProfileFields).strict();

export type UpdateAuthProfileInput = z.infer<typeof UpdateAuthProfileSchema>;

const reauthenticateProfileFields = {
  password: z.string().min(1).max(200).describe('Mật khẩu hiện tại để xác minh hồ sơ'),
};

export const ReauthenticateProfileSchema = z.object(reauthenticateProfileFields).strict();

export type ReauthenticateProfileInput = z.infer<typeof ReauthenticateProfileSchema>;
