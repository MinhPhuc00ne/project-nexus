import { apiRequest } from '@/services/api';
import type {
  UserWallet,
  UserProfile,
  SellerUpgradeRequest,
  ToggleSellerResponse,
  CreateSellerRequestDto,
} from '@/features/account/types/user.types';

export type {
  UserWallet,
  UserProfile,
  SellerUpgradeRequest,
  ToggleSellerResponse,
  CreateSellerRequestDto,
};

/**
 * 1. Lấy thông tin cá nhân của người dùng đang đăng nhập (kèm số dư ví, điểm uy tín, role)
 */
export function getMe(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me', {
    method: 'GET',
    requireAuth: true,
  });
}

/**
 * 2. Chuyển đổi trạng thái Seller Mode (bật / tắt bán hàng) cho tài khoản đã có quyền Seller
 */
export function toggleSellerMode(isSellerActive?: boolean): Promise<ToggleSellerResponse> {
  return apiRequest<ToggleSellerResponse>('/users/toggle-seller', {
    method: 'PATCH',
    body: isSellerActive !== undefined ? { isSellerActive } : {},
    requireAuth: true,
  });
}

/**
 * 3. Gửi yêu cầu nâng cấp tài khoản lên Seller (kèm file tài liệu chứng minh hoặc attachmentUrl)
 */
export function createSellerRequest(
  payload: FormData | CreateSellerRequestDto,
): Promise<{ message: string; request: SellerUpgradeRequest }> {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;

  return apiRequest<{ message: string; request: SellerUpgradeRequest }>('/users/seller-request', {
    method: 'POST',
    body: payload,
    isFormData,
    requireAuth: true,
  });
}

/**
 * 4. Xem lịch sử và trạng thái yêu cầu nâng cấp Seller của tài khoản hiện tại
 */
export function getMySellerRequests(): Promise<{
  total: number;
  requests: SellerUpgradeRequest[];
}> {
  return apiRequest<{ total: number; requests: SellerUpgradeRequest[] }>(
    '/users/seller-request/me',
    {
      method: 'GET',
      requireAuth: true,
    },
  );
}
