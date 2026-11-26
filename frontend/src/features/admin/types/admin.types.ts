import type { OrderStatus, Role } from '@nexus/types';
import type { SellerUpgradeRequest } from '@/features/account/types/user.types';

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

export interface AdminShop {
  id: string;
  sellerFullName: string;
  sellerEmail: string;
  sellerPhone: string | null;
  storeName: string;
  storeDescription: string | null;
  avatarUrl: string | null;
  isSellerActive: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
  totalProducts: number;
  address: {
    street: string;
    ward: string | null;
    district: string | null;
    city: string;
    formattedAddress: string | null;
  } | null;
  createdAt: string;
}

export interface QueryAdminShopsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdminShop['status'];
  city?: string;
}

export interface UpdateShopStatusDto {
  isSellerActive: boolean;
  reason?: string;
}

export interface AdminShopDetail {
  shop: {
    id: string;
    storeName: string;
    storeDescription: string | null;
    owner: {
      id: string;
      fullName: string;
      email: string;
      phone: string | null;
      avatarUrl: string | null;
    };
    contact: {
      phone: string | null;
      businessEmail: string;
      identityCardNumber: string | null;
      address:
        | (NonNullable<AdminShop['address']> & {
            latitude: number | null;
            longitude: number | null;
          })
        | null;
    };
    openedAt: string;
    status: {
      isSellerActive: boolean;
      isShopSuspended: boolean;
      currentStatus: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
      suspensionReason: string | null;
      reputationScore: number;
      trustLevel: string;
    };
  };
  products: {
    breakdown: {
      total: number;
      active: number;
      outOfStock: number;
      inactive: number;
      draft: number;
    };
    sampleList: {
      id: string;
      title: string;
      basePrice: number;
      status: string;
      category: { id: string; name: string; slug: string };
      thumbnail: string | null;
      availableQty: number;
      totalQty: number;
      isOutOfStock: boolean;
      createdAt: string;
    }[];
  };
  violations: {
    summary: { total: number; pending: number; confirmed: number };
    items: {
      id: string;
      title: string;
      description: string;
      evidenceUrls: unknown;
      penaltyLevel: string | null;
      status: string;
      resolutionNotes: string | null;
      handledAt: string | null;
      handledBy: { id: string; fullName: string; email: string } | null;
      reporter: { id: string; fullName: string; email: string } | null;
      createdAt: string;
    }[];
  };
  moderationHistory: {
    id: string;
    action: string;
    reason: string | null;
    createdAt: string;
    admin: { id: string; fullName: string; email: string };
  }[];
}

export interface AdminShopOrder {
  id: string;
  buyer: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    avatarUrl: string | null;
  } | null;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: unknown;
  itemsCount: number;
  items: Array<{
    id: string;
    productId: string | null;
    selections: unknown;
    title: string;
    thumbnail: string | null;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  }>;
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    waybillCode: string | null;
    status: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminShopOrderPage {
  items: AdminShopOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminShopViolation {
  id: string;
  shopId?: string;
  productId?: string | null;
  title: string;
  description: string;
  evidenceUrls: string[];
  penaltyLevel: string | null;
  status: 'PENDING' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED';
  resolutionNotes: string | null;
  handledAt: string | null;
  handledBy: { id: string; fullName: string; email: string } | null;
  reporter: { id: string; fullName: string; email: string } | null;
  createdAt: string;
}

export interface AdminShopActionLog {
  id: string;
  shopId?: string;
  adminId?: string;
  action: 'WARN' | 'SUSPEND' | 'RESTORE';
  reason: string | null;
  createdAt: string;
  admin: { id: string; fullName: string; email: string };
}

export interface CreateAdminShopViolationDto {
  title: string;
  description: string;
  evidenceUrls?: string[];
  penaltyLevel?: string;
  status?: AdminShopViolation['status'];
  resolutionNotes?: string;
}

export interface ResolveAdminShopAppealDto {
  reason: string;
  restoredScore?: number;
}

export interface UpdateShopStatusResult {
  success: boolean;
  message: string;
  shop: Pick<AdminShop, 'id' | 'storeName' | 'isSellerActive' | 'status'>;
}

export interface WarnAdminShopDto {
  reason: string;
  penaltyPoints?: number;
}

export interface WarnAdminShopResult {
  success: boolean;
  message: string;
}
