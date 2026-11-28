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
    if (!user) throw new NotFoundException('User information not found.');
    return { ...user, ...userMode(user) };
  }

  async updateProfile(userId: string, dto: UpdateAuthProfileInput): Promise<UserProfileResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User information not found.');
    if (user.role !== 'BUYER' && user.role !== 'SELLER') {
      throw new ForbiddenException('Only Buyer and Seller accounts may edit personal profiles.');
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
      throw new ForbiddenException('Only Staff may edit their own Staff profile.');
    }
    if (dto.fullName !== undefined && dto.fullName.trim().length < 2) {
      throw new BadRequestException('Invalid full name.');
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
      throw new ForbiddenException('Only Buyer/Seller accounts may verify profile updates here.');
    }
    return this.profileReauth.issue(user, password);
  }

  async requestChangePasswordOtp(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User information not found.');
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
      message: `Password change verification OTP has been sent to ${recipientEmail}.`,
    };
  }

  async confirmChangePasswordWithOtp(
    userId: string,
    dto: ConfirmChangePasswordOtpInput,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.verificationCode || !user.codeExpiresAt) {
      throw new BadRequestException('No OTP request found or OTP code is invalid.');
    }
    if (user.codeExpiresAt < new Date())
      throw new BadRequestException(
        'OTP code has expired (valid for 15 minutes). Please request a new code.',
      );
    if (user.verificationCode !== dto.otp)
      throw new BadRequestException('Incorrect OTP code. Please check and try again.');
    if (user.passwordHash && (await bcrypt.compare(dto.newPassword, user.passwordHash))) {
      throw new BadRequestException('New password must be different from your current password.');
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
        throw new BadRequestException('OTP code has already been used or has expired.');
      await tx.refreshToken.updateMany({ where: { userId }, data: { isRevoked: true } });
    });
    // The refresh tokens are gone; the access tokens still in circulation have
    // to stop working too, or the old password keeps a session alive.
    await this.tokenAuth.revokeAllSessions(userId);
    return {
      success: true,
      message: 'Password changed successfully. Please sign in again with your new password.',
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
      throw new NotFoundException('User account not found.');
    }
    if (!user.passwordHash) {
      throw new BadRequestException('This account does not have a password set.');
    }
    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect.');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from your current password.');
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
      message: 'Password changed successfully. Please sign in again with your new password.',
    };
  }

  private async sendPasswordChangeOtpEmail(
    email: string,
    fullName: string,
    otp: string,
  ): Promise<void> {
    const success = await this.mailService.sendEmail({
      to: email,
      subject: '[Project Nexus] Password Change Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Confirm Account Password Change</h2>
          <p>Hello <strong>${fullName || 'Customer'}</strong>,</p>
          <p>We received a request to change the password for your account on <strong>Project Nexus</strong>.</p>
          <p>Your verification OTP code is:</p>
          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 28px; font-weight: bold; text-align: center; letter-spacing: 6px; color: #1e3a8a; margin: 20px 0;">
            ${otp}
          </div>
          <p>This OTP is valid for <strong>15 minutes</strong>. Never share this code with anyone.</p>
          <p style="color: #64748b; font-size: 13px; margin-top: 25px;">If you did not request this change, please ignore this email or contact an administrator to secure your account.</p>
        </div>
      `,
    });
    if (!success) {
      this.logger.warn('Failed to send password change email.');
      throw new BadRequestException(
        'Unable to send password change confirmation email. Please verify SMTP settings.',
      );
    }
  }
}
