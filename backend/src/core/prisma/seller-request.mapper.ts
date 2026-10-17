/**
 * Project Nexus - Seller Request Serializer Mapper
 * Maps raw database / Prisma seller upgrade request records into standard camelCase DTO shape.
 */

export interface SerializedSellerRequest {
  id: string;
  userId: string;
  storeName: string;
  storeDescription: string | null;
  phone: string;
  businessEmail: string | null;
  identityCardNumber: string | null;
  attachmentUrl: string | null;
  status: string;
  rejectionReason: string | null;
  reviewedByAdminId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string | null;
    avatarUrl?: string | null;
    role?: string;
    isSellerActive?: boolean;
    reputationScore?: number;
    trustLevel?: string;
    createdAt?: Date;
  } | null;
  reviewedBy?: {
    id: string;
    email: string;
    fullName: string;
  } | null;
}

export function serializeSellerRequest(request: any): any {
  if (!request) {
    return null;
  }

  if (Array.isArray(request)) {
    return request.map(serializeSellerRequest);
  }

  const userObj =
    request.user || request.users_seller_upgrade_requests_user_idTousers || request.users || null;

  const adminObj =
    request.reviewedBy || request.users_seller_upgrade_requests_reviewed_by_admin_idTousers || null;

  return {
    id: request.id,
    userId: request.userId ?? request.user_id,
    storeName: request.storeName ?? request.store_name,
    storeDescription: request.storeDescription ?? request.store_description ?? null,
    phone: request.phone ?? request.phoneNumber ?? request.phone_number,
    businessEmail: request.businessEmail ?? request.business_email ?? null,
    identityCardNumber: request.identityCardNumber ?? request.identity_card_number ?? null,
    attachmentUrl: request.attachmentUrl ?? request.attachment_url ?? null,
    status: request.status,
    rejectionReason: request.rejectionReason ?? request.rejection_reason ?? null,
    reviewedByAdminId: request.reviewedByAdminId ?? request.reviewed_by_admin_id ?? null,
    reviewedAt: request.reviewedAt ?? request.reviewed_at ?? null,
    createdAt: request.createdAt ?? request.created_at,
    updatedAt: request.updatedAt ?? request.updated_at,
    user: userObj
      ? {
          id: userObj.id,
          email: userObj.email,
          fullName: userObj.fullName ?? userObj.full_name,
          phoneNumber: userObj.phoneNumber ?? userObj.phone_number ?? null,
          avatarUrl: userObj.avatarUrl ?? userObj.avatar_url ?? null,
          role: userObj.role,
          isSellerActive: userObj.isSellerActive ?? userObj.is_seller_active ?? false,
          reputationScore: userObj.reputationScore ?? userObj.reputation_score ?? 100,
          trustLevel: userObj.trustLevel ?? userObj.trust_level ?? 'LEVEL_1_NEWBIE',
          createdAt: userObj.createdAt ?? userObj.created_at,
        }
      : undefined,
    reviewedBy: adminObj
      ? {
          id: adminObj.id,
          email: adminObj.email,
          fullName: adminObj.fullName ?? adminObj.full_name,
        }
      : undefined,
  };
}
