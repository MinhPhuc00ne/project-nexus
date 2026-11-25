import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { MailService } from '../../../core/mail/mail.service';
import { generateStaffBaseEmail } from '../utils/staff-email.util';
import {
  INITIAL_REPUTATION_SCORE,
  INITIAL_REPUTATION_TRUST_LEVEL,
} from '../../../core/domain/reputation-policy';

export interface StaffInvitationInput {
  fullName: string;
  email: string;
  phoneNumber?: string;
  department?: string;
}

export interface ProvisionedStaffResult {
  success: boolean;
  message: string;
  invitationId: string;
  assignedEmail: string;
  staff: {
    id: string;
    email: string;
    platformEmail: string | null;
    personalEmail: string | null;
    fullName: string;
    phoneNumber: string | null;
    department: string | null;
    role: Role;
    isVerified: boolean;
    createdAt: Date;
  };
}

const html = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  );

@Injectable()
export class StaffProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async invite(dto: StaffInvitationInput): Promise<ProvisionedStaffResult> {
    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    if (!email || !fullName)
      throw new BadRequestException('Email cá nhân và họ tên không được để trống.');
    const base = generateStaffBaseEmail(fullName);
    const password = `N!${crypto.randomBytes(24).toString('base64url')}9a`;
    const passwordHash = await bcrypt.hash(password, 10);
    const frontend = (
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('ADMIN_PORTAL_URL') ||
      'http://localhost:5173'
    ).replace(/\/+$/, '');
    const loginUrl = `${frontend}/login`;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`staff-invite:email:${email}`}))`;
          await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`staff-invite:name:${base.toLowerCase()}`}))`;
          const existing = await tx.user.findFirst({
            where: {
              role: { in: [Role.ADMIN, Role.SUPPORT_STAFF] },
              OR: [
                { email: { equals: email, mode: 'insensitive' } },
                { personalEmail: { equals: email, mode: 'insensitive' } },
                { platformEmail: { equals: email, mode: 'insensitive' } },
              ],
            },
          });
          if (existing)
            throw new BadRequestException(
              'Email cá nhân đã liên kết với tài khoản Staff hoặc Admin.',
            );

          // Invalidate older activation tokens before allocating the replacement account.
          await tx.staffInvitation.updateMany({
            where: {
              personalEmail: { equals: email, mode: 'insensitive' },
              isAccepted: false,
            },
            data: { isAccepted: true },
          });
          const assignedEmail = await this.allocateEmail(tx, base);
          const user = await tx.user.create({
            data: {
              email: assignedEmail,
              platformEmail: assignedEmail,
              personalEmail: email,
              fullName,
              phoneNumber: dto.phoneNumber?.trim() || null,
              passwordHash,
              role: Role.SUPPORT_STAFF,
              isVerified: true,
              isSellerActive: false,
              reputationScore: INITIAL_REPUTATION_SCORE,
              trustLevel: INITIAL_REPUTATION_TRUST_LEVEL,
            },
          });
          await tx.wallet.create({
            data: { userId: user.id, balance: 0, lockedBalance: 0, currency: 'VND' },
          });
          const invitation = await tx.staffInvitation.create({
            data: {
              fullName,
              personalEmail: email,
              phoneNumber: dto.phoneNumber?.trim() || null,
              department: dto.department?.trim() || null,
              assignedEmail,
              token: crypto.randomBytes(32).toString('hex'),
              expiresAt: new Date(),
              isAccepted: true,
            },
          });

          const delivered = await this.mail.sendEmail({
            to: email,
            subject: '[Project Nexus] Tài khoản Staff đã sẵn sàng đăng nhập',
            sensitive: true,
            requireDelivery: true,
            text: `Xin chào ${fullName},\n\nAdmin đã cấp tài khoản Staff cho bạn.\nTài khoản đăng nhập: ${assignedEmail}\nMật khẩu ban đầu: ${password}\n\nĐăng nhập tại: ${loginUrl}\n\nBạn có thể đăng nhập ngay bằng thông tin trên, không cần kích hoạt qua đường dẫn. Để đặt mật khẩu của riêng mình, chọn "Quên mật khẩu" trên trang đăng nhập và nhập tài khoản ${assignedEmail}. Mã OTP sẽ được gửi về email cá nhân ${email}; dùng mã đó để đặt mật khẩu mới. Không dùng email cá nhân thay cho tài khoản công tác khi đặt lại mật khẩu Staff.`,
            html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Tài khoản Staff của bạn</h2>
            <p>Xin chào ${html(fullName)}, Admin đã cấp tài khoản để bạn đăng nhập ngay.</p>
            <p><strong>Tài khoản:</strong> ${html(assignedEmail)}<br><strong>Mật khẩu ban đầu:</strong> ${html(password)}</p>
            <p><a href="${html(loginUrl)}">Đăng nhập Project Nexus</a></p>
            <p>Để đặt mật khẩu riêng, chọn <strong>Quên mật khẩu</strong> trên trang đăng nhập và nhập
            <strong>${html(assignedEmail)}</strong>. Nhận OTP tại email cá nhân <strong>${html(email)}</strong>,
            rồi dùng OTP để đặt mật khẩu mới. Không cần mở đường dẫn kích hoạt.</p></div>`,
          });
          if (!delivered)
            throw new ServiceUnavailableException(
              'Chưa gửi được email cấp tài khoản Staff. Hãy kiểm tra cấu hình Gmail/SMTP và thử lại.',
            );
          return {
            success: true,
            message: 'Đã cấp tài khoản Staff và gửi thông tin đăng nhập về email cá nhân.',
            invitationId: invitation.id,
            assignedEmail,
            staff: {
              id: user.id,
              email: user.email,
              platformEmail: user.platformEmail,
              personalEmail: user.personalEmail,
              fullName: user.fullName,
              phoneNumber: user.phoneNumber,
              department: invitation.department,
              role: user.role,
              isVerified: user.isVerified,
              createdAt: user.createdAt,
            },
          };
        },
        { timeout: 45000, maxWait: 5000 },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          'Tài khoản Staff vừa được cấp bởi yêu cầu khác. Hãy kiểm tra lại danh sách Staff.',
        );
      }
      throw error;
    }
  }

  private async allocateEmail(tx: Prisma.TransactionClient, base: string): Promise<string> {
    for (let suffix = 1; suffix <= 99; suffix++) {
      const address = `${base}${suffix === 1 ? '' : suffix}@staff.com`;
      const user = await tx.user.findFirst({
        where: {
          OR: [
            { email: { equals: address, mode: 'insensitive' } },
            { platformEmail: { equals: address, mode: 'insensitive' } },
          ],
        },
      });
      if (user) continue;
      const reservation = await tx.staffInvitation.findFirst({
        where: {
          assignedEmail: { equals: address, mode: 'insensitive' },
          isAccepted: false,
          expiresAt: { gt: new Date() },
        },
      });
      if (!reservation) return address;
    }
    throw new ConflictException('Đã hết tên tài khoản Staff khả dụng cho họ tên này.');
  }
}
