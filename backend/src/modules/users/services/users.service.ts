import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@nexus/types';
import { NotificationType, SellerRequestStatus, User, Wallet } from '@prisma/client';
import * as fs from 'fs';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAllAdmins } from '../../../core/notifications/admin-notification.util';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import { ProfileReauthService } from '../../../core/security/profile-reauth.service';
import { toggleSellerState, userMode } from '../../../core/security/user-mode';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import { UpdateBuyerProfileInput, UserProfileResponse } from '../dtos/users.dto';
import { CreateSellerRequestInput } from '../dtos/create-seller-request.dto';
import { ToggleSellerInput } from '../dtos/toggle-seller.dto';
import { UpdateStaffProfileInput } from '../../auth/dtos/update-staff-profile.dto';

import { ReputationService } from './reputation.service';

export type { UserProfileResponse };

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: CloudinaryStorageService,
    private readonly profileReauth: ProfileReauthService,
    private readonly reputationService: ReputationService,
  ) {}

  private formatProfile(user: User & { wallet: Wallet | null }): UserProfileResponse {
    return {
      id: user.id,
      email: user.email,
      personalEmail: user.personalEmail,
      platformEmail: user.platformEmail,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      role: user.role as Role,
      ...userMode(user),
      isShopSuspended: user.isShopSuspended,
      suspensionReason: user.suspensionReason,
      walletBalance: user.wallet ? Number(user.wallet.balance) : 0,
      reputationScore: user.reputationScore,
      trustLevel: user.trustLevel,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      accountHolderName: user.accountHolderName,
      createdAt: user.createdAt,
    };
  }

  /**
   * Retrieves user profile details and associated wallet balances.
   *
   * @param userId - Unique identifier of the user
   * @returns Formatted user profile
   * @throws NotFoundException when user does not exist
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException(`User with ID '${userId}' not found`);
    return this.formatProfile(user);
  }

  /**
   * Updates support staff profile details.
   *
   * @param userId - Unique identifier of the staff user
   * @param dto - Updated staff profile payload
   * @returns Formatted user profile
   * @throws ForbiddenException when user is not support staff
   * @throws BadRequestException when full name is invalid
   */
  async updateStaffProfile(
    userId: string,
    dto: UpdateStaffProfileInput,
  ): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'SUPPORT_STAFF')
      throw new ForbiddenException('Chỉ Staff được chỉnh hồ sơ Staff của chính mình.');
    if (dto.fullName !== undefined && dto.fullName.trim().length < 2)
      throw new BadRequestException('Họ tên không hợp lệ.');
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName?.trim(),
        phoneNumber: dto.phoneNumber,
        avatarUrl: dto.avatarUrl,
      },
      include: { wallet: true },
    });
    return this.formatProfile(updated);
  }

  private shouldRequireProfileReauth(dto: UpdateBuyerProfileInput): boolean {
    const hasPersonalUpdate =
      dto.fullName !== undefined || dto.phoneNumber !== undefined || dto.avatarUrl !== undefined;
    const hasBankUpdate =
      dto.bankName !== undefined ||
      dto.accountNumber !== undefined ||
      dto.accountHolderName !== undefined;
    return hasPersonalUpdate || !hasBankUpdate;
  }

  private buildProfileUpdateData(dto: UpdateBuyerProfileInput): Record<string, unknown> {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl;
    if (dto.bankName !== undefined) data.bankName = dto.bankName?.trim() || null;
    if (dto.accountNumber !== undefined) {
      data.accountNumber = dto.accountNumber?.replace(/[\s-]+/g, '').trim() || null;
    }
    if (dto.accountHolderName !== undefined) {
      data.accountHolderName = dto.accountHolderName?.trim()?.toUpperCase() || null;
    }
    return data;
  }

  private async awardMissingProfileCompletion(
    userId: string,
    user: User,
    dto: UpdateBuyerProfileInput,
  ): Promise<void> {
    if (dto.fullName && !user.fullName) {
      await this.reputationService.awardProfileCompletion({
        userId,
        fieldKey: 'FULL_NAME',
        points: 5,
        reason: 'Cập nhật họ và tên đầy đủ',
      });
    }
    if (dto.avatarUrl && !user.avatarUrl) {
      await this.reputationService.awardProfileCompletion({
        userId,
        fieldKey: 'AVATAR',
        points: 5,
        reason: 'Cập nhật ảnh đại diện',
      });
    }
    if (dto.phoneNumber && !user.phoneNumber) {
      await this.reputationService.awardProfileCompletion({
        userId,
        fieldKey: 'PHONE',
        points: 10,
        reason: 'Cập nhật số điện thoại liên hệ hợp lệ',
      });
    }
    const hasBankInput = Boolean(dto.bankName || dto.accountNumber || dto.accountHolderName);
    if (hasBankInput && (!user.bankName || !user.accountNumber)) {
      await this.reputationService.awardProfileCompletion({
        userId,
        fieldKey: 'BANK',
        points: 10,
        reason: 'Cập nhật thông tin tài khoản ngân hàng',
      });
    }
  }

  /**
   * Updates buyer or seller personal profile information, requiring re-authentication for seller
   * personal fields while allowing bank payout updates without password confirmation.
   *
   * @param userId - Unique identifier of the user
   * @param dto - Updated profile payload
   * @param _callerRole - Optional caller role
   * @param verificationToken - Optional re-authentication token
   * @returns Formatted user profile
   * @throws NotFoundException when user does not exist
   * @throws ForbiddenException when role is not permitted to edit personal profile
   */
  async updateProfile(
    userId: string,
    dto: UpdateBuyerProfileInput,
    _callerRole?: Role,
    verificationToken?: string,
  ): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const effectiveRole = user.role;
    if (effectiveRole !== Role.BUYER && effectiveRole !== Role.SELLER) {
      throw new ForbiddenException('Chỉ Buyer và Seller được phép chỉnh sửa hồ sơ cá nhân.');
    }

    if (this.shouldRequireProfileReauth(dto)) {
      await this.profileReauth.assert(user, {
        password: dto.password,
        verificationToken: verificationToken || dto.verificationToken,
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: this.buildProfileUpdateData(dto),
      include: { wallet: true },
    });

    await this.awardMissingProfileCompletion(userId, user, dto);

    return this.formatProfile(updated);
  }

  /**
   * Uploads seller verification proof document to Cloudinary or local storage.
   *
   * @param fileBuffer - Buffer of the uploaded proof document
   * @param fileName - Original file name
   * @returns Public URL of the uploaded document
   */
  async uploadProofDocument(fileBuffer: Buffer, fileName: string): Promise<{ url: string }> {
    const res = await this.storageService.uploadFile(fileBuffer, fileName, 'nexus/seller-proofs');
    return { url: res.url };
  }

  /**
   * Toggle between buyer and seller view modes for eligible users.
   *
   * @param userId Authenticated user ID.
   * @param dto Optional explicit toggle state.
   * @returns Updated mode state and user details.
   */
  async toggleSellerMode(userId: string, dto?: ToggleSellerInput) {
    const user = await toggleSellerState(this.prisma, userId, dto?.isSellerActive);
    const newSellerActive = user.isSellerActive;

    this.logger.log(`User ${userId} toggled seller mode: ${newSellerActive ? 'SELLER' : 'BUYER'}`);
    return {
      success: true,
      message: newSellerActive
        ? 'Chuyển sang chế độ Người bán (Seller mode) thành công!'
        : 'Chuyển về chế độ Người mua (Buyer mode) thành công!',
      isSellerActive: newSellerActive,
      currentMode: newSellerActive ? ('SELLER' as const) : ('BUYER' as const),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        ...userMode(user),
      },
    };
  }

  /**
   * Retrieve full current user profile including wallet balance and seller capabilities.
   *
   * @param userId Authenticated user ID.
   * @returns Detailed user account and wallet status.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: {
          select: {
            balance: true,
            lockedBalance: true,
            currency: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isShopSuspended: user.isShopSuspended,
      suspensionReason: user.suspensionReason,
      ...userMode(user),
      canToggleSeller:
        (user.role === Role.SELLER ||
          user.role === Role.ADMIN ||
          user.role === Role.SUPPORT_STAFF) &&
        !user.isShopSuspended,
      reputationScore: user.reputationScore,
      trustLevel: user.trustLevel,
      isVerified: user.isVerified,
      bankName: user.bankName,
      accountNumber: user.accountNumber,
      accountHolderName: user.accountHolderName,
      wallet: user.wallet
        ? {
            balance: Number(user.wallet.balance),
            lockedBalance: Number(user.wallet.lockedBalance),
            currency: user.wallet.currency,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Submit seller upgrade request with supporting business or identity documents.
   *
   * @param userId Authenticated buyer ID.
   * @param dto Request metadata and shop information.
   * @param file Uploaded identity or business verification document.
   * @returns Submission confirmation and created request.
   */
  async createSellerRequest(
    userId: string,
    dto: CreateSellerRequestInput,
    file?: Express.Multer.File,
  ) {
    assertCleanContent(dto.storeName, 'Tên gian hàng');
    if (dto.storeDescription) {
      assertCleanContent(dto.storeDescription, 'Mô tả gian hàng');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    if (user.role !== Role.BUYER) {
      if (user.role === Role.ADMIN || user.role === Role.SUPPORT_STAFF) {
        throw new ForbiddenException(
          `Tài khoản với vai trò ${user.role} là nhân sự quản trị hệ thống, không được phép gửi yêu cầu nâng cấp lên Người bán.`,
        );
      }
      if (user.role === Role.SELLER) {
        throw new BadRequestException(
          'Tài khoản của bạn đã là Người bán (Seller) rồi. Bạn không cần gửi yêu cầu nâng cấp nữa.',
        );
      }
      throw new ForbiddenException(
        'Chỉ tài khoản Người mua (BUYER) mới có quyền gửi yêu cầu nâng cấp lên Người bán.',
      );
    }

    let attachmentUrl = dto.attachmentUrl?.trim();
    if (file) {
      const port = process.env.PORT_BACKEND || '3000';
      attachmentUrl = `http://localhost:${port}/uploads/seller-proofs/${file.filename}`;

      try {
        let fileBuffer = file.buffer;
        if (!fileBuffer && file.path && fs.existsSync(file.path)) {
          fileBuffer = fs.readFileSync(file.path);
        }

        if (fileBuffer) {
          const cloudRes = await this.storageService.uploadFile(
            fileBuffer,
            file.originalname || file.filename,
            'nexus/seller-proofs',
          );
          if (cloudRes && cloudRes.url && !cloudRes.url.startsWith('data:')) {
            attachmentUrl = cloudRes.url;
            this.logger.log(
              `Tải file chứng minh của Buyer lên Cloudinary thành công: ${attachmentUrl}`,
            );
          }
        }
      } catch (uploadError) {
        this.logger.warn(
          `Không thể upload file chứng minh lên Cloudinary, sử dụng URL cục bộ: ${uploadError}`,
        );
      }
    }

    if (!attachmentUrl) {
      throw new BadRequestException(
        'Vui lòng tải lên file hoặc đính kèm tài liệu chứng minh (CCCD/CMND hoặc Giấy phép kinh doanh) để gửi yêu cầu nâng cấp.',
      );
    }

    const existingPending = await this.prisma.sellerUpgradeRequest.findFirst({
      where: {
        userId,
        status: SellerRequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'Bạn đã có một yêu cầu nâng cấp đang chờ duyệt. Vui lòng đợi quản trị viên xử lý trước khi gửi yêu cầu mới.',
      );
    }

    const request = await this.prisma.sellerUpgradeRequest.create({
      data: {
        userId,
        storeName: dto.storeName.trim(),
        storeDescription: dto.storeDescription?.trim() || null,
        phone: dto.phone?.trim() || user.phoneNumber || '',
        businessEmail: dto.businessEmail?.trim() || null,
        attachmentUrl,
        street: dto.street?.trim() || null,
        ward: dto.ward?.trim() || null,
        district: dto.district?.trim() || null,
        city: dto.city?.trim() || null,
        latitude:
          dto.latitude !== undefined && dto.latitude !== null && String(dto.latitude).trim() !== ''
            ? Number(dto.latitude)
            : null,
        longitude:
          dto.longitude !== undefined &&
          dto.longitude !== null &&
          String(dto.longitude).trim() !== ''
            ? Number(dto.longitude)
            : null,
        formattedAddress: dto.formattedAddress?.trim() || null,
        placeId: dto.placeId?.trim() || null,
        status: SellerRequestStatus.PENDING,
      },
    });

    await notifyAllAdmins(this.prisma, {
      title: 'Yêu cầu nâng cấp Seller mới',
      content: `Gian hàng "${dto.storeName.trim()}" vừa gửi hồ sơ đăng ký nâng cấp lên Seller chờ phê duyệt.`,
      type: NotificationType.SYSTEM,
      targetUrl: '/admin/sellers',
    });

    return {
      message:
        'Gửi yêu cầu nâng cấp lên Người bán thành công kèm tài liệu chứng minh! Quản trị viên sẽ kiểm tra và phê duyệt yêu cầu của bạn.',
      request,
    };
  }

  /**
   * Retrieve list of seller upgrade requests submitted by current user.
   *
   * @param userId Authenticated user ID.
   * @returns Total count and list of seller upgrade requests.
   */
  async getMySellerRequests(userId: string) {
    const requests = await this.prisma.sellerUpgradeRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return {
      total: requests.length,
      requests,
    };
  }
}
