import { ReputationTrustLevel, Role, UserAddress } from '@prisma/client';

export interface AdminUserItemResponse {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  role: Role;
  isSellerActive: boolean;
  reputationScore: number;
  trustLevel: ReputationTrustLevel;
  isLocked: boolean;
  status: 'ACTIVE' | 'LOCKED';
  isVerified: boolean;
  platformEmail: string | null;
  walletBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUsersListResponse {
  items: AdminUserItemResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserDetailResponse extends AdminUserItemResponse {
  personalEmail: string | null;
  wallet: {
    balance: number;
    lockedBalance: number;
    currency: string;
  } | null;
  addresses: UserAddress[];
  stats: {
    products: number;
    ordersAsBuyer: number;
    ordersAsSeller: number;
    auctions: number;
    disputesOpened: number;
  };
}
