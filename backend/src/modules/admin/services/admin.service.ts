import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import { AuditLogService } from '../../../core/audit/audit-log.service';
import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  Role,
  SellerRequestStatus,
  WalletTransactionStatus,
  WithdrawalStatus,
} from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  ProvisionedStaffResult,
  StaffInvitationInput,
  StaffProvisioningService,
} from '../../auth/services/staff-provisioning.service';
import { CreateStaffInput } from '../dtos/create-staff.dto';
import { QuerySellerRequestsInput } from '../dtos/query-seller-requests.dto';
import { QueryStaffInput } from '../dtos/query-staff.dto';
import { RejectSellerRequestInput } from '../dtos/reject-seller-request.dto';
import { ReviewWithdrawalInput } from '../dtos/review-withdrawal.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffProvisioning: StaffProvisioningService,
    @Optional() private readonly notifications?: NotificationPublisher,
    @Optional() private readonly auditLog?: AuditLogService,
  ) {}

  /**
   * Provisions a new support staff account.
   *
   * @param dto - Staff creation payload
   * @returns Provisioned staff credentials and profile
   */
  async createStaff(dto: CreateStaffInput, adminId?: string): Promise<ProvisionedStaffResult> {
    const result = await this.staffProvisioning.invite(dto);
    await this.auditLog?.record({
      eventName: 'admin.staff.created',
      operatorId: adminId ?? null,
      payload: {
        staffId: result.staff.id,
        platformEmail: result.staff.platformEmail,
        personalEmail: result.staff.personalEmail,
        department: dto.department ?? null,
      },
    });
    return result;
  }

  /**
   * Invites a new support staff member.
   *
   * @param dto - Invitation input payload
   * @returns Provisioned staff result
   */
  async inviteStaff(dto: StaffInvitationInput, adminId?: string): Promise<ProvisionedStaffResult> {
    const result = await this.staffProvisioning.invite(dto);
    await this.auditLog?.record({
      eventName: 'admin.staff.invited',
      operatorId: adminId ?? null,
      payload: {
        staffId: result.staff.id,
        platformEmail: result.staff.platformEmail,
        personalEmail: result.staff.personalEmail,
        department: dto.department ?? null,
      },
    });
    return result;
  }

  /**
   * Retrieves paginated list of support staff accounts.
   *
   * @param query - Query filter and pagination parameters
   * @returns Paginated staff list
   */
  async listStaff(query: QueryStaffInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const skip = (page - 1) * limit;

    const where: {
      role: Role;
      OR?: Array<{
        fullName?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
      }>;
    } = {
      role: Role.SUPPORT_STAFF,
    };

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, staffList] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          avatarUrl: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      items: staffList,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves paginated seller upgrade applications.
   *
   * @param query - Query filter and pagination parameters
   * @returns Paginated list of seller requests
   */
  async getSellerRequests(query: QuerySellerRequestsInput) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const skip = (page - 1) * limit;

    const where: { status?: SellerRequestStatus } = {};
    if (query.status) {
      where.status = query.status;
    }

    const [total, requests] = await Promise.all([
      this.prisma.sellerUpgradeRequest.count({ where }),
      this.prisma.sellerUpgradeRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phoneNumber: true,
              avatarUrl: true,
              role: true,
              isSellerActive: true,
              reputationScore: true,
              trustLevel: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    return {
      items: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves detailed seller upgrade application by ID.
   *
   * @param id - Unique identifier of the upgrade request
   * @returns Detailed seller upgrade request
   * @throws NotFoundException when the request does not exist
   */
  async getSellerRequestById(id: string) {
    const request = await this.prisma.sellerUpgradeRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            avatarUrl: true,
            role: true,
            isSellerActive: true,
            reputationScore: true,
            trustLevel: true,
            createdAt: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu nâng cấp với ID đã cung cấp.');
    }

    return request;
  }

  /**
   * Approves a seller upgrade request and provisions seller store defaults.
   *
   * @param id - Unique identifier of the upgrade request
   * @param adminId - Unique identifier of the reviewing administrator
   * @returns Approval confirmation and updated user record
   * @throws NotFoundException when request does not exist
   * @throws BadRequestException when request has already been processed
   */
  async approveSellerRequest(id: string, adminId: string) {
    const request = await this.prisma.sellerUpgradeRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu nâng cấp.');
    }

    if (request.status !== SellerRequestStatus.PENDING) {
      throw new BadRequestException(
        `Yêu cầu này đã được xử lý trước đó với trạng thái: ${request.status}.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.sellerUpgradeRequest.update({
        where: { id },
        data: {
          status: SellerRequestStatus.APPROVED,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: request.userId },
        data: {
          role: Role.SELLER,
          isSellerActive: true,
        },
      });

      if (request.street && request.city) {
        await tx.userAddress.create({
          data: {
            userId: request.userId,
            recipientName: request.storeName,
            phone: request.phone,
            street: request.street,
            ward: request.ward,
            district: request.district,
            city: request.city,
            latitude: request.latitude,
            longitude: request.longitude,
            formattedAddress: request.formattedAddress,
            placeId: request.placeId,
            isDefault: true,
          },
        });
      }

      await publishNotification(
        tx,
        {
          userId: request.userId,
          title: 'Yêu cầu nâng cấp Người bán (Seller) đã được phê duyệt! 🎉',
          content: `Chúc mừng bạn! Yêu cầu đăng ký gian hàng "${request.storeName}" đã được Quản trị viên phê duyệt. Bạn hiện đã trở thành Người bán chính thức trên Project Nexus và có toàn quyền chuyển đổi giữa giao diện Người bán và Người mua.`,
          type: NotificationType.SYSTEM,
        },
        this.notifications,
      );

      return { updatedRequest, updatedUser };
    });

    return {
      message: 'Phê duyệt yêu cầu nâng cấp thành công! Người dùng đã được cấp quyền SELLER.',
      request: result.updatedRequest,
      user: {
        id: result.updatedUser.id,
        email: result.updatedUser.email,
        fullName: result.updatedUser.fullName,
        role: result.updatedUser.role,
        isSellerActive: result.updatedUser.isSellerActive,
      },
    };
  }

  /**
   * Rejects a seller upgrade request with specified rejection reason.
   *
   * @param id - Unique identifier of the upgrade request
   * @param adminId - Unique identifier of the reviewing administrator
   * @param dto - Rejection payload
   * @returns Rejection confirmation
   * @throws NotFoundException when request does not exist
   * @throws BadRequestException when request has already been processed
   */
  async rejectSellerRequest(id: string, adminId: string, dto: RejectSellerRequestInput) {
    const request = await this.prisma.sellerUpgradeRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu nâng cấp.');
    }

    if (request.status !== SellerRequestStatus.PENDING) {
      throw new BadRequestException(
        `Yêu cầu này đã được xử lý trước đó với trạng thái: ${request.status}.`,
      );
    }

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      const rejected = await tx.sellerUpgradeRequest.update({
        where: { id },
        data: {
          status: SellerRequestStatus.REJECTED,
          rejectionReason: dto.rejectionReason.trim(),
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
      });

      await publishNotification(
        tx,
        {
          userId: request.userId,
          title: 'Yêu cầu nâng cấp Người bán (Seller) bị từ chối',
          content: `Yêu cầu đăng ký gian hàng "${request.storeName}" của bạn không được phê duyệt. Lý do: ${dto.rejectionReason.trim()}. Bạn có thể chuẩn bị lại thông tin và gửi lại yêu cầu mới.`,
          type: NotificationType.SYSTEM,
        },
        this.notifications,
      );

      return rejected;
    });

    return {
      message: 'Đã từ chối yêu cầu nâng cấp người bán.',
      request: updatedRequest,
    };
  }

  /**
   * Retrieves paginated seller withdrawal requests.
   *
   * @param status - Optional status filter
   * @param page - Page number
   * @param limit - Page size
   * @returns Paginated withdrawal requests
   */
  async listWithdrawalRequests(status?: WithdrawalStatus, page = 1, limit = 10) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (p - 1) * l;

    const where: Prisma.WithdrawalRequestWhereInput = status ? { status } : {};
    const [total, items] = await Promise.all([
      this.prisma.withdrawalRequest.count({ where }),
      this.prisma.withdrawalRequest.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              role: true,
              sellerUpgradeRequests: {
                where: { status: SellerRequestStatus.APPROVED },
                take: 1,
                select: { storeName: true },
              },
            },
          },
          reviewedBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      }),
    ]);

    return {
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
      items: items.map((w) => ({
        id: w.id,
        userId: w.userId,
        userRole: w.user.role,
        sellerName: w.user.sellerUpgradeRequests[0]?.storeName || w.user.fullName,
        sellerEmail: w.user.email,
        sellerPhone: w.user.phoneNumber,
        amount: Number(w.amount),
        bankName: w.bankName,
        accountNumber: w.accountNumber,
        accountHolderName: w.accountHolderName,
        status: w.status,
        rejectionReason: w.rejectionReason,
        adminNote: w.adminNote,
        reviewedBy: w.reviewedBy,
        reviewedAt: w.reviewedAt,
        createdAt: w.createdAt,
      })),
    };
  }

  /**
   * Reviews and approves or rejects a seller withdrawal request.
   *
   * @param id - Unique identifier of the withdrawal request
   * @param adminId - Unique identifier of the reviewing administrator
   * @param dto - Review status and reason
   * @returns Review confirmation
   * @throws NotFoundException when request does not exist
   * @throws BadRequestException when request has already been processed or rejected without reason
   */
  async reviewWithdrawalRequest(id: string, adminId: string, dto: ReviewWithdrawalInput) {
    const req = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            wallet: true,
          },
        },
      },
    });

    if (!req) {
      throw new NotFoundException('Không tìm thấy yêu cầu rút tiền.');
    }

    if (req.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('Yêu cầu rút tiền này đã được xử lý trước đó.');
    }

    const wallet = req.user.wallet;
    if (!wallet) {
      throw new BadRequestException('Người dùng này không có ví.');
    }

    const amount = req.amount;

    await this.prisma.$transaction(async (tx) => {
      if (dto.status === WithdrawalStatus.REJECTED) {
        if (!dto.rejectionReason?.trim()) {
          throw new BadRequestException('Vui lòng nhập lý do từ chối yêu cầu rút tiền.');
        }

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            lockedBalance: { decrement: amount },
            balance: { increment: amount },
          },
        });

        await tx.walletTransaction.updateMany({
          where: { referenceId: req.id },
          data: {
            status: WalletTransactionStatus.FAILED,
            description: `Từ chối rút tiền: ${dto.rejectionReason.trim()}`,
          },
        });
      } else {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            lockedBalance: { decrement: amount },
          },
        });

        await tx.walletTransaction.updateMany({
          where: { referenceId: req.id },
          data: {
            status: WalletTransactionStatus.SUCCESS,
            description: dto.adminNote?.trim() || 'Rút tiền về tài khoản ngân hàng thành công',
          },
        });
      }

      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: dto.status,
          rejectionReason: dto.rejectionReason?.trim() || null,
          adminNote: dto.adminNote?.trim() || null,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
      });

      await publishNotification(
        tx,
        {
          userId: req.userId,
          title:
            dto.status === WithdrawalStatus.REJECTED
              ? 'Yêu cầu rút tiền của bạn bị từ chối ⚠️'
              : 'Yêu cầu rút tiền đã được phê duyệt thành công 🎉',
          content:
            dto.status === WithdrawalStatus.REJECTED
              ? `Yêu cầu rút ${Number(amount).toLocaleString('vi-VN')} VND về ${req.bankName} (${req.accountNumber}) đã bị từ chối. Lý do: ${dto.rejectionReason}. Số tiền đã được hoàn trả lại ví của bạn.`
              : `Yêu cầu rút ${Number(amount).toLocaleString('vi-VN')} VND về ${req.bankName} (${req.accountNumber}) đã được xử lý thành công. Tiền sẽ về tài khoản ngân hàng của bạn trong ít phút.`,
          type: NotificationType.PAYMENT,
          targetUrl: req.user.role === 'SELLER' ? '/seller/finance' : '/buyer/wallet',
        },
        this.notifications,
      );

      await this.auditLog?.record(
        {
          eventName: 'admin.withdrawal.reviewed',
          operatorId: adminId,
          payload: {
            withdrawalId: id,
            targetUserId: req.userId,
            status: dto.status,
            amount: Number(amount),
            rejectionReason: dto.rejectionReason ?? null,
          },
        },
        tx,
      );
    });

    return {
      success: true,
      message: `Đã cập nhật yêu cầu rút tiền thành ${dto.status}.`,
    };
  }
}
