import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, Role, SellerRequestStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../core/prisma/prisma.service';
import { MailService } from '../../core/mail/mail.service';
import { generateStaffBaseEmail } from '../auth/utils/staff-email.util';
import { CreateStaffDto } from './dto/create-staff.dto';
import { QuerySellerRequestsDto } from './dto/query-seller-requests.dto';
import { QueryStaffDto } from './dto/query-staff.dto';
import { RejectSellerRequestDto } from './dto/reject-seller-request.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  // ================= 1. TẠO TÀI KHOẢN CHO STAFF =================
  async createStaff(dto: CreateStaffDto) {
    if (!dto.password) {
      return this.inviteStaff(dto);
    }

    const { email, password, fullName, phoneNumber } = dto;

    // Kiểm tra xem đã có tài khoản Staff hoặc Admin liên kết với email này chưa
    const existingStaff = await this.prisma.user.findFirst({
      where: {
        AND: [
          {
            OR: [
              { email: { equals: email, mode: 'insensitive' } },
              { personalEmail: { equals: email, mode: 'insensitive' } },
            ],
          },
          { role: { in: [Role.ADMIN, Role.SUPPORT_STAFF] } },
        ],
      },
    });

    if (existingStaff) {
      throw new BadRequestException(
        `Email '${email}' đã liên kết với tài khoản ${existingStaff.role} trong hệ thống.`,
      );
    }

    // Luôn sinh email công tác theo chuẩn: Tên + Viết tắt Họ Đệm + @staff.com
    const baseName = generateStaffBaseEmail(fullName);
    let assignedEmail = `${baseName}@staff.com`;
    for (let idx = 2; idx <= 99; idx++) {
      const taken = await this.prisma.user.findFirst({
        where: { OR: [{ email: assignedEmail }, { platformEmail: assignedEmail }] },
      });
      if (!taken) {
        break;
      }
      assignedEmail = `${baseName}${idx}@staff.com`;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Luôn tạo tài khoản Staff mới với email công tác @staff.com, không ghi đè tài khoản Buyer/Seller
    const staffUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: assignedEmail,
          platformEmail: assignedEmail,
          personalEmail: email,
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
        platformEmail: staffUser.platformEmail,
        personalEmail: staffUser.personalEmail,
        fullName: staffUser.fullName,
        phoneNumber: staffUser.phoneNumber,
        role: staffUser.role,
        isVerified: staffUser.isVerified,
        createdAt: staffUser.createdAt,
      },
    };
  }

  // ================= 1b. GỬI EMAIL MỜI CHO STAFF =================
  async inviteStaff(dto: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    department?: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: {
        AND: [
          {
            OR: [
              { email: { equals: dto.email, mode: 'insensitive' } },
              { personalEmail: { equals: dto.email, mode: 'insensitive' } },
            ],
          },
          { role: { in: [Role.ADMIN, Role.SUPPORT_STAFF] } },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Email cá nhân '${dto.email}' đã liên kết với tài khoản ${existing.role} trong hệ thống.`,
      );
    }

    const baseName = generateStaffBaseEmail(dto.fullName);
    let assignedEmail = `${baseName}@staff.com`;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: assignedEmail, mode: 'insensitive' } },
          { platformEmail: { equals: assignedEmail, mode: 'insensitive' } },
        ],
      },
    });
    const existingInvitation = await this.prisma.staffInvitation.findFirst({
      where: {
        assignedEmail: { equals: assignedEmail, mode: 'insensitive' },
        isAccepted: false,
      },
    });

    if (existingUser || existingInvitation) {
      let index = 2;
      while (index <= 99) {
        assignedEmail = `${baseName}${index}@staff.com`;
        const userCheck = await this.prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: assignedEmail, mode: 'insensitive' } },
              { platformEmail: { equals: assignedEmail, mode: 'insensitive' } },
            ],
          },
        });
        const invCheck = await this.prisma.staffInvitation.findFirst({
          where: {
            assignedEmail: { equals: assignedEmail, mode: 'insensitive' },
            isAccepted: false,
          },
        });
        if (!userCheck && !invCheck) break;
        index++;
      }
    }

    // Sinh mã token kích hoạt bảo mật
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

    const invitation = await this.prisma.staffInvitation.create({
      data: {
        fullName: dto.fullName.trim(),
        personalEmail: dto.email.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
        department: dto.department?.trim() || null,
        token,
        expiresAt,
        assignedEmail,
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('ADMIN_PORTAL_URL') ||
      'http://localhost:5173';
    const activationLink = `${frontendUrl}/staff/activate?token=${token}`;

    await this.mailService.sendEmail({
      to: dto.email,
      subject: 'Thư mời kích hoạt tài khoản Staff',
      text: `Xin chào ${dto.fullName},\n\nBạn được Admin mời gia nhập đội ngũ Quản trị & Hỗ trợ (Staff).\n\nTài khoản công tác nền tảng cấp cho bạn: ${assignedEmail}\n\nThông tin xác nhận:\n- Họ và tên: ${dto.fullName}\n- Số điện thoại: ${dto.phoneNumber || 'Chưa cung cấp'}\n- Email cá nhân nhận thư: ${dto.email}\n- Tài khoản công ty cấp: ${assignedEmail}\n\nVui lòng truy cập đường dẫn sau để xác nhận lại thông tin và tạo mật khẩu mới:\n${activationLink}\n\nSau khi hoàn tất, bạn sẽ sử dụng tài khoản ${assignedEmail} và mật khẩu mới tạo để đăng nhập vào hệ thống với vai trò Staff.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb; margin-top: 0;">Chào mừng bạn gia nhập đội ngũ Support Staff</h2>
          <p>Xin chào <strong>${dto.fullName}</strong>,</p>
          <p>Quản trị viên đã khởi tạo lời mời gia nhập đội ngũ Staff cho bạn trên hệ thống.</p>
          
          <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 15px 0;">
            <p style="margin: 4px 0;"><strong>Tài khoản công tác được cấp:</strong> <span style="color: #2563eb; font-weight: bold; font-size: 15px;">${assignedEmail}</span></p>
            <p style="margin: 4px 0;"><strong>Họ và tên:</strong> ${dto.fullName}</p>
            <p style="margin: 4px 0;"><strong>Số điện thoại:</strong> ${dto.phoneNumber || 'Chưa cung cấp'}</p>
            <p style="margin: 4px 0;"><strong>Email cá nhân nhận thư:</strong> ${dto.email}</p>
          </div>

          <p>Vui lòng nhấp vào liên kết dưới đây để xác nhận lại thông tin và thiết lập mật khẩu mới cho tài khoản:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${activationLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản Staff</a>
          </div>
          <p style="font-size: 13px; color: #475569;">Sau khi hoàn tất, bạn sẽ sử dụng tài khoản <strong>${assignedEmail}</strong> và mật khẩu mới tạo để đăng nhập vào hệ thống với vai trò là <strong>Staff</strong>.</p>
        </div>
      `,
    });

    return {
      success: true,
      message: `Đã gửi thư mời kích hoạt tài khoản Staff tới email cá nhân ${dto.email}`,
      invitationId: invitation.id,
      assignedEmail,
      token,
      staff: {
        id: invitation.id,
        email: assignedEmail,
        personalEmail: dto.email,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        department: dto.department,
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
}
