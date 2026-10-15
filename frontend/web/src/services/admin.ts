import { apiRequest } from './api';
import { SellerUpgradeRequest } from './users';

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
  return apiRequest<{ message: string; staff: StaffUser }>('/admin/staff', {
    method: 'POST',
    body: dto,
    requireAuth: true,
  });
}

/**
 * 2. Lấy danh sách tài khoản Support Staff
 */
export function listStaff(params?: QueryStaffParams): Promise<PaginatedResult<StaffUser>> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const queryString = query.toString();

  return apiRequest<PaginatedResult<StaffUser>>(
    `/admin/staff${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      requireAuth: true,
    },
  );
}

/**
 * 3. Xem danh sách yêu cầu nâng cấp lên Seller (hỗ trợ lọc PENDING, APPROVED, REJECTED)
 */
export function getSellerRequests(
  params?: QuerySellerRequestsParams,
): Promise<PaginatedResult<SellerUpgradeRequest>> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const queryString = query.toString();

  return apiRequest<PaginatedResult<SellerUpgradeRequest>>(
    `/admin/seller-requests${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      requireAuth: true,
    },
  );
}

/**
 * 4. Xem chi tiết một yêu cầu nâng cấp
 */
export function getSellerRequestById(id: string): Promise<SellerUpgradeRequest> {
  return apiRequest<SellerUpgradeRequest>(`/admin/seller-requests/${id}`, {
    method: 'GET',
    requireAuth: true,
  });
}

/**
 * 5. Admin phê duyệt yêu cầu nâng cấp lên Seller
 */
export function approveSellerRequest(
  id: string,
): Promise<{ message: string; request: SellerUpgradeRequest }> {
  return apiRequest<{ message: string; request: SellerUpgradeRequest }>(
    `/admin/seller-requests/${id}/approve`,
    {
      method: 'PATCH',
      requireAuth: true,
    },
  );
}

/**
 * 6. Admin từ chối yêu cầu nâng cấp lên Seller kèm lý do
 */
export function rejectSellerRequest(
  id: string,
  rejectionReason: string,
): Promise<{ message: string; request: SellerUpgradeRequest }> {
  return apiRequest<{ message: string; request: SellerUpgradeRequest }>(
    `/admin/seller-requests/${id}/reject`,
    {
      method: 'PATCH',
      body: { rejectionReason },
      requireAuth: true,
    },
  );
}
