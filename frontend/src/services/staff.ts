import axios, { type AxiosRequestConfig } from 'axios';
import api, { ApiRequestError, apiRequest } from './api';

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

export interface StaffProfile {
  id: string;
  email: string;
  personalEmail?: string | null;
  platformEmail?: string | null;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  role: string;
}

export type StaffDisputeStatus =
  'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_SELLER_FAVOR' | 'RESOLVED_BUYER_FAVOR' | 'CANCELLED';

export interface StaffDispute {
  id: string;
  orderId: string;
  reason: string;
  evidenceUrls: unknown;
  status: StaffDisputeStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  openedBy: { id: string; fullName: string; email: string; phoneNumber: string | null };
  resolvedBy: { id: string; fullName: string; email: string } | null;
  order: {
    id: string;
    totalAmount: number;
    subtotal: number;
    shippingFee: number;
    status: string;
    createdAt: string;
    buyer: { id: string; fullName: string; email: string; phoneNumber: string | null };
    seller: { id: string; fullName: string; email: string; phoneNumber: string | null };
    escrowRecord: {
      id: string;
      totalAmount: number;
      platformFee: number;
      sellerPayout: number;
      status: string;
    } | null;
    items: {
      id: string;
      title: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      thumbnail: string | null;
    }[];
  };
}

export interface StaffDisputesPage {
  items: StaffDispute[];
  counters: {
    all: number;
    pendingReview: number;
    open: number;
    underReview: number;
    resolvedSellerFavor: number;
    resolvedBuyerFavor: number;
    cancelled: number;
  };
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StaffDisputesQuery {
  page?: number;
  limit?: number;
  status?: StaffDisputeStatus;
  search?: string;
}

export interface StaffBanner {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string | null;
  auctionId?: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffBannerPayload {
  title: string;
  imageUrl: string;
  targetUrl?: string | null;
  auctionId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  priority?: number;
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

export function getStaffProfile(): Promise<StaffProfile> {
  return staffRequest({ url: '/staff/profile', method: 'GET' });
}

export function updateStaffProfile(
  data: Partial<Pick<StaffProfile, 'fullName' | 'phoneNumber' | 'avatarUrl'>>,
): Promise<StaffProfile> {
  const payload = { ...data };
  if (payload.avatarUrl && typeof payload.avatarUrl === 'string') {
    payload.avatarUrl = payload.avatarUrl.trim().replace('://localhost', '://127.0.0.1');
    if (!payload.avatarUrl) {
      delete payload.avatarUrl;
    }
  }
  return staffRequest({ url: '/staff/profile', method: 'PATCH', data: payload });
}

export async function uploadStaffAvatarFile(file: File): Promise<string> {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Chỉ hỗ trợ file ảnh định dạng JPG, PNG, WEBP hoặc GIF.');
  }
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error('Kích thước ảnh đại diện không được vượt quá 10 MB.');
  }
  const formData = new FormData();
  formData.append('file', file);
  const uploaded = await apiRequest<{ url: string }>('/media/upload', {
    method: 'POST',
    body: formData,
    isFormData: true,
    requireAuth: true,
  });
  if (!uploaded?.url) throw new Error('Máy chủ chưa trả về URL ảnh đại diện hợp lệ.');

  let url = uploaded.url.trim();
  if (url.startsWith('/')) {
    const origin = (window.location.origin || 'http://127.0.0.1:3000').replace(
      'localhost',
      '127.0.0.1',
    );
    url = `${origin}${url}`;
  }
  // Chuẩn hóa localhost thành 127.0.0.1 để vượt qua kiểm tra @IsUrl() của backend (validator.js yêu cầu TLD hoặc IP hợp lệ)
  return url.replace('://localhost', '://127.0.0.1');
}

export function changeStaffPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; message: string }> {
  return staffRequest({
    url: '/staff/change-password',
    method: 'POST',
    data: { currentPassword, newPassword },
  });
}

export function getStaffDisputes(query: StaffDisputesQuery = {}): Promise<StaffDisputesPage> {
  return staffRequest({ url: '/backoffice/disputes', method: 'GET', params: query });
}

export function resolveStaffDispute(
  orderId: string,
  verdict: 'BUYER' | 'SELLER',
  reason: string,
): Promise<{ success: boolean; alreadyProcessed?: boolean }> {
  return staffRequest({
    url: `/commerce/orders/${encodeURIComponent(orderId)}/resolve-dispute`,
    method: 'POST',
    data: { verdict, reason },
  });
}

export function getStaffBanners(): Promise<StaffBanner[]> {
  return staffRequest({ url: '/staff/banners', method: 'GET' });
}

export function saveStaffBanner(payload: StaffBannerPayload, id?: string): Promise<StaffBanner> {
  return staffRequest({
    url: id ? `/staff/banners/${encodeURIComponent(id)}` : '/staff/banners',
    method: id ? 'PUT' : 'POST',
    data: payload,
  });
}

export function deactivateStaffBanner(id: string): Promise<{ success: boolean }> {
  return staffRequest({
    url: `/staff/banners/${encodeURIComponent(id)}/disable`,
    method: 'PATCH',
  });
}

export interface StaffBannerDisableHistoryItem {
  id: string;
  bannerId: string;
  bannerTitle: string;
  creatorId: string;
  creatorName: string;
  creatorRole: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  source: 'UPDATE' | 'DELETE' | 'DISABLE';
  wasActive: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface StaffBannerDisableHistoryPage {
  items: StaffBannerDisableHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export function getStaffBannerDisableHistory(
  params: {
    bannerId?: string;
    actorId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<StaffBannerDisableHistoryPage> {
  return staffRequest({ url: '/staff/banner-disable-history', method: 'GET', params });
}
