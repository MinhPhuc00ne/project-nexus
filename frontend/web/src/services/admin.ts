import axios, { type AxiosRequestConfig } from 'axios';
import api, { ApiRequestError } from './api';
import { getStoredToken } from './auth';
import type { SellerUpgradeRequest } from './users';

// Các API admin dùng chung Axios client, token phiên hiện tại và định dạng lỗi.
async function adminRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const token = getStoredToken();
  if (!token) throw new Error('Vui lòng đăng nhập để thực hiện thao tác này.');

  try {
    const response = await api.request<T | { data: T }>({
      ...config,
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = response.data;
    return payload && typeof payload === 'object' && 'data' in payload
      ? payload.data
      : (payload as T);
  } catch (error) {
    if (axios.isAxiosError<{ errors?: string[]; message?: string }>(error)) {
      if (!error.response) {
        throw new Error('Không thể kết nối tới máy chủ backend. Vui lòng thử lại.');
      }
      const payload = error.response.data;
      throw new ApiRequestError(
        payload?.errors?.join(' · ') || payload?.message || 'Yêu cầu thất bại.',
        error.response.status,
      );
    }
    throw error;
  }
}

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateStaffDto {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface InviteStaffDto {
  email: string;
  fullName: string;
  phoneNumber?: string;
  department?: string;
}

export interface StaffInvitationResult {
  success: boolean;
  message: string;
  invitationId: string;
  assignedEmail: string;
}

// Không gửi mật khẩu: nhân viên tự đặt mật khẩu qua link gửi đến email cá nhân.
export function inviteStaff(dto: InviteStaffDto): Promise<StaffInvitationResult> {
  return adminRequest<StaffInvitationResult>({
    url: '/admin/staff/invite',
    method: 'POST',
    data: dto,
  });
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuerySellerRequestsParams {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  page?: number;
  limit?: number;
}

export interface QueryStaffParams {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * 1. Admin tạo tài khoản cho nhân viên hỗ trợ (Support Staff)
 */
export function createStaff(dto: CreateStaffDto): Promise<{ message: string; staff: StaffUser }> {
  return adminRequest<{ message: string; staff: StaffUser }>({
    url: '/admin/staff',
    method: 'POST',
    data: dto,
  });
}

/**
 * 2. Lấy danh sách tài khoản Support Staff
 */
export function listStaff(params?: QueryStaffParams): Promise<PaginatedResult<StaffUser>> {
  return adminRequest<PaginatedResult<StaffUser>>({
    url: '/admin/staff',
    method: 'GET',
    params,
  });
}

/**
 * 3. Xem danh sách yêu cầu nâng cấp lên Seller (hỗ trợ lọc PENDING, APPROVED, REJECTED)
 */
export function getSellerRequests(
  params?: QuerySellerRequestsParams,
): Promise<PaginatedResult<SellerUpgradeRequest>> {
  return adminRequest<PaginatedResult<SellerUpgradeRequest>>({
    url: '/admin/seller-requests',
    method: 'GET',
    params,
  });
}

/**
 * 4. Xem chi tiết một yêu cầu nâng cấp
 */
export function getSellerRequestById(id: string): Promise<SellerUpgradeRequest> {
  return adminRequest<SellerUpgradeRequest>({
    url: `/admin/seller-requests/${id}`,
    method: 'GET',
  });
}

/**
 * 5. Admin phê duyệt yêu cầu nâng cấp lên Seller
 */
export function approveSellerRequest(
  id: string,
): Promise<{ message: string; request: SellerUpgradeRequest }> {
  return adminRequest<{ message: string; request: SellerUpgradeRequest }>({
    url: `/admin/seller-requests/${id}/approve`,
    method: 'PATCH',
  });
}

/**
 * 6. Admin từ chối yêu cầu nâng cấp lên Seller kèm lý do
 */
export function rejectSellerRequest(
  id: string,
  rejectionReason: string,
): Promise<{ message: string; request: SellerUpgradeRequest }> {
  return adminRequest<{ message: string; request: SellerUpgradeRequest }>({
    url: `/admin/seller-requests/${id}/reject`,
    method: 'PATCH',
    data: { rejectionReason },
  });
}
