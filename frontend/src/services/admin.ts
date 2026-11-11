import axios, { type AxiosRequestConfig } from 'axios';
import type {
  AdminOrderAfterSales,
  AdminOrderDetail,
  AdminOrderPage,
  QueryAdminOrders,
} from '../types/admin-order.types';
import type {
  AdminProduct,
  AdminProductDetail,
  AdminProductMutationResult,
  QueryAdminProductsParams,
  UpdateProductStatusDto,
  UpdateProductStatusResult,
} from '../types/admin-product.types';
import api, { ApiRequestError } from './api';
import { getStoredToken } from './auth';
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
  CategoryTreeItem,
  CreateCategoryDto,
  DeleteCategoryResult,
  UpdateCategoryDto,
} from '../types/category.types';
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
  AdminShop,
  AdminShopDetail,
  QueryAdminShopsParams,
  UpdateShopStatusDto,
  UpdateShopStatusResult,
  WarnAdminShopDto,
  WarnAdminShopResult,
} from '../types/admin.types';
import type {
  AdminWalletSummary,
  AdminWalletTransactionPage,
  AdminWalletTransactionQueryDto,
  DepositAdminWalletDto,
  DepositAdminWalletResult,
} from '../types/admin-wallet.types';

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

export function getCategoryTree(signal?: AbortSignal): Promise<CategoryTreeItem[]> {
  return adminRequest<CategoryTreeItem[]>({
    url: '/catalog/categories',
    method: 'GET',
    signal,
  });
}

export function createCategory(dto: CreateCategoryDto): Promise<CategoryTreeItem> {
  return adminRequest<CategoryTreeItem>({
    url: '/admin/categories',
    method: 'POST',
    data: dto,
  });
}

export function updateCategory(id: string, dto: UpdateCategoryDto): Promise<CategoryTreeItem> {
  return adminRequest<CategoryTreeItem>({
    url: `/admin/categories/${encodeURIComponent(id)}`,
    method: 'PATCH',
    data: dto,
  });
}

export function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  return adminRequest<DeleteCategoryResult>({
    url: `/admin/categories/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });
}

export function listAdminProducts(
  params: QueryAdminProductsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<AdminProduct>> {
  return adminRequest<PaginatedResult<AdminProduct>>({
    url: '/admin/products',
    method: 'GET',
    params,
    signal,
  });
}

export function getAdminProductById(id: string, signal?: AbortSignal): Promise<AdminProductDetail> {
  return adminRequest<AdminProductDetail>({
    url: `/admin/products/${encodeURIComponent(id)}`,
    method: 'GET',
    signal,
  });
}

export function updateAdminProductStatus(
  id: string,
  dto: UpdateProductStatusDto,
): Promise<UpdateProductStatusResult> {
  return adminRequest<UpdateProductStatusResult>({
    url: `/admin/products/${encodeURIComponent(id)}/status`,
    method: 'PATCH',
    data: dto,
  });
}

export function deleteAdminProduct(id: string): Promise<AdminProductMutationResult> {
  return adminRequest<AdminProductMutationResult>({
    url: `/admin/products/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });
}

export function listAdminShops(
  params: QueryAdminShopsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<AdminShop>> {
  return adminRequest<PaginatedResult<AdminShop>>({
    url: '/admin/shops',
    method: 'GET',
    params,
    signal,
  });
}

export function updateAdminShopStatus(
  sellerId: string,
  dto: UpdateShopStatusDto,
): Promise<UpdateShopStatusResult> {
  return adminRequest<UpdateShopStatusResult>({
    url: `/admin/shops/${encodeURIComponent(sellerId)}/status`,
    method: 'PATCH',
    data: dto,
  });
}

export function warnAdminShop(
  sellerId: string,
  dto: WarnAdminShopDto,
): Promise<WarnAdminShopResult> {
  return adminRequest<WarnAdminShopResult>({
    url: `/admin/shops/${encodeURIComponent(sellerId)}/warn`,
    method: 'POST',
    data: dto,
  });
}

export function getAdminShopById(id: string, signal?: AbortSignal): Promise<AdminShopDetail> {
  return adminRequest<AdminShopDetail>({
    url: `/admin/shops/${encodeURIComponent(id)}`,
    method: 'GET',
    signal,
  });
}

export function getAdminWallet(signal?: AbortSignal): Promise<AdminWalletSummary> {
  return adminRequest<AdminWalletSummary>({ url: '/admin/wallet', method: 'GET', signal });
}

export function getAdminWalletTransactions(
  params: AdminWalletTransactionQueryDto,
  signal?: AbortSignal,
): Promise<AdminWalletTransactionPage> {
  return adminRequest<AdminWalletTransactionPage>({
    url: '/admin/wallet/transactions',
    method: 'GET',
    params,
    signal,
  });
}

export function depositToAdminWallet(
  dto: DepositAdminWalletDto,
): Promise<DepositAdminWalletResult> {
  return adminRequest<DepositAdminWalletResult>({
    url: '/admin/wallet/deposit',
    method: 'POST',
    data: dto,
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
