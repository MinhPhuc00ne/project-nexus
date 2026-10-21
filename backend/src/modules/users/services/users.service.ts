import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Role } from '@nexus/types';
import { SellerRequestStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import { UpdateProfileDto, ApplySellerUpgradeDto, ReviewSellerUpgradeDto } from '../dtos/users.dto';

export interface UserProfileResponse {
  id: string;
  email: string;
  personalEmail?: string | null;
  platformEmail?: string | null;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: Role;
  isSellerActive: boolean;
  walletBalance: number;
  reputationScore: number;
  trustLevel: string;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: CloudinaryStorageService,
  ) {}

  // 1. PROFILE.VIEW: Lấy thông tin cá nhân và số dư ví
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    return {
      id: user.id,
      email: user.email,
      personalEmail: user.personalEmail,
      platformEmail: user.platformEmail,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      role: user.role as Role,
      isSellerActive: user.isSellerActive,
      walletBalance: user.wallet ? Number(user.wallet.balance) : 0,
      reputationScore: user.reputationScore,
      trustLevel: user.trustLevel,
      createdAt: user.createdAt,
    };
  }

  // 2. PROFILE.UPDATE: Cập nhật thông tin cá nhân
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.phoneNumber !== undefined ? { phoneNumber: dto.phoneNumber } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        updatedAt: new Date(),
      },
      include: {
        wallet: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      personalEmail: updated.personalEmail,
      platformEmail: updated.platformEmail,
      fullName: updated.fullName,
      phoneNumber: updated.phoneNumber,
      avatarUrl: updated.avatarUrl,
      role: updated.role as Role,
      isSellerActive: updated.isSellerActive,
      walletBalance: updated.wallet ? Number(updated.wallet.balance) : 0,
      reputationScore: updated.reputationScore,
      trustLevel: updated.trustLevel,
      createdAt: updated.createdAt,
    };
  }

  // 3. Buyer nộp hồ sơ xin nâng cấp lên Seller (kèm file/ảnh chứng minh)
  async applySellerUpgrade(
    userId: string,
    dto: ApplySellerUpgradeDto,
  ): Promise<{ success: boolean; message: string; requestId: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Kiểm tra xem đã có request pending hay chưa
    const existingPending = await this.prisma.sellerUpgradeRequest.findFirst({
      where: {
        userId: userId,
        status: SellerRequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'You already have a pending seller upgrade request currently under review',
      );
    }

    const newRequest = await this.prisma.sellerUpgradeRequest.create({
      data: {
        id: crypto.randomUUID(),
        userId: userId,
        storeName: dto.storeName,
        storeDescription: dto.storeDescription || null,
        phone: dto.phone,
        businessEmail: dto.businessEmail || null,
        identityCardNumber: dto.identityCardNumber || null,
        attachmentUrl: dto.attachmentUrl,
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

    if (!request) {
      throw new NotFoundException('Seller upgrade request not found');
    }

    if (request.status !== SellerRequestStatus.PENDING) {
      throw new BadRequestException(
        `Request has already been processed with status: ${request.status}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Update request status
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

      // Nếu duyệt thành công: nâng role thành SELLER và cho phép chuyển đổi
      if (dto.status === SellerRequestStatus.APPROVED) {
        await tx.user.update({
          where: { id: request.userId },
          data: {
            role: Role.SELLER,
            isSellerActive: true,
            updatedAt: new Date(),
          },
        });
      }
    });

    this.logger.log(`Seller request ${requestId} reviewed by admin ${adminId}: ${dto.status}`);

    return {
      success: true,
      message: `Seller upgrade request has been ${dto.status.toLowerCase()}`,
    };
  }

  // 6. Chuyển đổi qua lại giữa role Seller hoặc Buyer (Toggle Seller Mode)
  // Khi buyer đã trở thành tài khoản seller thì có thể chuyển đổi qua lại giữa role seller hoặc buyer
  async toggleSellerMode(userId: string): Promise<{
    success: boolean;
    isSellerActive: boolean;
    currentMode: 'SELLER' | 'BUYER';
  }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Phải có role là SELLER hoặc ADMIN mới được chuyển đổi chế độ bán hàng
    if (user.role !== Role.SELLER && user.role !== Role.ADMIN) {
      throw new BadRequestException(
        'Account is not registered as a Seller. Please submit a seller upgrade application first.',
      );
    }

    const newSellerActive = !user.isSellerActive;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSellerActive: newSellerActive,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`User ${userId} toggled seller mode: ${newSellerActive ? 'SELLER' : 'BUYER'}`);

    return {
      success: true,
      isSellerActive: newSellerActive,
      currentMode: newSellerActive ? 'SELLER' : 'BUYER',
    };
  }
}
