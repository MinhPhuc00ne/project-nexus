import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../../../core/mail/mail.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ConfirmChangePasswordOtpInput } from '../dtos/confirm-change-password-otp.dto';
import { UpdateAuthProfileInput } from '../dtos/update-profile.dto';
import { UpdateStaffProfileInput } from '../dtos/update-staff-profile.dto';
import { ChangePasswordInput } from '../dtos/auth.dto';
import { ProfileReauthService } from '../../../core/security/profile-reauth.service';
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { userMode } from '../../../core/security/user-mode';

export interface UserProfileResponse {
  id: string;
  email: string;
  personalEmail?: string | null;
  platformEmail?: string | null;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: string;
  isSellerActive: boolean;
  reputationScore: number;
  trustLevel: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const profileSelect = {
  id: true,
  email: true,
  personalEmail: true,
  platformEmail: true,
  fullName: true,
  phoneNumber: true,
  avatarUrl: true,
  role: true,
  isSellerActive: true,
  isShopSuspended: true,
  reputationScore: true,
  trustLevel: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthProfileService {
  private readonly logger = new Logger(AuthProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    _configService: ConfigService,
    private readonly profileReauth: ProfileReauthService,
    private readonly tokenAuth: TokenAuthService,
    private readonly mailService: MailService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: profileSelect,
    });
    if (!user) throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    return { ...user, ...userMode(user) };
  }

  async updateProfile(userId: string, dto: UpdateAuthProfileInput): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    if (user.role !== 'BUYER' && user.role !== 'SELLER') {
      throw new ForbiddenException('Chỉ Buyer và Seller được phép chỉnh sửa hồ sơ cá nhân.');
    }
    await this.profileReauth.assert(user, dto);
    const data: {
      fullName?: string;
      phoneNumber?: string | null;
      avatarUrl?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (dto.fullName) data.fullName = dto.fullName.trim();
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber.trim() || null;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl.trim() || null;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: profileSelect,
    });
    return { ...updated, ...userMode(updated) };
  }

  /**
   * Update staff personal profile attributes.
   *
   * @param userId Support staff user ID.
   * @param dto Profile update parameters.
   * @returns Updated user profile.
   */
  async updateStaffProfile(
    userId: string,
    dto: UpdateStaffProfileInput,
  ): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'SUPPORT_STAFF') {
      throw new ForbiddenException('Chỉ Staff được chỉnh hồ sơ Staff của chính mình.');
    }
    if (dto.fullName !== undefined && dto.fullName.trim().length < 2) {
      throw new BadRequestException('Họ tên không hợp lệ.');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName?.trim(),
        phoneNumber: dto.phoneNumber,
        avatarUrl: dto.avatarUrl,
      },
      select: profileSelect,
    });
    return { ...updated, ...userMode(updated) };
  }

  async reauthenticate(
    userId: string,
    password: string,
  ): Promise<{ verificationToken: string; expiresIn: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !['BUYER', 'SELLER'].includes(user.role)) {
      throw new ForbiddenException('Chỉ Buyer/Seller được xác minh cập nhật hồ sơ tại đây.');
    }
    return this.profileReauth.issue(user, password);
  }

  async requestChangePasswordOtp(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    const recipientEmail = user.personalEmail || user.email;
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationCode: otp, codeExpiresAt: expiresAt },
    });
    await this.sendPasswordChangeOtpEmail(recipientEmail, user.fullName, otp);
    return {
      success: true,
      message: `Mã OTP xác thực đổi mật khẩu đã được gửi đến email ${recipientEmail}.`,
    };
  }

  async confirmChangePasswordWithOtp(
    userId: string,
    dto: ConfirmChangePasswordOtpInput,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.verificationCode || !user.codeExpiresAt) {
      throw new BadRequestException('Chưa có yêu cầu gửi mã OTP hoặc mã OTP không hợp lệ.');
    }
    if (user.codeExpiresAt < new Date())
      throw new BadRequestException(
        'Mã OTP đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng yêu cầu mã mới.',
      );
    if (user.verificationCode !== dto.otp)
      throw new BadRequestException('Mã OTP không chính xác. Vui lòng kiểm tra lại.');
    if (user.passwordHash && (await bcrypt.compare(dto.newPassword, user.passwordHash))) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: {
          id: userId,
          verificationCode: dto.otp,
          codeExpiresAt: { gt: new Date() },
          passwordHash: user.passwordHash,
        },
        data: { passwordHash, verificationCode: null, codeExpiresAt: null },
      });
      if (changed.count !== 1)
        throw new BadRequestException('Mã OTP đã được dùng hoặc đã hết hạn.');
      await tx.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });
    });
    // The refresh tokens are gone; the access tokens still in circulation have
    // to stop working too, or the old password keeps a session alive.
    await this.tokenAuth.revokeAllSessions(userId);
    return {
      success: true,
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
    };
  }

  /**
   * Change user password directly with current password verification.
   *
   * @param userId Authenticated user ID.
   * @param dto Current and new password payload.
   * @returns Success confirmation.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordInput,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng.');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('Tài khoản này chưa thiết lập mật khẩu.');
    }
    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });
    await this.tokenAuth.revokeAllSessions(userId);
    return {
      success: true,
      message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
    };
  }

  private async sendPasswordChangeOtpEmail(
    email: string,
    fullName: string,
    otp: string,
  ): Promise<void> {
    const success = await this.mailService.sendEmail({
      to: email,
      subject: '[Project Nexus] Mã OTP xác nhận đổi mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Xác nhận đổi mật khẩu tài khoản</h2>
          <p>Xin chào <strong>${fullName || 'Quý khách'}</strong>,</p>
          <p>Hệ thống nhận được yêu cầu đổi mật khẩu cho tài khoản của bạn tại <strong>Project Nexus</strong>.</p>
          <p>Mã xác thực OTP của bạn là:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 28px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #1e3a8a; margin: 20px 0;">
            ${otp}
          </div>
          <p>Mã OTP có hiệu lực trong vòng <strong>15 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 25px;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ quản trị viên để bảo vệ tài khoản.</p>
        </div>
      `,
    });
    if (!success && process.env.NODE_ENV === 'production') {
      this.logger.warn('Gửi email đổi mật khẩu thất bại.');
      throw new BadRequestException(
        'Không thể gửi email xác nhận đổi mật khẩu. Vui lòng kiểm tra lại cấu hình SMTP.',
      );
    }
  }
}
