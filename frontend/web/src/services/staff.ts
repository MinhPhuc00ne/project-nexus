import axios, { type AxiosRequestConfig } from 'axios';
import api, { ApiRequestError } from './api';

export interface StaffInvitationInfo {
  valid: boolean;
  fullName: string;
  phoneNumber: string | null;
  personalEmail: string;
  assignedEmail: string | null;
}

export interface ActivateStaffDto {
  token: string;
  fullName: string;
  phoneNumber: string;
  newPassword: string;
  confirmPassword: string;
}

// Hai endpoint công khai: người nhận lời mời chưa có tài khoản để đăng nhập.
async function staffRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await api.request<{ data: T }>(config);
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError<{ errors?: string[]; message?: string }>(error)) {
      throw new ApiRequestError(
        error.response?.data.errors?.join(' · ') ||
          error.response?.data.message ||
          'Không thể kết nối tới máy chủ. Vui lòng thử lại.',
        error.response?.status ?? 0,
      );
    }
    throw error;
  }
}

export function getStaffInvitationInfo(token: string): Promise<StaffInvitationInfo> {
  return staffRequest({ url: '/staff/invitation-info', method: 'GET', params: { token } });
}

export function activateStaff(dto: ActivateStaffDto): Promise<{
  success: boolean;
  message: string;
  assignedEmail: string;
}> {
  return staffRequest({ url: '/staff/activate', method: 'POST', data: dto });
}
