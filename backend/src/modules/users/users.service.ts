import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role, SellerRequestStatus } from '@prisma/client';
import * as fs from 'fs';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CloudinaryStorageService } from '../../core/storage/cloudinary.service';
import { assertCleanContent } from '../../core/moderation/content-moderation.util';
import { CreateSellerRequestDto } from './dto/create-seller-request.dto';
import { ToggleSellerDto } from './dto/toggle-seller.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: CloudinaryStorageService,
  ) {}

  // ================= 1. THÔNG TIN NGƯỜI DÙNG HIỆN TẠI (GET /me) =================
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
      isSellerActive: user.isSellerActive,
      currentMode: user.isSellerActive ? 'SELLER' : 'BUYER',
      canToggleSeller:
        user.role === Role.SELLER || user.role === Role.ADMIN || user.role === Role.SUPPORT_STAFF,
      reputationScore: user.reputationScore,
      trustLevel: user.trustLevel,
      isVerified: user.isVerified,
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

  // ================= 2. CHUYỂN ĐỔI CHẾ ĐỘ BUYER <-> SELLER =================
  async toggleSellerMode(userId: string, dto?: ToggleSellerDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }

    // Chỉ tài khoản đã nâng cấp thành SELLER (hoặc ADMIN) mới được phép chuyển đổi
    if (user.role !== Role.SELLER && user.role !== Role.ADMIN && user.role !== Role.SUPPORT_STAFF) {
      throw new ForbiddenException(
        'Bạn chưa được cấp quyền Seller. Chỉ tài khoản đã nâng cấp thành công lên Người bán mới có quyền chuyển đổi giữa chế độ Người mua và Người bán. Vui lòng gửi yêu cầu nâng cấp lên Admin.',
      );
    }

    const nextState = dto?.isSellerActive !== undefined ? dto.isSellerActive : !user.isSellerActive;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isSellerActive: nextState },
    });

    return {
      message: nextState
        ? 'Chuyển sang chế độ Người bán (Seller mode) thành công!'
        : 'Chuyển về chế độ Người mua (Buyer mode) thành công!',
      isSellerActive: updatedUser.isSellerActive,
      currentMode: updatedUser.isSellerActive ? 'SELLER' : 'BUYER',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        isSellerActive: updatedUser.isSellerActive,
      },
    };
  }

  // ================= 3. BUYER GỬI YÊU CẦU NÂNG CẤP LÊN SELLER =================
  async createSellerRequest(
    userId: string,
    dto: CreateSellerRequestDto,
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

    // Xác định đường dẫn file đính kèm chứng minh từ file upload hoặc từ dto
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

    // Bắt buộc phải có file hoặc chứng từ đính kèm để chứng minh danh tính/kinh doanh
    if (!attachmentUrl) {
      throw new BadRequestException(
        'Vui lòng tải lên file hoặc đính kèm tài liệu chứng minh (CCCD/CMND hoặc Giấy phép kinh doanh) để gửi yêu cầu nâng cấp.',
      );
    }

    // Kiểm tra xem đã có yêu cầu PENDING nào chưa
    const existingPending = await this.prisma.sellerUpgradeRequest.findFirst({
      where: {
        userId,
        status: SellerRequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'Bạn đã có một yêu cầu nâng cấp tài khoản đang chờ Admin xét duyệt. Vui lòng không gửi thêm yêu cầu mới.',
      );
    }

    const request = await this.prisma.sellerUpgradeRequest.create({
      data: {
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

    return {
      message:
        'Gửi yêu cầu nâng cấp lên Người bán thành công kèm tài liệu chứng minh! Quản trị viên sẽ kiểm tra và phê duyệt yêu cầu của bạn.',
      request,
    };
  }

  // ================= 4. XEM DANH SÁCH YÊU CẦU NÂNG CẤP CỦA TÔI =================
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
