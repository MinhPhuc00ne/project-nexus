import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ReputationTrustLevel, Role } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { LockUserDto, UpdateUserStatusDto } from '../dto/lock-user.dto';
import { QueryUsersDto, UserStatusFilter } from '../dto/query-users.dto';

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

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. Lấy toàn bộ danh sách người dùng (kèm phân trang, tìm kiếm, lọc role & trạng thái khóa)
  async listUsers(query: QueryUsersDto): Promise<AdminUsersListResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.status === UserStatusFilter.LOCKED) {
      where.trustLevel = ReputationTrustLevel.SUSPENDED;
    } else if (query.status === UserStatusFilter.ACTIVE) {
      where.trustLevel = { not: ReputationTrustLevel.SUSPENDED };
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { platformEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: {
            select: { balance: true },
          },
        },
      }),
    ]);

    const items: AdminUserItemResponse[] = users.map((u) => {
      const isLocked = u.trustLevel === ReputationTrustLevel.SUSPENDED;
      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phoneNumber: u.phoneNumber,
        avatarUrl: u.avatarUrl,
        role: u.role,
        isSellerActive: u.isSellerActive,
        reputationScore: u.reputationScore,
        trustLevel: u.trustLevel,
        isLocked,
        status: isLocked ? 'LOCKED' : 'ACTIVE',
        isVerified: u.isVerified,
        platformEmail: u.platformEmail,
        walletBalance: u.wallet ? Number(u.wallet.balance) : 0,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 2. Khóa tài khoản người dùng
  async lockUser(
    targetUserId: string,
    adminId: string,
    dto?: LockUserDto,
  ): Promise<{ success: boolean; message: string; user: AdminUserItemResponse }> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { wallet: { select: { balance: true } } },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    if (user.id === adminId || user.role === Role.ADMIN) {
      throw new BadRequestException('Không thể khóa tài khoản Quản trị viên (Admin).');
    }

    if (user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new BadRequestException('Tài khoản này đã bị khóa từ trước.');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        trustLevel: ReputationTrustLevel.SUSPENDED,
      },
      include: { wallet: { select: { balance: true } } },
    });

    // Thu hồi toàn bộ Refresh Token của user để buộc đăng xuất ngay lập tức
    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log(
      `Admin (${adminId}) đã khóa tài khoản người dùng ${user.email} (${user.id}). Lý do: ${dto?.reason || 'Không có'}`,
    );

    return {
      success: true,
      message: `Khóa tài khoản ${user.email} thành công.`,
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        phoneNumber: updated.phoneNumber,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        isSellerActive: updated.isSellerActive,
        reputationScore: updated.reputationScore,
        trustLevel: updated.trustLevel,
        isLocked: true,
        status: 'LOCKED',
        isVerified: updated.isVerified,
        platformEmail: updated.platformEmail,
        walletBalance: updated.wallet ? Number(updated.wallet.balance) : 0,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  }

  // 3. Mở khóa tài khoản người dùng
  async unlockUser(
    targetUserId: string,
    adminId: string,
    dto?: LockUserDto,
  ): Promise<{ success: boolean; message: string; user: AdminUserItemResponse }> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { wallet: { select: { balance: true } } },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    if (user.trustLevel !== ReputationTrustLevel.SUSPENDED) {
      throw new BadRequestException('Tài khoản này hiện không ở trạng thái bị khóa.');
    }

    const targetTrustLevel =
      user.reputationScore >= 100 ? ReputationTrustLevel.EXCELLENT : ReputationTrustLevel.STANDARD;

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        trustLevel: targetTrustLevel,
      },
      include: { wallet: { select: { balance: true } } },
    });

    this.logger.log(
      `Admin (${adminId}) đã mở khóa tài khoản người dùng ${user.email} (${user.id}). Lý do: ${dto?.reason || 'Không có'}`,
    );

    return {
      success: true,
      message: `Mở khóa tài khoản ${user.email} thành công.`,
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        phoneNumber: updated.phoneNumber,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        isSellerActive: updated.isSellerActive,
        reputationScore: updated.reputationScore,
        trustLevel: updated.trustLevel,
        isLocked: false,
        status: 'ACTIVE',
        isVerified: updated.isVerified,
        platformEmail: updated.platformEmail,
        walletBalance: updated.wallet ? Number(updated.wallet.balance) : 0,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  }

  // 4. Toggle hoặc cập nhật trạng thái khóa/mở khóa qua DTO
  async updateUserStatus(targetUserId: string, adminId: string, dto: UpdateUserStatusDto) {
    if (dto.isLocked === false) {
      return this.unlockUser(targetUserId, adminId, { reason: dto.reason });
    }
    return this.lockUser(targetUserId, adminId, { reason: dto.reason });
  }
}
