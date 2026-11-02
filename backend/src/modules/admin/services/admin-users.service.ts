import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus, ReputationTrustLevel, Role, User } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { generateStaffBaseEmail } from '../../auth/utils/staff-email.util';
import { LockUserDto, UpdateUserStatusDto } from '../dtos/lock-user.dto';
import { QueryUsersDto, UserStatusFilter } from '../dtos/query-users.dto';
import { UpdateUserRoleDto } from '../dtos/update-user-role.dto';
import {
  AdminUserDetailResponse,
  AdminUserItemResponse,
  AdminUsersListResponse,
} from '../dtos/user-response.dto';

type UserWithWallet = User & {
  wallet?: { balance: Prisma.Decimal } | null;
};

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. Lấy danh sách người dùng (tự động loại trừ GUEST, hỗ trợ lọc BUYER, SELLER, SUPPORT_STAFF, ADMIN)
  async listUsers(query: QueryUsersDto): Promise<AdminUsersListResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, query.limit || 10);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: query.role ? (query.role as unknown as Role) : { not: Role.GUEST },
    };

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
        include: { wallet: { select: { balance: true } } },
      }),
    ]);

    return {
      items: users.map((u) => this.toUserItem(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 2. Xem chi tiết cá nhân người dùng (loại trừ GUEST)
  async getUserById(targetUserId: string): Promise<AdminUserDetailResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, role: { not: Role.GUEST } },
      include: {
        wallet: { select: { balance: true, lockedBalance: true, currency: true } },
        addresses: { orderBy: { isDefault: 'desc' } },
        _count: {
          select: {
            products: true,
            ordersAsBuyer: true,
            ordersAsSeller: true,
            auctions: true,
            disputesOpened: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    const base = this.toUserItem(user);

    return {
      ...base,
      personalEmail: user.personalEmail,
      wallet: user.wallet
        ? {
            balance: Number(user.wallet.balance),
            lockedBalance: Number(user.wallet.lockedBalance),
            currency: user.wallet.currency,
          }
        : null,
      addresses: user.addresses,
      stats: {
        products: user._count.products,
        ordersAsBuyer: user._count.ordersAsBuyer,
        ordersAsSeller: user._count.ordersAsSeller,
        auctions: user._count.auctions,
        disputesOpened: user._count.disputesOpened,
      },
    };
  }

  // 3. Khóa tài khoản người dùng
  async lockUser(
    targetUserId: string,
    adminId: string,
    dto?: LockUserDto,
  ): Promise<{ success: boolean; message: string; user: AdminUserItemResponse }> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { wallet: { select: { balance: true } } },
    });

    if (!user || user.role === Role.GUEST) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    if (user.id === adminId || user.role === Role.ADMIN) {
      throw new BadRequestException('Không thể khóa tài khoản Quản trị viên (Admin).');
    }

    if (user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new BadRequestException('Tài khoản này đã bị khóa từ trước.');
    }

    const isSeller = user.role === Role.SELLER;

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        trustLevel: ReputationTrustLevel.SUSPENDED,
        ...(isSeller
          ? {
              isShopSuspended: true,
              isSellerActive: false,
              suspensionReason:
                dto?.reason?.trim() || 'Tài khoản người bán bị khóa bởi Quản trị viên',
            }
          : {}),
      },
      include: { wallet: { select: { balance: true } } },
    });

    if (isSeller) {
      await this.prisma.product.updateMany({
        where: { sellerId: targetUserId, status: ProductStatus.ACTIVE },
        data: { status: ProductStatus.INACTIVE },
      });
    }

    // Thu hồi toàn bộ Refresh Token của user để buộc đăng xuất ngay lập tức
    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log(
      `Admin (${adminId}) đã khóa tài khoản ${user.email} (${user.id}). Lý do: ${dto?.reason || 'Không có'}`,
    );

    return {
      success: true,
      message: `Khóa tài khoản ${user.email} thành công.`,
      user: this.toUserItem(updated),
    };
  }

  // 4. Mở khóa tài khoản người dùng
  async unlockUser(
    targetUserId: string,
    adminId: string,
    dto?: LockUserDto,
  ): Promise<{ success: boolean; message: string; user: AdminUserItemResponse }> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { wallet: { select: { balance: true } } },
    });

    if (!user || user.role === Role.GUEST) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    if (user.trustLevel !== ReputationTrustLevel.SUSPENDED) {
      throw new BadRequestException('Tài khoản này hiện không ở trạng thái bị khóa.');
    }

    const targetTrustLevel =
      user.reputationScore >= 100 ? ReputationTrustLevel.EXCELLENT : ReputationTrustLevel.STANDARD;
    const isSeller = user.role === Role.SELLER;

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        trustLevel: targetTrustLevel,
        ...(isSeller
          ? {
              isShopSuspended: false,
              isSellerActive: true,
              suspensionReason: null,
            }
          : {}),
      },
      include: { wallet: { select: { balance: true } } },
    });

    if (isSeller) {
      await this.prisma.product.updateMany({
        where: { sellerId: targetUserId, status: ProductStatus.INACTIVE },
        data: { status: ProductStatus.ACTIVE },
      });
    }

    this.logger.log(
      `Admin (${adminId}) đã mở khóa tài khoản ${user.email} (${user.id}). Lý do: ${dto?.reason || 'Không có'}`,
    );

    return {
      success: true,
      message: `Mở khóa tài khoản ${user.email} thành công.`,
      user: this.toUserItem(updated),
    };
  }

  // 5. Cập nhật trạng thái khóa/mở khóa qua DTO
  async updateUserStatus(targetUserId: string, adminId: string, dto: UpdateUserStatusDto) {
    return dto.isLocked === false
      ? this.unlockUser(targetUserId, adminId, { reason: dto.reason })
      : this.lockUser(targetUserId, adminId, { reason: dto.reason });
  }

  // 6. Cập nhật vai trò (Role) cho người dùng
  async updateUserRole(
    targetUserId: string,
    adminId: string,
    dto: UpdateUserRoleDto,
  ): Promise<{ success: boolean; message: string; user: AdminUserItemResponse }> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { wallet: { select: { balance: true } } },
    });
    if (!user || user.role === Role.GUEST)
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    if (user.id === adminId && dto.role !== Role.ADMIN) {
      throw new BadRequestException('Quản trị viên không thể tự hạ quyền của chính mình.');
    }

    let platformEmail = user.platformEmail;
    if (dto.role === Role.SUPPORT_STAFF && !platformEmail) {
      const baseName = generateStaffBaseEmail(user.fullName);
      let assignedEmail = `${baseName}@staff.com`;
      for (let idx = 2; idx <= 99; idx++) {
        const taken = await this.prisma.user.findFirst({
          where: { OR: [{ email: assignedEmail }, { platformEmail: assignedEmail }] },
        });
        if (!taken) {
          platformEmail = assignedEmail;
          break;
        }
        assignedEmail = `${baseName}${idx}@staff.com`;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: dto.role,
        platformEmail: platformEmail || undefined,
        personalEmail:
          user.personalEmail || (dto.role === Role.SUPPORT_STAFF ? user.email : undefined),
        isSellerActive: dto.role === Role.SELLER ? true : user.isSellerActive,
      },
      include: { wallet: { select: { balance: true } } },
    });

    // Thu hồi toàn bộ Refresh Token của user để đồng bộ role mới ngay lập tức
    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log(`Admin (${adminId}) đã chuyển vai trò của user ${user.email} sang ${dto.role}`);

    return {
      success: true,
      message: `Đã cập nhật vai trò của tài khoản thành ${dto.role} thành công!`,
      user: this.toUserItem(updated),
    };
  }

  // Helper chuyển đổi User entity sang DTO response
  private toUserItem(u: UserWithWallet): AdminUserItemResponse {
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
  }
}
