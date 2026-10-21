import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService, GoogleUser, UserProfileResponse } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfirmChangePasswordOtpDto } from './dto/confirm-change-password-otp.dto';
import { JwtAuthGuard } from '../../core/security/jwt-auth.guard';
import { CurrentUser } from '../../core/security/roles.decorator';

interface RequestWithUser extends Request {
  user?: GoogleUser;
}

@ApiTags('1. AUTH')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // ================= 1. ĐĂNG NHẬP =================
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không chính xác' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // ================= 2. GOOGLE OAUTH =================
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Đăng nhập bằng Google',
    description: 'LƯU Ý: Vui lòng mở link trực tiếp trên trình duyệt, không bấm Execute.',
  })
  async googleAuth(): Promise<void> {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google Callback URL' })
  async googleAuthRedirect(@Req() req: RequestWithUser, @Res() res: Response): Promise<void> {
    const result = await this.authService.googleLogin(req.user);
    const portWeb = this.configService.get<string>('PORT_WEB') || process.env.PORT_WEB || '5173';
    const frontendUrl = (
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      `http://localhost:${portWeb}`
    ).replace(/\/$/, '');

    const params = new URLSearchParams({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: JSON.stringify(result.user),
    });

    res.redirect(`${frontendUrl}/?${params.toString()}`);
  }

  // ================= 3. ĐĂNG KÝ & XÁC THỰC =================
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới & gửi mã OTP về email' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, vui lòng check mail' })
  async register(@Body() dto: RegisterDto): Promise<{ message: string; email: string }> {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Xác thực tài khoản bằng mã OTP nhận từ email' })
  @ApiResponse({ status: 200, description: 'Xác thực thành công' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  // ================= 4. QUÊN MẬT KHẨU =================
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quên mật khẩu - gửi mã OTP đặt lại mật khẩu về Gmail' })
  @ApiResponse({ status: 200, description: 'Đã gửi mã OTP về email' })
  @ApiResponse({ status: 400, description: 'Email không tồn tại hoặc tài khoản chưa xác thực' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string; email: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng mã OTP nhận từ email' })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP không chính xác hoặc đã hết hạn' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  // ================= 5. REFRESH TOKEN & ĐĂNG XUẤT =================
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  @ApiResponse({ status: 200, description: 'Làm mới token thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất và thu hồi Refresh Token' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  async logout(@Body() dto: RefreshTokenDto): Promise<{ message: string }> {
    return this.authService.logout(dto);
  }

  // ================= 6. HỒ SƠ CÁ NHÂN & BẢO MẬT =================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PROFILE.VIEW - Xem thông tin hồ sơ của tài khoản đang đăng nhập',
    description: 'Bóc tách userId từ Token qua JwtAuthGuard và trả về thông tin chi tiết.',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin tài khoản thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập hoặc token không hợp lệ' })
  async getProfile(@CurrentUser('id') userId: string): Promise<UserProfileResponse> {
    return this.authService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PROFILE.UPDATE - Cập nhật thông tin cá nhân (Họ tên, SĐT, Avatar)',
    description:
      'Cho phép người dùng chỉnh sửa họ tên, số điện thoại hoặc ảnh đại diện (không cần OTP).',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật hồ sơ thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    return this.authService.updateProfile(userId, dto);
  }

  @Post('change-password/request-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PROFILE.CHANGE_PASSWORD (Bước 1) - Gửi mã OTP xác nhận đổi mật khẩu về Gmail',
    description:
      'Tạo mã OTP ngẫu nhiên 6 số (hạn 15 phút) gửi về hòm thư Gmail hiện tại của người dùng.',
  })
  @ApiResponse({ status: 200, description: 'Đã gửi mã OTP về Gmail thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async requestChangePasswordOtp(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.requestChangePasswordOtp(userId);
  }

  @Post('change-password/confirm-otp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PROFILE.CHANGE_PASSWORD (Bước 2) - Xác nhận OTP và cập nhật mật khẩu mới',
    description:
      'Xác thực OTP, cập nhật mật khẩu mới và thu hồi toàn bộ phiên đăng nhập cũ để bảo mật tài khoản.',
  })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP không đúng hoặc đã hết hạn' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async confirmChangePasswordWithOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: ConfirmChangePasswordOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.confirmChangePasswordWithOtp(userId, dto);
  }
}
