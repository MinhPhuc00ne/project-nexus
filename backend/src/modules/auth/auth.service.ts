import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ReputationTrustLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfirmChangePasswordOtpDto } from './dto/confirm-change-password-otp.dto';

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

interface RefreshJwtPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
}

export interface GoogleUser {
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
}
@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    // Cấu hình Nodemailer gửi mail qua Gmail
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  // ================= 1. ĐĂNG KÝ =================
  async register(dto: RegisterDto) {
    const { email, password, fullName } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isVerified) {
        throw new BadRequestException('Email này đã được đăng ký và xác thực.');
      }
      // Kiểm tra thời gian chờ (cooldown 60 giây) nếu gửi lại OTP
      if (existingUser.codeExpiresAt) {
        const remainingMs = existingUser.codeExpiresAt.getTime() - Date.now();
        const cooldownMs = 60 * 1000;
        const expiryDurationMs = 10 * 60 * 1000;
        if (remainingMs > expiryDurationMs - cooldownMs) {
          const waitSeconds = Math.ceil((remainingMs - (expiryDurationMs - cooldownMs)) / 1000);
          throw new BadRequestException(
            `Vui lòng đợi ${waitSeconds} giây trước khi yêu cầu gửi lại mã OTP mới.`,
          );
        }
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // Hạn 10 phút

    await this.prisma.user.upsert({
      where: { email },
      update: {
        passwordHash,
        fullName,
        verificationCode,
        codeExpiresAt,
        isVerified: false,
      },
      create: {
        email,
        passwordHash,
        fullName,
        verificationCode,
        codeExpiresAt,
        isVerified: false,
      },
    });

    try {
      await this.transporter.sendMail({
        from: `"Project Nexus E-Commerce" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: 'Mã xác thực tài khoản Project Nexus',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #4F46E5;">Chào mừng bạn đến với Project Nexus!</h2>
            <p>Mã xác thực tài khoản của bạn là:</p>
            <h1 style="background: #F3F4F6; padding: 10px; display: inline-block; letter-spacing: 5px; color: #111827;">${verificationCode}</h1>
            <p>Mã này có hiệu lực trong vòng <b>10 phút</b>.</p>
          </div>
        `,
      });
    } catch (error) {
      Logger.warn(
        `[DEV MODE] Chưa cấu hình SMTP hoặc gửi mail thất bại: ${(error as Error).message}`,
        AuthService.name,
      );
    }

    Logger.log(
      `🔑 [OTP REGISTER] Mã xác thực đăng ký cho ${email} là: ${verificationCode}`,
      AuthService.name,
    );

    const isDev = (process.env.NODE_ENV || 'development') !== 'production';

    return {
      message: 'Đăng ký thành công! Vui lòng kiểm tra hộp thư Gmail để lấy mã OTP xác thực.',
      email,
      ...(isDev ? { devOtpCode: verificationCode } : {}),
    };
  }

  // ================= 2. XÁC THỰC EMAIL =================
  async verifyEmail(dto: VerifyEmailDto) {
    const { email, code } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Không tìm thấy tài khoản với email này.');
    }
    if (user.isVerified) {
      return { message: 'Tài khoản này đã được xác thực trước đó rồi.' };
    }
    if (user.verificationCode !== code) {
      throw new BadRequestException('Mã OTP không chính xác.');
    }
    if (user.codeExpiresAt && new Date() > user.codeExpiresAt) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng đăng ký lại để nhận mã mới.');
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    return { message: 'Xác thực tài khoản thành công! Bây giờ bạn có thể đăng nhập.' };
  }

  // ================= 3. ĐĂNG NHẬP (THƯỜNG) =================
  async login(dto: LoginDto) {
    const { email, password } = dto;
    const normalizedEmail = email.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
          { platformEmail: { equals: normalizedEmail, mode: 'insensitive' } },
          { personalEmail: { equals: normalizedEmail, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Tài khoản này đăng nhập bằng Google. Vui lòng dùng tính năng Google OAuth.',
      );
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }
    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để lấy mã OTP.',
      );
    }
    if (user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ.',
      );
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      isSellerActive: user.isSellerActive,
    });

    return {
      message: 'Đăng nhập thành công!',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        platformEmail: user.platformEmail,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // ================= 4. ĐĂNG NHẬP BẰNG GOOGLE =================
  async googleLogin(user?: GoogleUser) {
    if (!user) {
      throw new BadRequestException('Không nhận được thông tin từ Google.');
    }

    const { email, firstName, lastName, picture } = user;
    const fullName: string = `${lastName || ''} ${firstName || ''}`.trim() || 'Người dùng Google';

    const userRecord = await this.prisma.user.upsert({
      where: { email },
      update: {
        avatarUrl: picture,
        isVerified: true,
      },
      create: {
        email,
        fullName,
        avatarUrl: picture,
        passwordHash: '',
        isVerified: true,
      },
    });

    if (userRecord.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ.',
      );
    }

    const { accessToken, refreshToken } = await this.generateTokens({
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      isSellerActive: userRecord.isSellerActive,
    });

    return {
      message: 'Đăng nhập bằng Google thành công!',
      accessToken,
      refreshToken,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        fullName: userRecord.fullName,
        role: userRecord.role,
        avatarUrl: userRecord.avatarUrl,
      },
    };
  }

  // ================= 5. QUÊN MẬT KHẨU (GỬI OTP QUA GMAIL) =================
  // Áp dụng cho tài khoản đăng ký bằng Gmail (đã xác thực) hoặc bằng Google (luôn isVerified).
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; email: string }> {
    const { email } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Không tìm thấy tài khoản với email này.');
    }
    if (!user.isVerified) {
      throw new BadRequestException(
        'Tài khoản chưa được xác thực. Vui lòng xác thực email trước khi đặt lại mật khẩu.',
      );
    }

    // Kiểm tra thời gian chờ (cooldown 60 giây) giữa các lần yêu cầu gửi OTP
    if (user.codeExpiresAt) {
      const remainingMs = user.codeExpiresAt.getTime() - Date.now();
      const cooldownMs = 60 * 1000;
      const expiryDurationMs = 10 * 60 * 1000;
      if (remainingMs > expiryDurationMs - cooldownMs) {
        const waitSeconds = Math.ceil((remainingMs - (expiryDurationMs - cooldownMs)) / 1000);
        throw new BadRequestException(
          `Vui lòng đợi ${waitSeconds} giây trước khi yêu cầu gửi lại mã OTP mới.`,
        );
      }
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // Hạn 10 phút

    // Gửi email đặt lại mật khẩu - ném lỗi nếu SMTP thất bại (không nuốt lỗi)
    await this.sendPasswordResetEmail(email, resetCode);

    await this.prisma.user.update({
      where: { email },
      data: { verificationCode: resetCode, codeExpiresAt },
    });

    Logger.log(
      `🔑 [OTP FORGOT PASSWORD] Mã đặt lại mật khẩu cho ${email} là: ${resetCode}`,
      AuthService.name,
    );

    const isDev = (process.env.NODE_ENV || 'development') !== 'production';

    return {
      message: 'Mã OTP đặt lại mật khẩu đã được gửi đến hộp thư Gmail của bạn!',
      email,
      ...(isDev ? { devOtpCode: resetCode } : {}),
    };
  }

  // ================= 6. ĐẶT LẠI MẬT KHẨU BẰNG OTP =================
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, code, newPassword } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isVerified) {
      throw new BadRequestException('Không tìm thấy tài khoản hợp lệ với email này.');
    }
    if (!user.verificationCode || user.verificationCode !== code) {
      throw new BadRequestException('Mã OTP không chính xác.');
    }
    if (!user.codeExpiresAt || new Date() > user.codeExpiresAt) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    // Kiểm tra mật khẩu mới không được trùng với mật khẩu hiện tại
    if (user.passwordHash) {
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSamePassword) {
        throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { email },
      data: { passwordHash, verificationCode: null, codeExpiresAt: null },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    return {
      message: 'Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.',
    };
  }

  // ================= 7. LÀM MỚI ACCESS TOKEN (REFRESH TOKEN) =================
  async refreshToken(dto: RefreshTokenDto) {
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
      process.env.REFRESH_TOKEN_SECRET ||
      'nexus-refresh-secret-key';

    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn.');
    }

    if (!payload.jti || !payload.sub) {
      throw new UnauthorizedException('Refresh token không hợp lệ.');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });

    if (
      !tokenRecord ||
      tokenRecord.userId !== payload.sub ||
      tokenRecord.isRevoked ||
      new Date() > tokenRecord.expiresAt
    ) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi hoặc hết hạn.');
    }

    if (tokenRecord.user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ.',
      );
    }

    const isTokenMatch = await bcrypt.compare(this.sha256(dto.refreshToken), tokenRecord.tokenHash);
    if (!isTokenMatch) {
      throw new UnauthorizedException('Refresh token không hợp lệ.');
    }

    // Thu hồi refresh token cũ (Refresh Token Rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    const { accessToken, refreshToken } = await this.generateTokens({
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
      isSellerActive: tokenRecord.user.isSellerActive,
    });

    return {
      message: 'Làm mới token thành công!',
      accessToken,
      refreshToken,
    };
  }

  // ================= 8. ĐĂNG XUẤT (THU HỒI REFRESH TOKEN) =================
  async logout(dto: RefreshTokenDto): Promise<{ message: string }> {
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
      process.env.REFRESH_TOKEN_SECRET ||
      'nexus-refresh-secret-key';

    try {
      const payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
        ignoreExpiration: true,
      });

      if (payload?.jti) {
        await this.prisma.refreshToken.updateMany({
          where: { id: payload.jti, userId: payload.sub, isRevoked: false },
          data: { isRevoked: true },
        });
      }
    } catch {
      // Bỏ qua nếu token sai định dạng để đảm bảo idempotent khi đăng xuất
    }

    return { message: 'Đăng xuất thành công!' };
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    isSellerActive?: boolean;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      isSellerActive: user.isSellerActive ?? false,
    });

    const tokenId = crypto.randomUUID();
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
      process.env.REFRESH_TOKEN_SECRET ||
      'nexus-refresh-secret-key';
    const refreshExpiresIn =
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') ||
      process.env.REFRESH_TOKEN_EXPIRES_IN ||
      '30d';

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        jti: tokenId,
      },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const tokenHash = await bcrypt.hash(this.sha256(refreshToken), 10);
    const expiresAt = new Date(Date.now() + this.parseDurationToMs(refreshExpiresIn));

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash,
        expiresAt,
        isRevoked: false,
      },
    });

    return { accessToken, refreshToken };
  }

  private sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private parseDurationToMs(duration: string): number {
    const match = /^(\d+)\s*([smhd])$/i.exec(duration.trim());
    if (!match) {
      return 30 * 24 * 60 * 60 * 1000; // Mặc định 30 ngày
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case 's':
        return amount * 1000;
      case 'm':
        return amount * 60 * 1000;
      case 'h':
        return amount * 60 * 60 * 1000;
      case 'd':
      default:
        return amount * 24 * 60 * 60 * 1000;
    }
  }

  private async sendPasswordResetEmail(email: string, resetCode: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Project Nexus E-Commerce" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: 'Mã đặt lại mật khẩu Project Nexus',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #4F46E5;">Yêu cầu đặt lại mật khẩu</h2>
            <p>Mã OTP để đặt lại mật khẩu tài khoản Project Nexus của bạn là:</p>
            <h1 style="background: #F3F4F6; padding: 10px; display: inline-block; letter-spacing: 5px; color: #111827;">${resetCode}</h1>
            <p>Mã này có hiệu lực trong vòng <b>10 phút</b>.</p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
          </div>
        `,
      });
    } catch (error) {
      Logger.warn(
        `[DEV MODE] Gửi email đặt lại mật khẩu thất bại (chưa cấu hình SMTP): ${(error as Error).message}`,
        AuthService.name,
      );
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException(
          'Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại cấu hình SMTP.',
        );
      }
    }
  }

  // ================= 7. HỒ SƠ CÁ NHÂN & BẢO MẬT =================

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

    const updated = await this.prisma.user.update({
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

    return updated;
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

    Logger.log(
      `🔑 [OTP CHANGE PASSWORD] Mã OTP đổi mật khẩu cho ${recipientEmail} là: ${otp}`,
      AuthService.name,
    );

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

    // Thu hồi toàn bộ Refresh Token cũ để đăng xuất tài khoản ở tất cả các thiết bị khác
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
      Logger.warn(
        `[DEV MODE] Gửi email đổi mật khẩu thất bại (chưa cấu hình SMTP): ${(error as Error).message}`,
        AuthService.name,
      );
    }
  }
}
