import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { ConfirmChangePasswordOtpDto } from '../dto/confirm-change-password-otp.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

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

@Injectable()
export class AuthProfileService {
  private readonly logger = new Logger(AuthProfileService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        personalEmail: true,
        platformEmail: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        isSellerActive: true,
        reputationScore: true,
        trustLevel: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    }

    const data: {
      fullName?: string;
      phoneNumber?: string | null;
      avatarUrl?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (dto.fullName) {
      data.fullName = dto.fullName.trim();
    }
    if (dto.phoneNumber !== undefined) {
      data.phoneNumber = dto.phoneNumber.trim() || null;
    }
    if (dto.avatarUrl !== undefined) {
      data.avatarUrl = dto.avatarUrl.trim() || null;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        personalEmail: true,
        platformEmail: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        isSellerActive: true,
        reputationScore: true,
        trustLevel: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async requestChangePasswordOtp(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng.');
    }

    const recipientEmail = user.personalEmail || user.email;
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verificationCode: otp,
        codeExpiresAt: expiresAt,
      },
    });

    await this.sendPasswordChangeOtpEmail(recipientEmail, user.fullName, otp);

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[DEV ONLY] OTP change password for ${recipientEmail}: ${otp}`);
    }

    return {
      success: true,
      message: `Mã OTP xác thực đổi mật khẩu đã được gửi đến email ${recipientEmail}.`,
    };
  }

  async confirmChangePasswordWithOtp(
    userId: string,
    dto: ConfirmChangePasswordOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.verificationCode || !user.codeExpiresAt) {
      throw new BadRequestException('Chưa có yêu cầu gửi mã OTP hoặc mã OTP không hợp lệ.');
    }

    if (user.codeExpiresAt < new Date()) {
      throw new BadRequestException(
        'Mã OTP đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng yêu cầu mã mới.',
      );
    }

    if (user.verificationCode !== dto.otp) {
      throw new BadRequestException('Mã OTP không chính xác. Vui lòng kiểm tra lại.');
    }

    if (user.passwordHash) {
      const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
      if (isSamePassword) {
        throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

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
    try {
      await this.transporter.sendMail({
        from: `"Project Nexus E-Commerce" <${this.configService.get<string>('SMTP_USER')}>`,
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
    } catch (error) {
      this.logger.warn(
        `[DEV MODE] Gửi email đổi mật khẩu thất bại (chưa cấu hình SMTP): ${(error as Error).message}`,
      );
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException(
          'Không thể gửi email xác nhận đổi mật khẩu. Vui lòng kiểm tra lại cấu hình SMTP.',
        );
      }
    }
  }
}
