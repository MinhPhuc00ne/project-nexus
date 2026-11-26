import { type AxiosRequestConfig } from 'axios';
import i18n from '@/i18n';
import { apiRequest, request } from '@/services/api';

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

export interface StaffModeratedReview {
  id: string;
  type: 'PRODUCT' | 'SHOP';
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    fullName: string;
    email: string;
    reputationScore: number;
    trustLevel: string;
  };
  target: { id: string; name: string };
}

export interface StaffModeratedReviewsPage {
  items: StaffModeratedReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type StaffAfterSalesStatus =
  'REQUESTED' | 'APPROVING' | 'APPROVED' | 'RECEIVED' | 'COMPLETED' | 'REJECTED';

export interface StaffAfterSalesRequest {
  id: string;
  orderId: string;
  kind: 'CANCEL' | 'RETURN';
  status: StaffAfterSalesStatus;
  requestedBy: string;
  reason: string;
  evidenceUrls: unknown;
  refundToWallet: boolean;
  decisionReason: string | null;
  reviewedBy: string | null;
  returnWaybillCode: string | null;
  receivedAt: string | null;
  restockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAfterSalesPage {
  items: StaffAfterSalesRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface StaffOrderSupportDetail {
  id: string;
  status: string;
  subtotal: number | string;
  shippingFee: number | string;
  totalAmount: number | string;
  isAuction?: boolean;
  createdAt: string;
  updatedAt: string;
  cancellationActor?: string | null;
  buyer?: { id: string; fullName: string; email: string };
  seller?: { id: string; fullName: string; email: string };
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number | string;
    product?: { id: string; title: string } | null;
  }>;
  shipment: {
    status: string;
    waybillCode: string | null;
    carrier?: string | null;
    trackingNumber?: string | null;
    shippingFee?: number | string;
    metadata?: unknown;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  escrowRecord: {
    status: string;
    totalAmount: number | string;
    platformFee: number | string;
    sellerPayout: number | string;
  } | null;
  afterSales: StaffAfterSalesRequest | null;
  dispute: {
    id: string;
    status: string;
    reason?: string;
    resolutionNotes?: string | null;
    resolvedAt?: string | null;
  } | null;
  refunds: Array<{
    id: string;
    amount: number | string;
    destination: string;
    status: string;
    externalReference: string | null;
    createdAt?: string;
  }>;
  payments?: Array<{
    id: string;
    provider: string;
    amount: number | string;
    status: string;
    transactionCode: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  history?: Array<{
    source: string;
    action: string;
    label: string;
    timestamp: string;
    actor?: { id: string; fullName: string | null; email: string; role?: string } | null;
    note?: string | null;
    details?: Record<string, unknown>;
  }>;
}

export interface StaffAdminOrderListItem {
  id: string;
  status: string;
  subtotal: number | string;
  shippingFee: number | string;
  totalAmount: number | string;
  createdAt: string;
  updatedAt: string;
  buyer: { id: string; fullName: string; email: string };
  seller: { id: string; fullName: string; email: string };
  shipment: { status: string; waybillCode: string | null } | null;
  afterSales: StaffAfterSalesRequest | null;
  dispute: { id: string; status: string } | null;
  _count: { items: number };
}

export interface StaffAdminOrdersPage {
  items: StaffAdminOrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StaffOrderTracking {
  orderId: string;
  orderStatus: string;
  carrierStatus?: string;
  shipment: StaffOrderSupportDetail['shipment'];
}

export type StaffReturnAction =
  | { type: 'review'; decision: 'APPROVE' | 'REJECT'; reason: string }
  | { type: 'waybill'; waybillCode: string }
  | { type: 'receive'; reason: string; restock: boolean };

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

/**
 * Calls a staff endpoint.
 *
 * Two of them are public: whoever was invited has no account to sign in with
 * yet, so this never requires a token.
 *
 * @param config - The request, as Axios describes it.
 * @returns The payload inside the response envelope.
 */
async function staffRequest<T>(config: AxiosRequestConfig): Promise<T> {
  return request<T>(config, { fallbackMessage: i18n.t('errors:network') });
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
    throw new Error(i18n.t('errors:services.staffAvatarFormat'));
  }
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error(i18n.t('errors:services.staffAvatarSize'));
  }
  const formData = new FormData();
  formData.append('file', file);
  const uploaded = await apiRequest<{ url: string }>('/media/upload', {
    method: 'POST',
    body: formData,
    isFormData: true,
    requireAuth: true,
  });
  if (!uploaded?.url) throw new Error(i18n.t('errors:services.invalidImageUrl'));

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

export function getStaffModeratedReviews(
  query: { page?: number; limit?: number; type?: 'PRODUCT' | 'SHOP'; search?: string } = {},
): Promise<StaffModeratedReviewsPage> {
  return staffRequest({ url: '/admin/reviews', method: 'GET', params: query });
}

export function deleteStaffModeratedReview(
  review: Pick<StaffModeratedReview, 'id' | 'type'>,
  data: { reason: string; pointsToDeduct: number },
): Promise<{ success: boolean; message: string }> {
  const type = review.type === 'PRODUCT' ? 'product' : 'shop';
  return staffRequest({
    url: `/admin/reviews/${type}/${encodeURIComponent(review.id)}`,
    method: 'DELETE',
    data,
  });
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

export function getStaffAfterSales(
  params: { page?: number; limit?: number; status?: StaffAfterSalesStatus } = {},
  signal?: AbortSignal,
): Promise<StaffAfterSalesPage> {
  return staffRequest({ url: '/commerce/after-sales', method: 'GET', params, signal });
}

/** Staff-wide order search; backend matches order ID and the outbound waybill code. */
export function getStaffOrders(
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {},
): Promise<StaffAdminOrdersPage> {
  return staffRequest({ url: '/admin/orders', method: 'GET', params });
}

/** Full Staff order detail including payment, escrow, shipment, refunds, dispute and history. */
export function getStaffAdminOrderDetail(orderId: string): Promise<StaffOrderSupportDetail> {
  return staffRequest({
    url: `/admin/orders/${encodeURIComponent(orderId)}`,
    method: 'GET',
  });
}

export function getStaffOrderSupportDetail(orderId: string): Promise<StaffOrderSupportDetail> {
  return staffRequest({
    url: `/commerce/orders/${encodeURIComponent(orderId)}/after-sales`,
    method: 'GET',
  });
}

export function getStaffOrderTracking(orderId: string, sync = false): Promise<StaffOrderTracking> {
  return staffRequest({
    url: `/commerce/orders/${encodeURIComponent(orderId)}/tracking${sync ? '/sync' : ''}`,
    method: sync ? 'POST' : 'GET',
  });
}

export function processStaffReturn(
  orderId: string,
  action: StaffReturnAction,
): Promise<StaffAfterSalesRequest> {
  const { type, ...data } = action;
  return staffRequest({
    url: `/commerce/orders/${encodeURIComponent(orderId)}/returns/${type}`,
    method: 'POST',
    data,
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
