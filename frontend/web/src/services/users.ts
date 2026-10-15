import { apiRequest } from './api';

export interface UserWallet {
  balance: number;
  lockedBalance: number;
  currency: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  role: 'ADMIN' | 'SUPPORT_STAFF' | 'SELLER' | 'BUYER' | 'GUEST';
  isSellerActive: boolean;
  currentMode: 'SELLER' | 'BUYER';
  canToggleSeller: boolean;
  reputationScore: number;
  trustLevel: string;
  isVerified: boolean;
  wallet: UserWallet | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerUpgradeRequest {
  id: string;
  userId: string;
  storeName: string;
  storeDescription: string | null;
  phone: string;
  businessEmail: string | null;
  identityCardNumber: string | null;
  attachmentUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface ToggleSellerResponse {
  message: string;
  isSellerActive: boolean;
  currentMode: 'SELLER' | 'BUYER';
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isSellerActive: boolean;
  };
}

export interface CreateSellerRequestDto {
  storeName: string;
  storeDescription?: string;
  phone: string;
  businessEmail?: string;
  identityCardNumber?: string;
  attachmentUrl?: string;
}

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
export function getMySellerRequests(): Promise<{ total: number; requests: SellerUpgradeRequest[] }> {
  return apiRequest<{ total: number; requests: SellerUpgradeRequest[] }>('/users/seller-request/me', {
    method: 'GET',
    requireAuth: true,
  });
}
