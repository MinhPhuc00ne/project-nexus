import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { ReputationTrustLevel, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../../../core/mail/mail.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RedisService } from '../../../core/redis/redis.service';
import { recentReauthentication } from '../../../core/security/profile-reauth.service';
import { userMode } from '../../../core/security/user-mode';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { RegisterDto } from '../dtos/register.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { VerifyEmailDto } from '../dtos/verify-email.dto';
import {
  INITIAL_REPUTATION_SCORE,
  INITIAL_REPUTATION_TRUST_LEVEL,
} from '../../users/services/reputation-policy';
export type { UserProfileResponse } from './auth-profile.service';

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

/**
 * Handles core user authentication, registration, token generation, and password resets.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  public transporter?: {
    sendMail: (opts: {
      to?: string;
      subject?: string;
      html?: string;
      text?: string;
      from?: string;
    }) => Promise<{ accepted?: string[] }>;
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly tokenAuth: TokenAuthService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Registers a new user account and dispatches an email verification OTP code.
   *
   * @param dto - User registration payload
   * @returns Registration confirmation
   * @throws BadRequestException when email is already registered or cooldown is active
   */
  async register(dto: RegisterDto) {
    const { email, password, fullName } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isVerified) {
        throw new BadRequestException('Email này đã được đăng ký và xác thực.');
      }
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

    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

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
        reputationScore: INITIAL_REPUTATION_SCORE,
        trustLevel: INITIAL_REPUTATION_TRUST_LEVEL,
        verificationCode,
        codeExpiresAt,
        isVerified: false,
      },
    });

    await this.mailService.sendEmail({
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

    this.logger.log(`🔑 [OTP REGISTER] Mã xác thực đăng ký cho ${email} đã được xử lý`);

    return {
      message: 'Đăng ký thành công! Vui lòng kiểm tra hộp thư Gmail để lấy mã OTP xác thực.',
      email,
    };
  }

  /**
   * Verifies a user email using the provided 6-digit verification OTP.
   *
   * @param dto - Verification code and email payload
   * @returns Verification confirmation message
   * @throws BadRequestException when code is invalid or expired
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE email = ${dto.email} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { email: dto.email } });
      if (!user) throw new BadRequestException('Không tìm thấy tài khoản với email này.');
      if (user.isVerified) return { message: 'Tài khoản này đã được xác thực trước đó rồi.' };
      if (user.verificationCode !== dto.code)
        throw new BadRequestException('Mã OTP không chính xác.');
      if (!user.codeExpiresAt || user.codeExpiresAt.getTime() <= Date.now())
        throw new BadRequestException('Mã OTP đã hết hạn.');
      await tx.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationCode: null,
          codeExpiresAt: null,
          reputationScore: INITIAL_REPUTATION_SCORE,
          trustLevel: INITIAL_REPUTATION_TRUST_LEVEL,
        },
      });
      await tx.wallet.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, balance: 0 },
      });
      await tx.reputationLog.create({
        data: {
          userId: user.id,
          deltaPoints: 0,
          balanceAfter: INITIAL_REPUTATION_SCORE,
          reason: `Khởi tạo ${INITIAL_REPUTATION_SCORE} điểm uy tín khi xác thực tài khoản`,
          referenceId: 'REGISTRATION_EMAIL',
        },
      });
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Chào mừng bạn đến với NEXUS!',
          content: `Tài khoản của bạn đã kích hoạt thành công qua Email. Điểm uy tín khởi đầu: ${INITIAL_REPUTATION_SCORE} (${INITIAL_REPUTATION_TRUST_LEVEL}).`,
          type: 'SYSTEM',
          channel: 'IN_APP',
        },
      });
      return { message: 'Xác thực tài khoản thành công! Bây giờ bạn có thể đăng nhập.' };
    });
  }

  /**
   * Authenticates user credentials and issues access and refresh JWTs.
   *
   * @param dto - Login credentials
   * @returns Access and refresh tokens with user session metadata
   * @throws UnauthorizedException on invalid credentials or unverified email
   * @throws ForbiddenException when account is suspended
   */
  async login(dto: LoginDto) {
    const { email, password } = dto;
    const normalizedEmail = email.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: normalizedEmail, mode: 'insensitive' } },
          { platformEmail: { equals: normalizedEmail, mode: 'insensitive' } },
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

    const effectiveSellerActive = user.isShopSuspended ? false : user.isSellerActive;

    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      isSellerActive: effectiveSellerActive,
    });

    try {
      await this.redisService.set(
        `seller_recent_reauth:${user.id}`,
        recentReauthentication(user.passwordHash),
        300,
      );
    } catch {
      // In case Redis is unreachable, continue smoothly
    }

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
        isShopSuspended: user.isShopSuspended,
        suspensionReason: user.suspensionReason,
        ...userMode(user),
      },
    };
  }

  /**
   * Authenticates or creates an account via Google OAuth and issues session tokens.
   *
   * @param user - Profile payload returned by Google strategy
   * @returns Generated access and refresh tokens
   * @throws BadRequestException when Google profile data is missing
   * @throws ForbiddenException when account is suspended
   */
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
        reputationScore: INITIAL_REPUTATION_SCORE,
        trustLevel: INITIAL_REPUTATION_TRUST_LEVEL,
      },
    });

    await this.prisma.wallet.upsert({
      where: { userId: userRecord.id },
      update: {},
      create: {
        userId: userRecord.id,
        balance: 0,
      },
    });

    if (userRecord.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa bởi Quản trị viên. Vui lòng liên hệ bộ phận hỗ trợ.',
      );
    }

    if (userRecord.role === 'SELLER') {
      try {
        await this.redisService.set(
          `seller_recent_reauth:${userRecord.id}`,
          recentReauthentication(userRecord.passwordHash),
          300,
        );
      } catch {
        // Login remains available; profile edits still require a valid proof.
      }
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
        ...userMode(userRecord),
      },
    };
  }

  /**
   * Generates and emails a password reset OTP code to the verified user email.
   *
   * @param dto - Email payload for password reset
   * @returns Reset code dispatch confirmation
   * @throws BadRequestException on non-existent account, unverified email, or active cooldown
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; email: string }> {
    const { email } = dto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email.trim(), mode: 'insensitive' } },
          { platformEmail: { equals: email.trim(), mode: 'insensitive' } },
        ],
      },
    });
    if (!user) {
      throw new BadRequestException('Không tìm thấy tài khoản với email này.');
    }
    if (!user.isVerified) {
      throw new BadRequestException(
        'Tài khoản chưa được xác thực. Vui lòng xác thực email trước khi đặt lại mật khẩu.',
      );
    }

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

    const resetCode = crypto.randomInt(100000, 1000000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (user.role === 'SUPPORT_STAFF' && !user.personalEmail) {
      throw new BadRequestException(
        'Tài khoản Staff chưa có email cá nhân nhận OTP. Vui lòng liên hệ Admin.',
      );
    }
    const recipientEmail = user.personalEmail || user.email;
    await this.sendPasswordResetEmail(recipientEmail, resetCode, user.role === 'SUPPORT_STAFF');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: resetCode, codeExpiresAt },
    });

    return {
      message: 'Mã OTP đặt lại mật khẩu đã được gửi đến hộp thư Gmail của bạn!',
      email: user.email,
    };
  }

  /**
   * Resets account password using a validated OTP verification code.
   *
   * @param dto - New password, email, and OTP verification code
   * @returns Password reset confirmation
   * @throws BadRequestException on invalid OTP, expired OTP, or identical previous password
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { email, code, newPassword } = dto;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email.trim(), mode: 'insensitive' } },
          { platformEmail: { equals: email.trim(), mode: 'insensitive' } },
        ],
      },
    });
    if (!user || !user.isVerified) {
      throw new BadRequestException('Không tìm thấy tài khoản hợp lệ với email này.');
    }
    if (!user.verificationCode || user.verificationCode !== code) {
      throw new BadRequestException('Mã OTP không chính xác.');
    }
    if (!user.codeExpiresAt || new Date() > user.codeExpiresAt) {
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
    }

    if (user.passwordHash) {
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSamePassword) {
        throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.user.updateMany({
        where: { id: user.id, verificationCode: code, codeExpiresAt: { gt: new Date() } },
        data: { passwordHash, verificationCode: null, codeExpiresAt: null },
      });
      if (consumed.count !== 1)
        throw new BadRequestException('Mã OTP đã hết hạn hoặc đã được sử dụng.');
      await tx.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    await this.tokenAuth.revokeAllSessions(user.id);

    return {
      message: 'Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.',
    };
  }

  /**
   * Refreshes user session tokens with single-use refresh token rotation.
   *
   * @param dto - Refresh token payload
   * @returns Newly generated access and refresh tokens
   * @throws UnauthorizedException when token is expired, revoked, or invalid
   * @throws ForbiddenException when account is suspended
   */
  async refreshToken(dto: RefreshTokenDto) {
    const refreshSecret = this.getRefreshSecret();

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

    const rotated = await this.prisma.refreshToken.updateMany({
      where: { id: tokenRecord.id, isRevoked: false },
      data: { isRevoked: true },
    });
    if (rotated.count !== 1) {
      throw new UnauthorizedException('Refresh token đã bị thu hồi hoặc hết hạn.');
    }

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

  /**
   * Revokes refresh token to terminate the current authenticated session.
   *
   * @param dto - Refresh token payload
   * @returns Logout confirmation message
   */
  async logout(dto: RefreshTokenDto): Promise<{ message: string }> {
    const refreshSecret = this.getRefreshSecret();

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
    const accessToken = await this.tokenAuth.signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      isSellerActive: user.isSellerActive ?? false,
    });

    const tokenId = crypto.randomUUID();
    const refreshSecret = this.getRefreshSecret();
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
      return 30 * 24 * 60 * 60 * 1000;
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

  /**
   * Legacy activation endpoint stub returning HTTP 410 Gone.
   */
  async getStaffInvitationInfo(_token: string): Promise<never> {
    throw new GoneException(
      'Staff được cấp tài khoản và mật khẩu qua email. Vui lòng đăng nhập hoặc dùng Quên mật khẩu.',
    );
  }

  /**
   * Legacy activation endpoint stub returning HTTP 410 Gone.
   */
  async activateStaff(_dto: { token: string }): Promise<never> {
    throw new GoneException(
      'Luồng kích hoạt bằng token đã ngừng. Vui lòng dùng tài khoản được cấp hoặc Quên mật khẩu.',
    );
  }

  private async sendPasswordResetEmail(
    email: string,
    resetCode: string,
    requireDelivery = false,
  ): Promise<void> {
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
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
        if (requireDelivery && (!Array.isArray(info.accepted) || !info.accepted.length)) {
          throw new Error('SMTP did not accept the recipient');
        }
        return;
      } catch {
        this.logger.warn('Gửi email đặt lại mật khẩu qua SMTP thất bại.');
        if (process.env.NODE_ENV === 'production' || requireDelivery) {
          throw new BadRequestException(
            'Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại cấu hình SMTP.',
          );
        }
        return;
      }
    }

    const success = await this.mailService.sendEmail({
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
      requireDelivery,
    });
    if (!success && (process.env.NODE_ENV === 'production' || requireDelivery)) {
      throw new BadRequestException(
        'Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại cấu hình SMTP.',
      );
    }
  }

  private getRefreshSecret(): string {
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET') || process.env.REFRESH_TOKEN_SECRET;
    if (!refreshSecret) {
      throw new Error('REFRESH_TOKEN_SECRET is not configured');
    }
    return refreshSecret;
  }
}
