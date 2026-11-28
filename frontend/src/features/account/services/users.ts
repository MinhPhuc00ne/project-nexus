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
 * 1. Get the currently signed-in user's profile (including wallet balance, reputation score, and role)
 */
export function getMe(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/me', {
    method: 'GET',
    requireAuth: true,
  });
}

/**
 * 2. Toggle Seller Mode (enable/disable selling view) for Seller-eligible accounts
 */
export function toggleSellerMode(isSellerActive?: boolean): Promise<ToggleSellerResponse> {
  return apiRequest<ToggleSellerResponse>('/users/toggle-seller', {
    method: 'PATCH',
    body: isSellerActive !== undefined ? { isSellerActive } : {},
    requireAuth: true,
  });
}

/**
 * 3. Submit a Seller upgrade request (with verification document file or attachmentUrl)
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
 * 4. View history and status of the current account's Seller upgrade requests
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
