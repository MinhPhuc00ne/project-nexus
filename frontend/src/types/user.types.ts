import { Role, ReputationTrustLevel } from '@nexus/types';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role?: Role | string;
  avatarUrl?: string | null;
}

export interface AuthMessage {
  message: string;
  email?: string;
  devOtpCode?: string;
}

export interface LoginResponse extends AuthMessage {
  accessToken?: string;
  refreshToken?: string;
  user: AuthUser;
}

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
  role: Role;
  isSellerActive: boolean;
  isShopSuspended: boolean;
  suspensionReason: string | null;
  currentMode: 'SELLER' | 'BUYER';
  canToggleSeller: boolean;
  reputationScore: number;
  trustLevel: ReputationTrustLevel | string;
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
  street?: string | null;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  formattedAddress?: string | null;
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
  user?: {
    id: string;
    email: string;
    fullName: string;
    reputationScore?: number;
  } | null;
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
  street: string;
  city: string;
  storeDescription?: string;
  phone: string;
  businessEmail?: string;
  identityCardNumber?: string;
  attachmentUrl?: string;
}

export type AdminUserRole = 'BUYER' | 'SELLER' | 'SUPPORT_STAFF' | 'ADMIN';
export type AdminUserStatus = 'ALL' | 'ACTIVE' | 'LOCKED';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  role: AdminUserRole;
  isSellerActive: boolean;
  reputationScore: number;
  trustLevel: string;
  isLocked: boolean;
  status: Exclude<AdminUserStatus, 'ALL'>;
  isVerified: boolean;
  platformEmail: string | null;
  walletBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserAddress {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  street: string;
  ward: string | null;
  district: string | null;
  city: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
  formattedAddress: string | null;
  placeId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUser {
  personalEmail: string | null;
  wallet: UserWallet | null;
  addresses: AdminUserAddress[];
  stats: {
    products: number;
    ordersAsBuyer: number;
    ordersAsSeller: number;
    auctions: number;
    disputesOpened: number;
  };
}

export interface QueryUsersParams {
  search?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
  page?: number;
  limit?: number;
}

export interface UserStatusResult {
  success: boolean;
  message: string;
  user: AdminUser;
}
