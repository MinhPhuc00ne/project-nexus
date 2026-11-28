import {
  NotificationPublisher,
  publishNotification,
} from '../../../core/notifications/notification-publisher.service';
import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppErrorCode } from '@nexus/contracts';
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { ReputationTrustLevel, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../../../core/mail/mail.service';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { RedisService } from '../../../core/redis/redis.service';
import { recentReauthentication } from '../../../core/security/profile-reauth.service';
import { userMode } from '../../../core/security/user-mode';
import { ForgotPasswordInput } from '../dtos/forgot-password.dto';
import { LoginInput } from '../dtos/login.dto';
import { RefreshTokenInput } from '../dtos/refresh-token.dto';
import { RegisterInput } from '../dtos/register.dto';
import { ResetPasswordInput } from '../dtos/reset-password.dto';
import { VerifyEmailInput } from '../dtos/verify-email.dto';
import {
  INITIAL_REPUTATION_SCORE,
  INITIAL_REPUTATION_TRUST_LEVEL,
} from '../../../core/domain/reputation-policy';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly tokenAuth: TokenAuthService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    @Optional() private readonly notifications?: NotificationPublisher,
  ) {}

  /**
   * Registers a new user account and dispatches an email verification OTP code.
   *
   * @param dto - User registration payload
   * @returns Registration confirmation
   * @throws BadRequestException when email is already registered or cooldown is active
   */
  async register(dto: RegisterInput) {
    const { email, password, fullName } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.isVerified) {
        throw new BadRequestException({
          message: 'This email is already registered and verified.',
          errorCode: AppErrorCode.EMAIL_ALREADY_EXISTS,
        });
      }
      if (existingUser.codeExpiresAt) {
        const remainingMs = existingUser.codeExpiresAt.getTime() - Date.now();
        const cooldownMs = 60 * 1000;
        const expiryDurationMs = 10 * 60 * 1000;
        if (remainingMs > expiryDurationMs - cooldownMs) {
          const waitSeconds = Math.ceil((remainingMs - (expiryDurationMs - cooldownMs)) / 1000);
          throw new BadRequestException(
            `Please wait ${waitSeconds} seconds before requesting a new OTP code.`,
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
      subject: 'Project Nexus Account Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4F46E5;">Welcome to Project Nexus!</h2>
          <p>Your account verification code is:</p>
          <h1 style="background: #F3F4F6; padding: 10px; display: inline-block; letter-spacing: 5px; color: #111827;">${verificationCode}</h1>
          <p>This code is valid for <b>10 minutes</b>.</p>
        </div>
      `,
    });

    this.logger.log(`🔑 [OTP REGISTER] Registration verification code processed for ${email}`);

    return {
      message:
        'Registration successful! Please check your email inbox for the verification OTP code.',
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
  async verifyEmail(dto: VerifyEmailInput): Promise<{ message: string }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE email = ${dto.email} FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { email: dto.email } });
      if (!user) throw new BadRequestException('No account found with this email.');
      if (user.isVerified) return { message: 'This account has already been verified.' };
      if (user.verificationCode !== dto.code)
        throw new BadRequestException({
          message: 'Incorrect OTP code.',
          errorCode: AppErrorCode.INVALID_OTP,
        });
      if (!user.codeExpiresAt || user.codeExpiresAt.getTime() <= Date.now())
        throw new BadRequestException({
          message: 'OTP code has expired.',
          errorCode: AppErrorCode.OTP_EXPIRED,
        });
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
          reason: `Initialized ${INITIAL_REPUTATION_SCORE} reputation points upon account verification`,
          referenceId: 'REGISTRATION_EMAIL',
        },
      });
      await publishNotification(
        tx,
        {
          userId: user.id,
          title: 'Welcome to NEXUS!',
          content: `Your account has been activated via email. Starting reputation score: ${INITIAL_REPUTATION_SCORE} (${INITIAL_REPUTATION_TRUST_LEVEL}).`,
          type: 'SYSTEM',
          channel: 'IN_APP',
        },
        this.notifications,
      );
      return { message: 'Account verified successfully! You can now sign in.' };
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
  async login(dto: LoginInput) {
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
      throw new UnauthorizedException({
        message: 'Incorrect email or password.',
        errorCode: AppErrorCode.INVALID_CREDENTIALS,
      });
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses Google sign-in. Please use Google OAuth.');
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: 'Incorrect email or password.',
        errorCode: AppErrorCode.INVALID_CREDENTIALS,
      });
    }
    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Account is not verified yet. Please check your email for the OTP code.',
      );
    }
    if (user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new ForbiddenException({
        message: 'Your account has been suspended by an Administrator. Please contact support.',
        errorCode: AppErrorCode.ACCOUNT_SUSPENDED,
      });
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
      message: 'Signed in successfully!',
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
      throw new BadRequestException('No user information received from Google.');
    }

    const { email, firstName, lastName, picture } = user;
    const fullName: string = `${lastName || ''} ${firstName || ''}`.trim() || 'Google User';

    const existingUser =
      typeof this.prisma.user.findUnique === 'function'
        ? await this.prisma.user.findUnique({ where: { email } })
        : null;
    const userRecord =
      existingUser || typeof this.prisma.user.create !== 'function'
        ? existingUser
          ? await this.prisma.user.update({
              where: { id: existingUser.id },
              data: {
                avatarUrl: picture,
                isVerified: true,
                ...(!existingUser.isVerified
                  ? { passwordHash: '', verificationCode: null, codeExpiresAt: null }
                  : {}),
              },
            })
          : await this.prisma.user.upsert({
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
            })
        : await this.prisma.user.create({
            data: {
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
        'Your account has been suspended by an Administrator. Please contact support.',
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
      message: 'Signed in with Google successfully!',
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
  async forgotPassword(dto: ForgotPasswordInput): Promise<{ message: string; email: string }> {
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
      throw new BadRequestException('No account found with this email.');
    }
    if (!user.isVerified) {
      throw new BadRequestException(
        'Account is not verified. Please verify your email before resetting your password.',
      );
    }

    if (user.codeExpiresAt) {
      const remainingMs = user.codeExpiresAt.getTime() - Date.now();
      const cooldownMs = 60 * 1000;
      const expiryDurationMs = 10 * 60 * 1000;
      if (remainingMs > expiryDurationMs - cooldownMs) {
        const waitSeconds = Math.ceil((remainingMs - (expiryDurationMs - cooldownMs)) / 1000);
        throw new BadRequestException(
          `Please wait ${waitSeconds} seconds before requesting a new OTP code.`,
        );
      }
    }

    const resetCode = crypto.randomInt(100000, 1000000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (user.role === 'SUPPORT_STAFF' && !user.personalEmail) {
      throw new BadRequestException(
        'Staff account has no personal email configured to receive OTP. Please contact Admin.',
      );
    }
    const recipientEmail = user.personalEmail || user.email;
    await this.sendPasswordResetEmail(recipientEmail, resetCode, user.role === 'SUPPORT_STAFF');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: resetCode, codeExpiresAt },
    });

    return {
      message: 'Password reset OTP code has been sent to your email inbox!',
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
  async resetPassword(dto: ResetPasswordInput): Promise<{ message: string }> {
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
      throw new BadRequestException('No verified account found with this email.');
    }
    if (!user.verificationCode || user.verificationCode !== code) {
      throw new BadRequestException('Incorrect OTP code.');
    }
    if (!user.codeExpiresAt || new Date() > user.codeExpiresAt) {
      throw new BadRequestException('OTP code has expired. Please request a new code.');
    }

    if (user.passwordHash) {
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
      if (isSamePassword) {
        throw new BadRequestException('New password must be different from your current password.');
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
        throw new BadRequestException('OTP code has expired or has already been used.');
      await tx.refreshToken.updateMany({
        where: { userId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });
    });

    await this.tokenAuth.revokeAllSessions(user.id);

    return {
      message: 'Password reset successful! You can now sign in with your new password.',
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
  async refreshToken(dto: RefreshTokenInput) {
    const refreshSecret = this.getRefreshSecret();

    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (!payload.jti || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token.');
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
      throw new UnauthorizedException('Refresh token has been revoked or has expired.');
    }

    if (tokenRecord.user.trustLevel === ReputationTrustLevel.SUSPENDED) {
      throw new ForbiddenException(
        'Your account has been suspended by an Administrator. Please contact support.',
      );
    }

    const isTokenMatch = await bcrypt.compare(this.sha256(dto.refreshToken), tokenRecord.tokenHash);
    if (!isTokenMatch) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const { accessToken, refreshToken } = await this.prisma.$transaction(async (tx) => {
      const rotated = await tx.refreshToken.updateMany({
        where: { id: tokenRecord.id, isRevoked: false },
        data: { isRevoked: true },
      });
      if (rotated.count === 0) {
        throw new UnauthorizedException('Refresh token has been revoked or has expired.');
      }

      return this.generateTokens(
        {
          id: tokenRecord.user.id,
          email: tokenRecord.user.email,
          role: tokenRecord.user.role,
          isSellerActive: tokenRecord.user.isSellerActive,
        },
        tx,
      );
    });

    return {
      message: 'Token refreshed successfully!',
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
  async logout(dto: RefreshTokenInput): Promise<{ message: string }> {
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
      // Ignore malformed token to keep logout idempotent
    }

    return { message: 'Signed out successfully!' };
  }

  private async generateTokens(
    user: {
      id: string;
      email: string;
      role: string;
      isSellerActive?: boolean;
    },
    db: Pick<PrismaService, 'refreshToken'> = this.prisma,
  ): Promise<{ accessToken: string; refreshToken: string }> {
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

    await db.refreshToken.create({
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
      'Staff accounts and passwords are provisioned via email. Please sign in or use Forgot Password.',
    );
  }

  /**
   * Legacy activation endpoint stub returning HTTP 410 Gone.
   */
  async activateStaff(_dto: { token: string }): Promise<never> {
    throw new GoneException(
      'Token-based activation has been retired. Please use your provisioned account or Forgot Password.',
    );
  }

  private async sendPasswordResetEmail(
    email: string,
    resetCode: string,
    requireDelivery = false,
  ): Promise<void> {
    const success = await this.mailService.sendEmail({
      to: email,
      subject: 'Project Nexus Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #4F46E5;">Password Reset Request</h2>
          <p>Your OTP code to reset your Project Nexus account password is:</p>
          <h1 style="background: #F3F4F6; padding: 10px; display: inline-block; letter-spacing: 5px; color: #111827;">${resetCode}</h1>
          <p>This code is valid for <b>10 minutes</b>.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
        </div>
      `,
      requireDelivery,
    });
    if (!success) {
      throw new BadRequestException(
        'Unable to send password reset email. Please verify your SMTP configuration.',
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
