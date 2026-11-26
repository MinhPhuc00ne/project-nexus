import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const createStaffFields = {
  email: z
    .email()
    .describe('Email cá nhân nhận tài khoản @staff.com và mật khẩu ngẫu nhiên để đăng nhập ngay')
    .meta({ example: 'hotro.canhan@gmail.com' }),
  fullName: z
    .string()
    .trim()
    .min(1)
    .describe('Họ và tên nhân viên')
    .meta({ example: 'Nguyễn Văn Hỗ Trợ' }),
  phoneNumber: nullAsAbsent(
    z.string().describe('Số điện thoại nhân viên').meta({ example: '0987654321' }),
  ),
  department: nullAsAbsent(
    z.string().describe('Phòng ban / Bộ phận phụ trách').meta({ example: 'Chăm sóc khách hàng' }),
  ),
  password: nullAsAbsent(
    z
      .string()
      .describe(
        'Trường cũ được chấp nhận nhưng bỏ qua; backend luôn sinh mật khẩu ngẫu nhiên và gửi qua email cá nhân',
      )
      .meta({ example: 'Staff@123456' }),
  ),
};

export const CreateStaffSchema = z.object(createStaffFields).strict();

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
