import axios, { type AxiosRequestConfig } from 'axios';
import api, { ApiRequestError } from './api';
import { getStoredToken } from './auth';
import type {
  AdminUser,
  QueryUsersParams,
  SellerUpgradeRequest,
  UserStatusResult,
} from '../types/user.types';
import type { CategoryTreeItem } from '../types/category.types';
import type {
  CreateStaffDto,
  CreateStaffResult,
  InviteStaffDto,
  PaginatedResult,
  QuerySellerRequestsParams,
  QueryStaffParams,
  SellerRequestReviewResult,
  StaffInvitationResult,
  StaffUser,
} from '../types/admin.types';

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

// Không gửi mật khẩu: nhân viên tự đặt mật khẩu qua link gửi đến email cá nhân.
export function inviteStaff(dto: InviteStaffDto): Promise<StaffInvitationResult> {
  return adminRequest<StaffInvitationResult>({
    url: '/admin/staff/invite',
    method: 'POST',
    data: dto,
  });
}

export function listUsers(params: QueryUsersParams, signal?: AbortSignal) {
  return adminRequest<PaginatedResult<AdminUser>>({
    url: '/admin/users',
    method: 'GET',
    params,
    signal,
  });
}

export function getCategoryTree(signal?: AbortSignal): Promise<CategoryTreeItem[]> {
  return adminRequest<CategoryTreeItem[]>({
    url: '/catalog/categories',
    method: 'GET',
    signal,
  });
}

export function lockUser(id: string, reason?: string) {
  return adminRequest<UserStatusResult>({
    url: `/admin/users/${encodeURIComponent(id)}/lock`,
    method: 'PATCH',
    data: { reason },
  });
}

export function unlockUser(id: string, reason?: string) {
  return adminRequest<UserStatusResult>({
    url: `/admin/users/${encodeURIComponent(id)}/unlock`,
    method: 'PATCH',
    data: { reason },
  });
}

/**
 * 1. Admin tạo tài khoản cho nhân viên hỗ trợ (Support Staff)
 */
export function createStaff(dto: CreateStaffDto): Promise<CreateStaffResult> {
  return adminRequest<CreateStaffResult>({
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
export function approveSellerRequest(id: string): Promise<SellerRequestReviewResult> {
  return adminRequest<SellerRequestReviewResult>({
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
): Promise<SellerRequestReviewResult> {
  return adminRequest<SellerRequestReviewResult>({
    url: `/admin/seller-requests/${id}/reject`,
    method: 'PATCH',
    data: { rejectionReason },
  });
}
