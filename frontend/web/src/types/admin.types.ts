import type { Role } from '@nexus/types';
import type { SellerUpgradeRequest } from './user.types';

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  role: Role;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateStaffDto {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

export interface InviteStaffDto {
  email: string;
  fullName: string;
  phoneNumber?: string;
  department?: string;
}

export interface StaffInvitationResult {
  success: boolean;
  message: string;
  invitationId: string;
  assignedEmail: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuerySellerRequestsParams {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  page?: number;
  limit?: number;
}

export interface QueryStaffParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateStaffResult {
  message: string;
  staff: StaffUser;
}

export interface SellerRequestReviewResult {
  message: string;
  request: SellerUpgradeRequest;
}
