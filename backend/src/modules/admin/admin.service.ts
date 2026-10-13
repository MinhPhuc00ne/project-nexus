import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role, SellerRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QuerySellerRequestsDto } from './dto/query-seller-requests.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { RejectSellerRequestDto } from './dto/reject-seller-request.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= 1. TẠO TÀI KHOẢN CHO STAFF =================
  async createStaff(dto: CreateStaffDto) {
    const { email, password, fullName, phoneNumber } = dto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng trong hệ thống.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const staffUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phoneNumber: phoneNumber || null,
          role: Role.SUPPORT_STAFF,
          isVerified: true, // Tài khoản do Admin khởi tạo được xác thực tự động
        },
      });

      // Khởi tạo ví cho nhân viên
      await tx.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          lockedBalance: 0,
        },
      });

      return user;
    });

    return {
      message: 'Tạo tài khoản nhân viên hỗ trợ (Support Staff) thành công!',
      staff: {
        id: staffUser.id,
        email: staffUser.email,
        fullName: staffUser.fullName,
        phoneNumber: staffUser.phoneNumber,
        role: staffUser.role,
        isVerified: staffUser.isVerified,
        createdAt: staffUser.createdAt,
      },
    };
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
}
