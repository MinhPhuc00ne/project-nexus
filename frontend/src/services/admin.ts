import type { AdminOverviewAnalytics } from '../types/admin-analytics.types';
import type {
  AdminOrderAfterSales,
  AdminOrderDetail,
  AdminOrderPage,
  QueryAdminOrders,
} from '../types/admin-order.types';
import type { AdminDisputePage, QueryAdminDisputes } from '../types/admin-dispute.types';
import type {
  AdminReport,
  AdminReportPage,
  AdminReportStatus,
  ReviewAdminReport,
} from '../types/admin-report.types';
import type {
  SystemSettings,
  UpdateSystemSettingsDto,
  UpdateSystemSettingsResult,
} from '../types/admin-settings.types';
import type {
  AdminUser,
  AdminUserDetail,
  QueryUsersParams,
  SellerUpgradeRequest,
  UserStatusResult,
} from '../types/user.types';
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
import { adminRequest } from './adminRequest';

export function listAdminOrders(
  params: QueryAdminOrders,
  signal?: AbortSignal,
): Promise<AdminOrderPage> {
  return adminRequest({ url: '/admin/orders', method: 'GET', params, signal });
}

export function getAdminOrderById(id: string, signal?: AbortSignal): Promise<AdminOrderDetail> {
  return adminRequest({ url: `/admin/orders/${encodeURIComponent(id)}`, method: 'GET', signal });
}

export function cancelAdminOrder(id: string, reason: string): Promise<AdminOrderAfterSales> {
  return adminRequest({
    url: `/commerce/orders/${encodeURIComponent(id)}/cancel`,
    method: 'POST',
    data: { reason },
  });
}

export function getAdminOverviewAnalytics(signal?: AbortSignal): Promise<AdminOverviewAnalytics> {
  return adminRequest({ url: '/admin/analytics/overview', method: 'GET', signal });
}

export function getAdminFinanceAnalytics(signal?: AbortSignal): Promise<AdminOverviewAnalytics> {
  return adminRequest({ url: '/admin/finance/analytics', method: 'GET', signal });
}

export type AdminWithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface AdminWithdrawalRequest {
  id: string;
  userId: string;
  sellerName: string;
  sellerEmail: string;
  sellerPhone: string | null;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  status: AdminWithdrawalStatus;
  rejectionReason: string | null;
  adminNote: string | null;
  reviewedBy: { id: string; fullName: string; email: string } | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AdminWithdrawalPage {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: AdminWithdrawalRequest[];
}

export function listAdminWithdrawals(
  params: { status?: AdminWithdrawalStatus; page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<AdminWithdrawalPage> {
  return adminRequest({ url: '/admin/withdrawals', method: 'GET', params, signal });
}

export function reviewAdminWithdrawal(
  id: string,
  dto: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string; adminNote?: string },
): Promise<{ success: boolean; message: string }> {
  return adminRequest({
    url: `/admin/withdrawals/${encodeURIComponent(id)}/review`,
    method: 'PATCH',
    data: dto,
  });
}

// Không gửi mật khẩu: nhân viên tự đặt mật khẩu qua link gửi đến email cá nhân.
export function inviteStaff(dto: InviteStaffDto): Promise<StaffInvitationResult> {
  return adminRequest<StaffInvitationResult>({
    url: '/admin/staff/invite',
    method: 'POST',
    data: dto,
  });
}

export function listAdminDisputes(
  params: QueryAdminDisputes,
  signal?: AbortSignal,
): Promise<AdminDisputePage> {
  return adminRequest<AdminDisputePage>({ url: '/admin/disputes', method: 'GET', params, signal });
}

export function resolveAdminDispute(orderId: string, verdict: 'BUYER' | 'SELLER', reason: string) {
  return adminRequest<{ success: boolean; alreadyProcessed?: boolean }>({
    url: `/commerce/orders/${encodeURIComponent(orderId)}/resolve-dispute`,
    method: 'POST',
    data: { verdict, reason },
  });
}

export function listAdminReports(
  params: { page?: number; limit?: number; status?: AdminReportStatus },
  signal?: AbortSignal,
): Promise<AdminReportPage> {
  return adminRequest({ url: '/admin/reports', method: 'GET', params, signal });
}

export function reviewAdminReport(id: string, data: ReviewAdminReport): Promise<AdminReport> {
  return adminRequest({
    url: `/admin/reports/${encodeURIComponent(id)}/review`,
    method: 'PATCH',
    data,
  });
}

export function getAdminSettings(signal?: AbortSignal): Promise<SystemSettings> {
  return adminRequest<SystemSettings>({ url: '/admin/settings', method: 'GET', signal });
}

export function updateAdminSettings(
  dto: UpdateSystemSettingsDto,
  signal?: AbortSignal,
): Promise<UpdateSystemSettingsResult> {
  return adminRequest<UpdateSystemSettingsResult>({
    url: '/admin/settings',
    method: 'PATCH',
    data: dto,
    signal,
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

export function getUserById(id: string, signal?: AbortSignal): Promise<AdminUserDetail> {
  return adminRequest<AdminUserDetail>({
    url: `/admin/users/${encodeURIComponent(id)}`,
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

export * from './adminCommerce';
