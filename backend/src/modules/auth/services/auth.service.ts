import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
  GoneException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { MailService } from '../../../core/mail/mail.service';
import { RedisService } from '../../../core/redis/redis.service';
import { recentReauthentication } from '../../../core/security/profile-reauth.service';
import { userMode } from '../../../core/security/user-mode';
import {
  RegisterBuyerDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordRequestDto,
  ResetPasswordWithOtpDto,
  InviteStaffDto,
  ActivateStaffDto,
} from '../dtos/auth.dto';
import { Role, ReputationTrustLevel } from '@nexus/types';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { StaffProvisioningService, ProvisionedStaffResult } from './staff-provisioning.service';
import { LightweightJwt } from '../../../core/security/jwt.util';
import { AuthenticatedUserPayload } from '../../../core/security/roles.decorator';

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    isSellerActive: boolean;
    accountRole?: string;
    activeRole?: string;
    currentMode?: 'BUYER' | 'SELLER';
    platformEmail?: string | null;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
    private readonly staffProvisioning: StaffProvisioningService,
  ) {}

  // 1. Đăng ký tài khoản Buyer
  async registerBuyer(dto: RegisterBuyerDto): Promise<AuthTokensResult> {
    const existing = await this.prisma.user.findFirst({
      where: {
        email: { equals: dto.email, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`User with email '${dto.email}' already exists`);
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const newUser = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: dto.email,
        personalEmail: dto.email,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber || null,
        passwordHash,
        role: Role.BUYER,
        isSellerActive: false,
        reputationScore: 100,
        isVerified: true,
      },
    });

    // Create attached wallet
    await this.prisma.wallet.create({
      data: {
        id: crypto.randomUUID(),
        userId: newUser.id,
        balance: 0,
        currency: 'VND',
      },
    });

    this.logger.log(`New buyer registered: ${newUser.email} (${newUser.id})`);
    return this.generateTokens(newUser);
  }

  // 2. Login (Hỗ trợ cả Buyer/Seller đăng nhập bằng email, và Staff đăng nhập bằng email nexus@gmail.com)
  async login(dto: LoginDto): Promise<AuthTokensResult> {
    const normalizedInput = dto.email.trim();

    // Check by email or platformEmail (personalEmail cannot be used to log in as Staff)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedInput, mode: 'insensitive' } },
          { platformEmail: { equals: normalizedInput, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ.',
      );
    }

    this.logger.log(`User logged in successfully: ${user.email} (Role: ${user.role})`);

    try {
      await this.redisService.set(
        `seller_recent_reauth:${user.id}`,
        recentReauthentication(user.passwordHash),
        300,
      );
    } catch {
      // In case Redis is unreachable, continue smoothly
    }

    return this.generateTokens(user);
  }

  // 3. Logout
  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash },
        data: { isRevoked: true },
      });
    } else {
      // Revoke all tokens of the user
      await this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    }
    return { success: true };
  }

  // 4. Refresh token
  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokensResult> {
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
      'super-secret-refresh-key-nexus-change-in-production-2026';

    const verify = LightweightJwt.verify<{ sub: string; tokenId: string }>(
      dto.refreshToken,
      refreshSecret,
    );

    if (!verify.valid || !verify.payload) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: verify.payload.sub,
        tokenHash,
        isRevoked: false,
      },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is revoked or expired');
    }

    // Revoke old refresh token (Token rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: verify.payload.sub },
    });

    if (!user) {
      throw new NotFoundException('User associated with token not found');
    }

    return this.generateTokens(user);
  }

  // 5. Change Password (PROFILE.CHANGE_PASSWORD)
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
      },
    });

    // Revoke all existing sessions
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    return {
      success: true,
      message: 'Password changed successfully. Please log in again with new password.',
    };
  }

  // 6. Quên mật khẩu: Gửi OTP 6 số ngẫu nhiên về email (PROFILE.RESET_PASSWORD)
  async requestForgotPassword(
    dto: ForgotPasswordRequestDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { platformEmail: dto.email }],
      },
    });

    if (!user) {
      return {
        success: true,
        message: 'If the email exists in our system, an OTP has been dispatched to it.',
      };
    }

    // Target email: if staff with platform email, send OTP to their personalEmail; otherwise send to their email
    const recipientEmail = user.personalEmail || user.email;

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: otp,
        codeExpiresAt: expiresAt,
      },
    });

    await this.mailService.sendEmail({
      to: recipientEmail,
      subject: '[Project Nexus] Mã OTP đặt lại mật khẩu',
      text: `Xin chào ${user.fullName},\n\nMã OTP của bạn để đặt lại mật khẩu là: ${otp}\nMã này có hiệu lực trong vòng 15 phút.\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Project Nexus - Đặt lại mật khẩu</h2>
          <p>Xin chào <strong>${user.fullName}</strong>,</p>
          <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại Project Nexus.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; color: #1e3a8a; margin: 20px 0;">
            ${otp}
          </div>
          <p>Mã OTP này có hiệu lực trong <strong>15 phút</strong>.</p>
          <p style="color: #6b7280; font-size: 13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua thư này.</p>
        </div>
      `,
    });

    return {
      success: true,
      message: 'OTP sent to registered email address.',
    };
  }

  // 7. Xác nhận OTP và đặt lại mật khẩu mới
  async resetPasswordWithOtp(
    dto: ResetPasswordWithOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { platformEmail: dto.email }],
      },
    });

    if (!user || !user.verificationCode || !user.codeExpiresAt) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (user.codeExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    if (user.verificationCode !== dto.otp) {
      throw new BadRequestException('Incorrect OTP code');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        verificationCode: null,
        codeExpiresAt: null,
      },
    });

    // Revoke tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true },
    });

    return {
      success: true,
      message: 'Password has been reset successfully. You can now login with your new credentials.',
    };
  }

  async inviteStaff(dto: InviteStaffDto): Promise<ProvisionedStaffResult> {
    return this.staffProvisioning.invite(dto);
  }

  async getStaffInvitationInfo(_token: string): Promise<never> {
    throw new GoneException(
      'Staff được cấp tài khoản và mật khẩu qua email. Vui lòng đăng nhập hoặc dùng Quên mật khẩu.',
    );
  }

  async activateStaff(_dto: ActivateStaffDto): Promise<never> {
    throw new GoneException(
      'Luồng kích hoạt bằng token đã ngừng. Vui lòng dùng tài khoản được cấp hoặc Quên mật khẩu.',
    );
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isSellerActive: boolean;
    isShopSuspended?: boolean;
    platformEmail?: string | null;
  }): Promise<AuthTokensResult> {
    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'super-secret-jwt-key-nexus-change-in-production-2026';
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
      'super-secret-refresh-key-nexus-change-in-production-2026';

    const accessExpiry = LightweightJwt.parseDurationToSeconds(
      this.configService.get<string>('JWT_EXPIRES_IN') || '7d',
    );
    const refreshExpiry = LightweightJwt.parseDurationToSeconds(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') || '30d',
    );

    const payload: AuthenticatedUserPayload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role as Role,
      isSellerActive: user.isShopSuspended ? false : user.isSellerActive,
    };

    const accessToken = LightweightJwt.sign(payload as unknown as Record<string, unknown>, {
      secret: jwtSecret,
      expiresInSeconds: accessExpiry,
    });

    const refreshTokenId = crypto.randomUUID();
    const refreshToken = LightweightJwt.sign(
      { sub: user.id, tokenId: refreshTokenId },
      { secret: refreshSecret, expiresInSeconds: refreshExpiry },
    );

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshExpiresAt = new Date(Date.now() + refreshExpiry * 1000);

    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        userId: user.id,
        tokenHash,
        expiresAt: refreshExpiresAt,
        isRevoked: false,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiry,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role as Role,
        ...userMode({
          role: user.role as Role,
          isSellerActive: user.isSellerActive,
          isShopSuspended: user.isShopSuspended ?? false,
        }),
        platformEmail: user.platformEmail,
      },
    };
  }
}
