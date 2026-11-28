import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Role } from '@nexus/contracts';
import { NotificationType, SellerRequestStatus, User, Wallet } from '@prisma/client';
import * as fs from 'fs';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { notifyAllAdmins } from '../../../core/notifications/admin-notification.util';
import { NotificationPublisher } from '../../../core/notifications/notification-publisher.service';
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
    @Optional() private readonly notifications?: NotificationPublisher,
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
      throw new ForbiddenException('Only Staff members can edit their own Staff profile.');
    if (dto.fullName !== undefined && dto.fullName.trim().length < 2)
      throw new BadRequestException('Invalid full name.');
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
        reason: 'Completed full name',
      });
    }
    if (dto.avatarUrl && !user.avatarUrl) {
      await this.reputationService.awardProfileCompletion({
        userId,
        fieldKey: 'AVATAR',
        points: 5,
        reason: 'Updated profile avatar',
      });
    }
    if (dto.phoneNumber && !user.phoneNumber) {
      await this.reputationService.awardProfileCompletion({
        userId,
        fieldKey: 'PHONE',
        points: 10,
        reason: 'Updated valid contact phone number',
      });
    }
    const hasBankInput = Boolean(dto.bankName || dto.accountNumber || dto.accountHolderName);
    if (hasBankInput && (!user.bankName || !user.accountNumber)) {
      await this.reputationService.awardProfileCompletion({
        userId,
        fieldKey: 'BANK',
        points: 10,
        reason: 'Updated bank account information',
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
      throw new ForbiddenException('Only Buyers and Sellers can edit their personal profile.');
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
        ? 'Switched to Seller mode successfully!'
        : 'Switched back to Buyer mode successfully!',
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
      throw new NotFoundException('User profile not found.');
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
    assertCleanContent(dto.storeName, 'Shop name');
    if (dto.storeDescription) {
      assertCleanContent(dto.storeDescription, 'Shop description');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    if (user.role !== Role.BUYER) {
      if (user.role === Role.ADMIN || user.role === Role.SUPPORT_STAFF) {
        throw new ForbiddenException(
          `Accounts with role ${user.role} belong to platform administration and cannot submit seller upgrade requests.`,
        );
      }
      if (user.role === Role.SELLER) {
        throw new BadRequestException(
          'Your account is already a Seller. You do not need to submit an upgrade request.',
        );
      }
      throw new ForbiddenException(
        'Only Buyer (BUYER) accounts can submit seller upgrade requests.',
      );
    }

    let attachmentUrl = dto.attachmentUrl?.trim();
    if (file) {
      const port = process.env.PORT || process.env.PORT_BACKEND || '3000';
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
              `Successfully uploaded buyer verification document to Cloudinary: ${attachmentUrl}`,
            );
          }
        }
      } catch (uploadError) {
        this.logger.warn(
          `Unable to upload verification document to Cloudinary, using local URL: ${uploadError}`,
        );
      }
    }

    if (!attachmentUrl) {
      throw new BadRequestException(
        'Please upload a file or attach a verification document (National ID or Business License) to submit an upgrade request.',
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
        'You already have a pending upgrade request. Please wait for an administrator to review it before submitting a new one.',
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

    await notifyAllAdmins(
      this.prisma,
      {
        title: 'New Seller upgrade request',
        content: `Shop "${dto.storeName.trim()}" has submitted a seller upgrade application for approval.`,
        type: NotificationType.SYSTEM,
        targetUrl: '/admin/sellers',
      },
      this.notifications,
    );

    return {
      message:
        'Seller upgrade request and verification document submitted successfully! An administrator will review and approve your request.',
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
