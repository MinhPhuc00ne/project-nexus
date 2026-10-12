import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

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

    return {
      message: 'Đăng ký thành công! Vui lòng kiểm tra hộp thư Gmail để lấy mã OTP xác thực.',
      email,
      code: verificationCode,
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
    const user = await this.prisma.user.findUnique({ where: { email } });

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

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Đăng nhập thành công!',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
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

    const accessToken = this.jwtService.sign({
      sub: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
    });

    return {
      message: 'Đăng nhập bằng Google thành công!',
      accessToken,
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
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string; email: string; code?: string }> {
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

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // Hạn 10 phút

    await this.prisma.user.update({
      where: { email },
      data: { verificationCode: resetCode, codeExpiresAt },
    });

    try {
      await this.sendPasswordResetEmail(email, resetCode);
    } catch (error) {
      Logger.warn(
        `[DEV MODE] Chưa cấu hình SMTP hoặc gửi mail thất bại: ${(error as Error).message}`,
        AuthService.name,
      );
    }

    Logger.log(
      `🔑 [OTP FORGOT PASSWORD] Mã đặt lại mật khẩu cho ${email} là: ${resetCode}`,
      AuthService.name,
    );

    return {
      message: 'Mã OTP đặt lại mật khẩu đã được tạo thành công!',
      email,
      code: resetCode,
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

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { email },
      data: { passwordHash, verificationCode: null, codeExpiresAt: null },
    });

    return {
      message: 'Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.',
    };
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
      Logger.error(
        `Gửi email đặt lại mật khẩu thất bại: ${(error as Error).message}`,
        AuthService.name,
      );
      throw new BadRequestException(
        'Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại cấu hình SMTP.',
      );
    }
  }
}
