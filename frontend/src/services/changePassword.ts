import { apiRequest } from './api';

export interface ChangePasswordResult {
  success: boolean;
  message: string;
}

export interface ChangePasswordPayload {
  otp: string;
  newPassword: string;
}

export function validatePasswordChange(
  otp: string,
  newPassword: string,
  confirmation: string,
): ChangePasswordPayload {
  if (!/^\d{6}$/.test(otp.trim())) throw new Error('Nhập mã OTP gồm đúng 6 chữ số.');
  if (newPassword.length < 8 || !/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/.test(newPassword))
    throw new Error('Mật khẩu mới cần ít nhất 8 ký tự, có chữ hoa và ký tự đặc biệt.');
  if (newPassword !== confirmation) throw new Error('Mật khẩu xác nhận không khớp.');
  return { otp: otp.trim(), newPassword };
}

export async function requestChangePasswordOtp(): Promise<ChangePasswordResult> {
  const result = await apiRequest<ChangePasswordResult>('/auth/change-password/request-otp', {
    method: 'POST',
    requireAuth: true,
  });
  if (!result?.success)
    throw new Error(result?.message || 'Chưa gửi được mã OTP. Vui lòng thử lại.');
  return result;
}

export async function confirmChangePasswordOtp(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResult> {
  const result = await apiRequest<ChangePasswordResult>('/auth/change-password/confirm-otp', {
    method: 'POST',
    body: { otp: payload.otp, newPassword: payload.newPassword },
    requireAuth: true,
  });
  if (!result?.success)
    throw new Error(result?.message || 'Chưa đổi được mật khẩu. Vui lòng thử lại.');
  return result;
}
