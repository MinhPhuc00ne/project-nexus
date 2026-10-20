import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { MailService } from '../../../core/mail/mail.service';
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
import { generateStaffBaseEmail } from '../utils/staff-email.util';
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
  ) {}

  // 1. Đăng ký tài khoản Buyer
  async registerBuyer(dto: RegisterBuyerDto): Promise<AuthTokensResult> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { personalEmail: dto.email }],
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

    // Check by email or platformEmail or personalEmail
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedInput },
          { platformEmail: normalizedInput },
          { personalEmail: normalizedInput },
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
        OR: [{ email: dto.email }, { platformEmail: dto.email }, { personalEmail: dto.email }],
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
        OR: [{ email: dto.email }, { platformEmail: dto.email }, { personalEmail: dto.email }],
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

  private async isEmailTaken(email: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { platformEmail: { equals: email, mode: 'insensitive' } },
        ],
      },
    });
    if (existingUser) return true;

    const existingInvitation = await this.prisma.staffInvitation.findFirst({
      where: {
        assignedEmail: { equals: email, mode: 'insensitive' },
        isAccepted: false,
      },
    });
    return !!existingInvitation;
  }

  private generateBaseStaffEmail(fullName: string): string {
    return generateStaffBaseEmail(fullName);
  }

  // 8. Admin tạo tài khoản cho Staff
  async inviteStaff(dto: InviteStaffDto): Promise<{
    success: boolean;
    message: string;
    invitationId: string;
    assignedEmail: string;
    token: string;
  }> {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { personalEmail: dto.email }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Email cá nhân '${dto.email}' đã được đăng ký hoặc liên kết với tài khoản khác.`,
      );
    }

    const baseName = this.generateBaseStaffEmail(dto.fullName);
    let assignedEmail = `${baseName}@staff.com`;
    let isTaken = await this.isEmailTaken(assignedEmail);
    if (isTaken) {
      let index = 2;
      while (isTaken && index <= 99) {
        assignedEmail = `${baseName}${index}@staff.com`;
        isTaken = await this.isEmailTaken(assignedEmail);
        index++;
      }
    }

    // Sinh mã token kích hoạt bảo mật gửi về email cá nhân của Staff
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 ngày

    const invitation = await this.prisma.staffInvitation.create({
      data: {
        id: crypto.randomUUID(),
        fullName: dto.fullName.trim(),
        personalEmail: dto.email.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
        department: dto.department?.trim() || 'Support',
        token,
        expiresAt,
        assignedEmail,
        isAccepted: false,
      },
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('ADMIN_PORTAL_URL') ||
      'http://localhost:5173';
    const activationLink = `${frontendUrl}/staff/activate?token=${token}`;

    await this.mailService.sendEmail({
      to: dto.email,
      subject: 'Thư mời kích hoạt tài khoản Quản trị & Hỗ trợ (Staff)',
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

    this.logger.log(
      `Staff invitation sent to ${dto.email} (Assigned: ${assignedEmail}, Token: ${token})`,
    );
    return {
      success: true,
      message: `Đã gửi thư mời kích hoạt tài khoản Staff tới email cá nhân ${dto.email}`,
      invitationId: invitation.id,
      assignedEmail,
      token,
    };
  }

  // 8b. Lấy thông tin lời mời để xác nhận khi Staff mở link
  async getStaffInvitationInfo(token: string): Promise<{
    valid: boolean;
    fullName: string;
    phoneNumber: string | null;
    personalEmail: string;
    assignedEmail: string | null;
  }> {
    const cleanToken = token?.trim();
    if (!cleanToken) {
      throw new BadRequestException('Mã token kích hoạt không được để trống.');
    }

    const invitation = await this.prisma.staffInvitation.findFirst({
      where: {
        token: cleanToken,
      },
    });

    if (!invitation || invitation.isAccepted) {
      throw new BadRequestException('Mã token kích hoạt không hợp lệ hoặc đã được sử dụng.');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Mã token kích hoạt đã hết hạn.');
    }

    return {
      valid: true,
      fullName: invitation.fullName,
      phoneNumber: invitation.phoneNumber,
      personalEmail: invitation.personalEmail,
      assignedEmail: invitation.assignedEmail,
    };
  }

  // 9. Staff kích hoạt tài khoản:
  async activateStaff(dto: ActivateStaffDto): Promise<{
    success: boolean;
    message: string;
    assignedEmail: string;
    user: {
      id: string;
      fullName: string;
      platformEmail: string;
      role: Role;
    };
  }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('Mật khẩu mới phải có tối thiểu 8 ký tự');
    }

    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).+$/.test(dto.newPassword)) {
      throw new BadRequestException(
        'Mật khẩu mới phải bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt',
      );
    }

    const token = dto.token?.trim();
    if (!token) {
      throw new BadRequestException('Mã token kích hoạt không được để trống');
    }

    const invitation = await this.prisma.staffInvitation.findFirst({
      where: {
        token,
      },
    });

    if (!invitation || invitation.isAccepted) {
      throw new BadRequestException('Mã token kích hoạt không hợp lệ hoặc đã được sử dụng');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Mã token kích hoạt đã hết hạn');
    }

    // Lấy email đã cấp dạng @staff.com, nếu chưa có thì sinh mới
    let platformEmail = invitation.assignedEmail;
    if (!platformEmail) {
      const baseName = this.generateBaseStaffEmail(invitation.fullName);
      platformEmail = `${baseName}@staff.com`;
      let isTaken = await this.isEmailTaken(platformEmail);
      if (isTaken) {
        let index = 2;
        while (isTaken && index <= 99) {
          platformEmail = `${baseName}${index}@staff.com`;
          isTaken = await this.isEmailTaken(platformEmail);
          index++;
        }
      }
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);

    const newStaffUser = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: platformEmail,
        platformEmail,
        personalEmail: invitation.personalEmail,
        fullName: dto.fullName.trim() || invitation.fullName,
        phoneNumber: dto.phoneNumber.trim() || invitation.phoneNumber,
        passwordHash,
        role: Role.SUPPORT_STAFF,
        isSellerActive: false,
        reputationScore: 100,
        isVerified: true,
      },
    });

    // Mark invitation as accepted
    await this.prisma.staffInvitation.update({
      where: { id: invitation.id },
      data: { isAccepted: true },
    });

    // Create wallet for staff
    await this.prisma.wallet.create({
      data: {
        id: crypto.randomUUID(),
        userId: newStaffUser.id,
        balance: 0,
        currency: 'VND',
      },
    });

    this.logger.log(`Staff activated: ${newStaffUser.fullName} | Assigned Email: ${platformEmail}`);

    return {
      success: true,
      message:
        'Kích hoạt tài khoản Staff thành công! Vui lòng sử dụng tài khoản được cấp (@staff.com) và mật khẩu mới để đăng nhập.',
      assignedEmail: platformEmail,
      user: {
        id: newStaffUser.id,
        fullName: newStaffUser.fullName,
        platformEmail,
        role: newStaffUser.role as Role,
      },
    };
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isSellerActive: boolean;
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
      isSellerActive: user.isSellerActive,
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
        isSellerActive: user.isSellerActive,
        platformEmail: user.platformEmail,
      },
    };
  }
}
