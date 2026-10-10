import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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
      console.error('Lỗi gửi email:', error);
      throw new BadRequestException(
        'Không thể gửi email xác thực. Vui lòng kiểm tra lại cấu hình SMTP.',
      );
    }

    return {
      message: 'Đăng ký thành công! Vui lòng kiểm tra hộp thư Gmail để lấy mã OTP xác thực.',
      email,
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

    // Tạm thời trả về thông báo (Sau này có thể tích hợp cấp phát JWT Token ở đây)
    return {
      message: 'Đăng nhập thành công!',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
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
      },
      create: {
        email,
        fullName,
        avatarUrl: picture,
        passwordHash: '',
        isVerified: true,
      },
    });

    return {
      message: 'Đăng nhập bằng Google thành công!',
      user: {
        id: userRecord.id,
        email: userRecord.email,
        fullName: userRecord.fullName,
        avatarUrl: userRecord.avatarUrl,
      },
    };
  }
}
