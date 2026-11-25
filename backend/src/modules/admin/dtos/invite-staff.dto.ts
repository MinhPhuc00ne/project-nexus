import { z } from 'zod';
import { nullAsAbsent } from '../../../core/validation/query-schemas';

const adminInviteStaffFields = {
  fullName: z
    .string()
    .trim()
    .min(1)
    .describe('Họ và tên nhân viên')
    .meta({ example: 'Nguyễn Văn Staff' }),
  email: z
    .email()
    .describe('Email cá nhân của nhân viên để nhận link xác thực')
    .meta({ example: 'staff.personal@gmail.com' }),
  phoneNumber: nullAsAbsent(
    z.string().describe('Số điện thoại của nhân viên').meta({ example: '0912345678' }),
  ),
  department: nullAsAbsent(
    z.string().describe('Phòng ban / Bộ phận phụ trách').meta({ example: 'Chăm sóc khách hàng' }),
  ),
};

export const AdminInviteStaffSchema = z.object(adminInviteStaffFields).strict();

export type AdminInviteStaffInput = z.infer<typeof AdminInviteStaffSchema>;
