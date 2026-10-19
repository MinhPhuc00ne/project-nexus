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
  storeDescription?: string;
  phone: string;
  businessEmail?: string;
  identityCardNumber?: string;
  attachmentUrl?: string;
}
