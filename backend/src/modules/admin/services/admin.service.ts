import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  StaffProvisioningService,
  StaffInvitationInput,
  ProvisionedStaffResult,
} from '../../auth/services/staff-provisioning.service';
import { CreateStaffDto } from '../dtos/create-staff.dto';
import { QuerySellerRequestsDto } from '../dtos/query-seller-requests.dto';
import { QueryStaffDto } from '../dtos/query-staff.dto';
import { RejectSellerRequestDto } from '../dtos/reject-seller-request.dto';
import { ReviewWithdrawalDto } from '../dtos/review-withdrawal.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly staffProvisioning: StaffProvisioningService,
  ) {}

  async createStaff(dto: CreateStaffDto): Promise<ProvisionedStaffResult> {
    return this.staffProvisioning.invite(dto);
  }

  async inviteStaff(dto: StaffInvitationInput): Promise<ProvisionedStaffResult> {
    return this.staffProvisioning.invite(dto);
  }

  // ================= 2. DANH SÁCH TÀI KHOẢN STAFF =================
  async listStaff(query: QueryStaffDto) {
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

  // ================= 3. LẤY DANH SÁCH YÊU CẦU NÂNG CẤP LÊN SELLER =================
  async getSellerRequests(query: QuerySellerRequestsDto) {
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

  // ================= 4. CHI TIẾT YÊU CẦU NÂNG CẤP =================
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

  // ================= 5. ADMIN DUYỆT YÊU CẦU NÂNG CẤP (APPROVE) =================
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
      // 1. Cập nhật trạng thái yêu cầu sang APPROVED
      const updatedRequest = await tx.sellerUpgradeRequest.update({
        where: { id },
        data: {
          status: SellerRequestStatus.APPROVED,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
      });

      // 2. Nâng cấp quyền người dùng thành SELLER và kích hoạt chế độ bán hàng (isSellerActive = true)
      const updatedUser = await tx.user.update({
        where: { id: request.userId },
        data: {
          role: Role.SELLER,
          isSellerActive: true,
        },
      });

      // 2.1 Tự động tạo sổ địa chỉ mặc định cho Seller nếu có thông tin địa chỉ cửa hàng
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

      // 3. Gửi thông báo hệ thống cho người dùng
      await tx.notification.create({
        data: {
          userId: request.userId,
          title: 'Yêu cầu nâng cấp Người bán (Seller) đã được phê duyệt! 🎉',
          content: `Chúc mừng bạn! Yêu cầu đăng ký gian hàng "${request.storeName}" đã được Quản trị viên phê duyệt. Bạn hiện đã trở thành Người bán chính thức trên Project Nexus và có toàn quyền chuyển đổi giữa giao diện Người bán và Người mua.`,
          type: NotificationType.SYSTEM,
        },
      });

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

  // ================= 6. ADMIN TỪ CHỐI YÊU CẦU NÂNG CẤP (REJECT) =================
  async rejectSellerRequest(id: string, adminId: string, dto: RejectSellerRequestDto) {
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
      // 1. Cập nhật yêu cầu sang REJECTED kèm lý do
      const rejected = await tx.sellerUpgradeRequest.update({
        where: { id },
        data: {
          status: SellerRequestStatus.REJECTED,
          rejectionReason: dto.rejectionReason.trim(),
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        },
      });

      // 2. Gửi thông báo hệ thống giải thích lý do cho người dùng
      await tx.notification.create({
        data: {
          userId: request.userId,
          title: 'Yêu cầu nâng cấp Người bán (Seller) bị từ chối',
          content: `Yêu cầu đăng ký gian hàng "${request.storeName}" của bạn không được phê duyệt. Lý do: ${dto.rejectionReason.trim()}. Bạn có thể chuẩn bị lại thông tin và gửi lại yêu cầu mới.`,
          type: NotificationType.SYSTEM,
        },
      });

      return rejected;
    });

    return {
      message: 'Đã từ chối yêu cầu nâng cấp người bán.',
      request: updatedRequest,
    };
  }

  // ================= 7. DANH SÁCH YÊU CẦU RÚT TIỀN CỦA SELLER =================
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

  // ================= 8. DUYỆT HOẶC TỪ CHỐI RÚT TIỀN =================
  async reviewWithdrawalRequest(id: string, adminId: string, dto: ReviewWithdrawalDto) {
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

        // Trả lại tiền từ lockedBalance về balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            lockedBalance: { decrement: amount },
            balance: { increment: amount },
          },
        });

        // Cập nhật WalletTransaction tương ứng sang FAILED
        await tx.walletTransaction.updateMany({
          where: { referenceId: req.id },
          data: {
            status: WalletTransactionStatus.FAILED,
            description: `Từ chối rút tiền: ${dto.rejectionReason.trim()}`,
          },
        });
      } else {
        // APPROVED hoặc COMPLETED: Trừ hẳn lockedBalance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            lockedBalance: { decrement: amount },
          },
        });

        // Cập nhật WalletTransaction tương ứng sang SUCCESS
        await tx.walletTransaction.updateMany({
          where: { referenceId: req.id },
          data: {
            status: WalletTransactionStatus.SUCCESS,
            description: dto.adminNote?.trim() || 'Rút tiền về tài khoản ngân hàng thành công',
          },
        });
      }

      // Cập nhật trạng thái WithdrawalRequest
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

      // Gửi thông báo đến Seller
      await tx.notification.create({
        data: {
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
        },
      });
    });

    return {
      success: true,
      message: `Đã cập nhật yêu cầu rút tiền thành ${dto.status}.`,
    };
  }
}
