import { SellerPickupService } from '../../fulfillment/services/seller-pickup.service';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Role } from '@nexus/types';
import { SellerRequestStatus, User, Wallet } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import { ProfileReauthService } from '../../../core/security/profile-reauth.service';
import { toggleSellerState, userMode } from '../../../core/security/user-mode';
import { assertCleanContent } from '../../../core/moderation/content-moderation.util';
import {
  UpdateBuyerProfileDto,
  ApplySellerUpgradeDto,
  ReviewSellerUpgradeDto,
  UserProfileResponse,
} from '../dtos/users.dto';
import { UpdateShopProfileDto } from '../dtos/update-shop-profile.dto';
import { UpdateStaffProfileDto } from '../../auth/dto/update-staff-profile.dto';

export type { UserProfileResponse };

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: CloudinaryStorageService,
    private readonly profileReauth: ProfileReauthService,
    private readonly pickup: SellerPickupService,
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

  // 1. PROFILE.VIEW: Lấy thông tin cá nhân và số dư ví
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException(`User with ID '${userId}' not found`);
    return this.formatProfile(user);
  }

  async updateStaffProfile(
    userId: string,
    dto: UpdateStaffProfileDto,
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

  // 2. PROFILE.UPDATE: Cập nhật thông tin cá nhân (chỉ Buyer & Seller; Seller yêu cầu xác minh lại mật khẩu gần đây)
  async updateProfile(
    userId: string,
    dto: UpdateBuyerProfileDto,
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

    await this.profileReauth.assert(user, {
      password: dto.password,
      verificationToken: verificationToken || dto.verificationToken,
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.bankName !== undefined ? { bankName: dto.bankName?.trim() || null } : {}),
        ...(dto.accountNumber !== undefined
          ? { accountNumber: dto.accountNumber?.trim() || null }
          : {}),
        ...(dto.accountHolderName !== undefined
          ? { accountHolderName: dto.accountHolderName?.trim()?.toUpperCase() || null }
          : {}),
        updatedAt: new Date(),
      },
      include: { wallet: true },
    });
    return this.formatProfile(updated);
  }

  // 3. Buyer nộp hồ sơ xin nâng cấp lên Seller (kèm thông tin cửa hàng, địa chỉ & file chứng minh)
  async applySellerUpgrade(
    userId: string,
    dto: ApplySellerUpgradeDto,
    file?: Express.Multer.File,
  ): Promise<{ success: boolean; message: string; requestId: string }> {
    assertCleanContent(dto.storeName, 'Tên gian hàng');
    if (dto.storeDescription) {
      assertCleanContent(dto.storeDescription, 'Mô tả gian hàng');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

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

    const existingPending = await this.prisma.sellerUpgradeRequest.findFirst({
      where: { userId, status: SellerRequestStatus.PENDING },
    });

    if (existingPending) {
      throw new ConflictException(
        'You already have a pending seller upgrade request currently under review',
      );
    }

    let attachmentUrl = dto.attachmentUrl?.trim();
    if (file && file.buffer) {
      const cloudRes = await this.storageService.uploadFile(
        file.buffer,
        file.originalname || 'proof-document',
        'nexus/seller-proofs',
      );
      if (cloudRes?.url) {
        attachmentUrl = cloudRes.url;
      }
    }

    if (!attachmentUrl) {
      throw new BadRequestException(
        'Vui lòng tải lên file hoặc đính kèm tài liệu chứng minh (CCCD/CMND hoặc Giấy phép kinh doanh).',
      );
    }

    const newRequest = await this.prisma.sellerUpgradeRequest.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        storeName: dto.storeName.trim(),
        storeDescription: dto.storeDescription?.trim() || null,
        phone: dto.phone.trim(),
        businessEmail: dto.businessEmail?.trim() || null,
        identityCardNumber: dto.identityCardNumber?.trim() || null,
        attachmentUrl,
        street: dto.street?.trim() || null,
        ward: dto.ward?.trim() || null,
        district: dto.district?.trim() || null,
        city: dto.city?.trim() || null,
        latitude: dto.latitude !== undefined && dto.latitude !== null ? Number(dto.latitude) : null,
        longitude:
          dto.longitude !== undefined && dto.longitude !== null ? Number(dto.longitude) : null,
        formattedAddress: dto.formattedAddress?.trim() || null,
        placeId: dto.placeId?.trim() || null,
        status: SellerRequestStatus.PENDING,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Seller upgrade application submitted by user ${userId} (${newRequest.id})`);
    return {
      success: true,
      message: 'Seller upgrade application submitted successfully. Awaiting Admin approval.',
      requestId: newRequest.id,
    };
  }

  // Upload file/ảnh chứng minh lên Cloudinary / Storage
  async uploadProofDocument(fileBuffer: Buffer, fileName: string): Promise<{ url: string }> {
    const res = await this.storageService.uploadFile(fileBuffer, fileName, 'nexus/seller-proofs');
    return { url: res.url };
  }

  // 4. Admin xem danh sách hồ sơ nâng cấp Seller
  async listSellerRequests(status?: SellerRequestStatus) {
    return this.prisma.sellerUpgradeRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            reputationScore: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 5. Admin duyệt hồ sơ nâng cấp Seller (Chỉ Admin duyệt)
  async reviewSellerUpgrade(
    requestId: string,
    adminId: string,
    dto: ReviewSellerUpgradeDto,
  ): Promise<{ success: boolean; message: string }> {
    const request = await this.prisma.sellerUpgradeRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Seller upgrade request not found');

    if (request.status !== SellerRequestStatus.PENDING) {
      throw new BadRequestException(
        `Request has already been processed with status: ${request.status}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerUpgradeRequest.update({
        where: { id: requestId },
        data: {
          status: dto.status,
          rejectionReason: dto.rejectionReason || null,
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      if (dto.status === SellerRequestStatus.APPROVED) {
        await tx.user.update({
          where: { id: request.userId },
          data: { role: Role.SELLER, isSellerActive: true, updatedAt: new Date() },
        });

        // Tự động tạo địa chỉ kho/cửa hàng cho Seller nếu có thông tin địa chỉ
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
      }
    });

    this.logger.log(`Seller request ${requestId} reviewed by admin ${adminId}: ${dto.status}`);
    return {
      success: true,
      message: `Seller upgrade request has been ${dto.status.toLowerCase()}`,
    };
  }

  // 6. Chuyển đổi qua lại giữa role Seller hoặc Buyer (Toggle Seller Mode)
  async toggleSellerMode(userId: string): Promise<{
    success: boolean;
    message: string;
    isSellerActive: boolean;
    currentMode: 'SELLER' | 'BUYER';
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      isSellerActive: boolean;
    };
  }> {
    const user = await toggleSellerState(this.prisma, userId);
    const newSellerActive = user.isSellerActive;

    this.logger.log(`User ${userId} toggled seller mode: ${newSellerActive ? 'SELLER' : 'BUYER'}`);
    return {
      success: true,
      message: newSellerActive
        ? 'Chuyển sang chế độ Người bán (Seller mode) thành công!'
        : 'Chuyển về chế độ Người mua (Buyer mode) thành công!',
      isSellerActive: newSellerActive,
      currentMode: newSellerActive ? 'SELLER' : 'BUYER',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        ...userMode(user),
      },
    };
  }

  // 7. Lấy thông tin hồ sơ gian hàng của Seller
  async getShopProfile(sellerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    const latestApproved = user.sellerUpgradeRequests[0];
    const defaultAddress = user.addresses[0];

    return {
      id: user.id,
      storeName: latestApproved?.storeName || user.fullName,
      shopAvatarUrl: user.shopAvatarUrl,
      avatarUrl: user.shopAvatarUrl,
      storeDescription: latestApproved?.storeDescription || null,
      phone: latestApproved?.phone || user.phoneNumber,
      businessEmail: latestApproved?.businessEmail || user.email,
      address: latestApproved
        ? {
            street: latestApproved.street,
            ward: latestApproved.ward,
            district: latestApproved.district,
            city: latestApproved.city,
            formattedAddress: latestApproved.formattedAddress,
            latitude: latestApproved.latitude ? Number(latestApproved.latitude) : null,
            longitude: latestApproved.longitude ? Number(latestApproved.longitude) : null,
            placeId: latestApproved.placeId,
          }
        : defaultAddress
          ? {
              street: defaultAddress.street,
              ward: defaultAddress.ward,
              district: defaultAddress.district,
              city: defaultAddress.city,
              formattedAddress: defaultAddress.formattedAddress,
              latitude: defaultAddress.latitude ? Number(defaultAddress.latitude) : null,
              longitude: defaultAddress.longitude ? Number(defaultAddress.longitude) : null,
              placeId: defaultAddress.placeId,
            }
          : null,
      isSellerActive: user.isSellerActive,
      isShopSuspended: user.isShopSuspended,
      suspensionReason: user.suspensionReason,
      reputationScore: user.reputationScore,
      trustLevel: user.trustLevel,
      createdAt: latestApproved?.createdAt || user.createdAt,
      updatedAt: latestApproved?.updatedAt || user.updatedAt,
    };
  }

  // 8. Cập nhật tên, mô tả, thông tin liên hệ và địa chỉ của gian hàng
  async updateShopProfile(sellerId: string, dto: UpdateShopProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
      include: {
        sellerUpgradeRequests: {
          where: { status: SellerRequestStatus.APPROVED },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    if (user.role !== Role.SELLER && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Chỉ tài khoản Người bán (Seller) mới có quyền chỉnh sửa thông tin gian hàng.',
      );
    }

    if (user.isShopSuspended) {
      throw new ForbiddenException(
        `Gian hàng của bạn hiện đang bị Admin đình chỉ hoạt động.${
          user.suspensionReason ? ` Lý do: ${user.suspensionReason}` : ''
        } Không thể chỉnh sửa hồ sơ.`,
      );
    }

    if (dto.storeName) {
      assertCleanContent(dto.storeName, 'Tên gian hàng');
    }
    if (dto.storeDescription) {
      assertCleanContent(dto.storeDescription, 'Mô tả gian hàng');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: sellerId } });
      if (current.isShopSuspended) throw new ForbiddenException('Shop đang bị đình chỉ.');
      const latestApproved = await tx.sellerUpgradeRequest.findFirst({
        where: { userId: sellerId, status: SellerRequestStatus.APPROVED },
        orderBy: { updatedAt: 'desc' },
      });
      // Store contact details belong to the shop request, not the seller's personal profile.
      if (dto.shopAvatarUrl !== undefined) {
        await tx.user.update({
          where: { id: sellerId },
          data: { shopAvatarUrl: dto.shopAvatarUrl?.trim() || null },
        });
      }

      // 2. Cập nhật hoặc tạo bản ghi SellerUpgradeRequest
      let updatedRequest;
      if (latestApproved) {
        updatedRequest = await tx.sellerUpgradeRequest.update({
          where: { id: latestApproved.id },
          data: {
            storeName: dto.storeName?.trim() || latestApproved.storeName,
            storeDescription:
              dto.storeDescription !== undefined
                ? dto.storeDescription?.trim() || null
                : latestApproved.storeDescription,
            phone: dto.phone?.trim() || latestApproved.phone,
            businessEmail:
              dto.businessEmail !== undefined
                ? dto.businessEmail?.trim() || null
                : latestApproved.businessEmail,
            street: dto.street !== undefined ? dto.street?.trim() || null : latestApproved.street,
            ward: dto.ward !== undefined ? dto.ward?.trim() || null : latestApproved.ward,
            district:
              dto.district !== undefined ? dto.district?.trim() || null : latestApproved.district,
            city: dto.city !== undefined ? dto.city?.trim() || null : latestApproved.city,
            latitude:
              dto.latitude !== undefined
                ? dto.latitude !== null
                  ? Number(dto.latitude)
                  : null
                : latestApproved.latitude,
            longitude:
              dto.longitude !== undefined
                ? dto.longitude !== null
                  ? Number(dto.longitude)
                  : null
                : latestApproved.longitude,
            formattedAddress:
              dto.formattedAddress !== undefined
                ? dto.formattedAddress?.trim() || null
                : latestApproved.formattedAddress,
            placeId:
              dto.placeId !== undefined ? dto.placeId?.trim() || null : latestApproved.placeId,
            updatedAt: new Date(),
          },
        });
      } else {
        updatedRequest = await tx.sellerUpgradeRequest.create({
          data: {
            userId: sellerId,
            storeName: dto.storeName?.trim() || user.fullName,
            storeDescription: dto.storeDescription?.trim() || null,
            phone: dto.phone?.trim() || user.phoneNumber || '0900000000',
            businessEmail: dto.businessEmail?.trim() || user.email,
            street: dto.street?.trim() || null,
            ward: dto.ward?.trim() || null,
            district: dto.district?.trim() || null,
            city: dto.city?.trim() || null,
            latitude:
              dto.latitude !== undefined && dto.latitude !== null ? Number(dto.latitude) : null,
            longitude:
              dto.longitude !== undefined && dto.longitude !== null ? Number(dto.longitude) : null,
            formattedAddress: dto.formattedAddress?.trim() || null,
            placeId: dto.placeId?.trim() || null,
            status: SellerRequestStatus.APPROVED,
          },
        });
      }

      const shippingChanged =
        !latestApproved ||
        ['storeName', 'phone', 'street', 'ward', 'district', 'city', 'latitude', 'longitude'].some(
          (key) =>
            String(latestApproved[key as keyof typeof latestApproved] ?? '') !==
            String(updatedRequest[key as keyof typeof updatedRequest] ?? ''),
        );
      if (shippingChanged) await this.pickup.invalidate(tx, sellerId);
      return updatedRequest;
    });

    let shippingSync: 'VERIFIED' | 'PENDING' = 'PENDING';
    try {
      await this.pickup.synchronize(sellerId);
      shippingSync = 'VERIFIED';
    } catch {
      this.logger.warn(
        `GHN pickup sync pending for seller ${sellerId}; retry on next shipping request.`,
      );
    }

    this.logger.log(`Seller ${sellerId} updated shop profile: ${result.storeName}`);

    return {
      success: true,
      message: 'Cập nhật thông tin gian hàng thành công!',
      shippingSync,
      shop: {
        id: sellerId,
        shopAvatarUrl:
          dto.shopAvatarUrl !== undefined ? dto.shopAvatarUrl?.trim() || null : user.shopAvatarUrl,
        avatarUrl:
          dto.shopAvatarUrl !== undefined ? dto.shopAvatarUrl?.trim() || null : user.shopAvatarUrl,
        storeName: result.storeName,
        storeDescription: result.storeDescription,
        phone: result.phone,
        businessEmail: result.businessEmail,
        address: {
          street: result.street,
          ward: result.ward,
          district: result.district,
          city: result.city,
          formattedAddress: result.formattedAddress,
          latitude: result.latitude ? Number(result.latitude) : null,
          longitude: result.longitude ? Number(result.longitude) : null,
          placeId: result.placeId,
        },
        updatedAt: result.updatedAt,
      },
    };
  }
}
