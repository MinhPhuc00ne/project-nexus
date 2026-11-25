import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus, ReputationTrustLevel, Role, User } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { generateStaffBaseEmail } from '../../../core/domain/staff-email';
import { trustLevelFor } from '../../../core/domain/reputation-policy';
import { LockUserInput, UpdateUserStatusInput } from '../dtos/lock-user.dto';
import { QueryUsersInput, UserStatusFilter } from '../dtos/query-users.dto';
import { UpdateUserRoleInput } from '../dtos/update-user-role.dto';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenAuth: TokenAuthService,
  ) {}

  /**
   * Retrieves paginated platform user accounts with role and status filtering.
   *
   * @param query - User query parameters including search, role, and pagination
   * @returns Paginated list of user items with wallet balances
   */
  async listUsers(query: QueryUsersInput): Promise<AdminUsersListResponse> {
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

  /**
   * Retrieves detailed user profile including order and dispute statistics.
   *
   * @param targetUserId - Unique identifier of the target user
   * @returns Detailed user profile entity
   * @throws NotFoundException when the user does not exist
   */
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

  /**
   * Suspends a user account and revokes active refresh tokens.
   *
   * @param targetUserId - Unique identifier of the user to suspend
   * @param adminId - Unique identifier of the acting administrator
   * @param dto - Optional lock reason payload
   * @returns Suspension confirmation and updated user record
   * @throws NotFoundException when the user does not exist
   * @throws BadRequestException when targeting an administrator or already suspended user
   */
  async lockUser(
    targetUserId: string,
    adminId: string,
    dto?: LockUserInput,
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

    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, isRevoked: false },
      data: { isRevoked: true },
    });
    // A locked account must stop being served immediately, including on the
    // access token it is holding and on its open WebSocket connections.
    await this.tokenAuth.revokeAllSessions(targetUserId);

    this.logger.log(
      `Admin (${adminId}) đã khóa tài khoản ${user.email} (${user.id}). Lý do: ${dto?.reason || 'Không có'}`,
    );

    return {
      success: true,
      message: `Khóa tài khoản ${user.email} thành công.`,
      user: this.toUserItem(updated),
    };
  }

  /**
   * Restores an active reputation trust level for a suspended user account.
   *
   * @param targetUserId - Unique identifier of the user to unlock
   * @param adminId - Unique identifier of the administrator
   * @param dto - Optional unlock reason
   * @returns Unlock confirmation and updated user record
   * @throws NotFoundException when the user does not exist
   * @throws BadRequestException when user is not suspended
   */
  async unlockUser(
    targetUserId: string,
    adminId: string,
    dto?: LockUserInput,
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

    const targetTrustLevel = trustLevelFor(user.reputationScore);
    if (targetTrustLevel === 'SUSPENDED')
      throw new BadRequestException('Cần điều chỉnh điểm uy tín lên ít nhất 40 trước khi mở khóa.');
    const isSeller = user.role === Role.SELLER;

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        trustLevel: targetTrustLevel,
        isShopSuspended: false,
        suspensionReason: null,
        ...(isSeller
          ? {
              isSellerActive: true,
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

  /**
   * Updates lock or unlock status using a unified DTO payload.
   *
   * @param targetUserId - Unique identifier of the target user
   * @param adminId - Unique identifier of the administrator
   * @param dto - Status payload containing lock flag and reason
   * @returns Updated user status response
   */
  async updateUserStatus(targetUserId: string, adminId: string, dto: UpdateUserStatusInput) {
    return dto.isLocked === false
      ? this.unlockUser(targetUserId, adminId, { reason: dto.reason })
      : this.lockUser(targetUserId, adminId, { reason: dto.reason });
  }

  /**
   * Updates assigned role for a user and provisions staff email when applicable.
   *
   * @param targetUserId - Unique identifier of the target user
   * @param adminId - Unique identifier of the administrator
   * @param dto - Role update payload
   * @returns Updated user item response
   * @throws NotFoundException when the user does not exist
   * @throws BadRequestException when an administrator attempts to demote self
   */
  async updateUserRole(
    targetUserId: string,
    adminId: string,
    dto: UpdateUserRoleInput,
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

    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, isRevoked: false },
      data: { isRevoked: true },
    });
    // The new role is in the token claims, so the old token must not survive.
    await this.tokenAuth.revokeAllSessions(targetUserId);

    this.logger.log(`Admin (${adminId}) đã chuyển vai trò của user ${user.email} sang ${dto.role}`);

    return {
      success: true,
      message: `Đã cập nhật vai trò của tài khoản thành ${dto.role} thành công!`,
      user: this.toUserItem(updated),
    };
  }

  /**
   * Transforms raw user entity and wallet balance into admin API response item.
   *
   * @param u - User entity joined with optional wallet balance
   * @returns Formatted admin user item
   */
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
