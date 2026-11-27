import {
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
import { Throttle } from '@nestjs/throttler';
import { ZodBody } from '@nexus/contracts/nest';
import { Request, Response } from 'express';
import { AuthService, GoogleUser, UserProfileResponse } from '../services/auth.service';
import { AuthProfileService } from '../services/auth-profile.service';
import { OAuthCodeService } from '../services/oauth-code.service';
import { ForgotPasswordInput, ForgotPasswordSchema } from '../dtos/forgot-password.dto';
import { LoginInput, LoginSchema } from '../dtos/login.dto';
import { RefreshTokenInput, RefreshTokenSchema } from '../dtos/refresh-token.dto';
import { RegisterInput, RegisterSchema } from '../dtos/register.dto';
import { ResetPasswordInput, ResetPasswordSchema } from '../dtos/reset-password.dto';
import { VerifyEmailInput, VerifyEmailSchema } from '../dtos/verify-email.dto';
import { ExchangeOAuthCodeInput, ExchangeOAuthCodeSchema } from '../dtos/exchange-oauth-code.dto';
import {
  ReauthenticateProfileInput,
  ReauthenticateProfileSchema,
  UpdateAuthProfileInput,
  UpdateAuthProfileSchema,
} from '../dtos/update-profile.dto';
import {
  ConfirmChangePasswordOtpInput,
  ConfirmChangePasswordOtpSchema,
} from '../dtos/confirm-change-password-otp.dto';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { CurrentUser, RequirePrivilege, Roles } from '../../../core/security/roles.decorator';
import { Role } from '@nexus/contracts';

interface RequestWithUser extends Request {
  user?: GoogleUser;
}

@ApiTags('1. AUTH')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly authProfileService: AuthProfileService,
    private readonly oauthCodes: OAuthCodeService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không chính xác' })
  async login(@ZodBody(LoginSchema) loginDto: LoginInput) {
    return this.authService.login(loginDto);
  }

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

    // Only an opaque, single-use code travels in the URL. Putting the tokens
    // here would leave them in browser history, in the Referer header of the
    // next request the page makes, and in every log along the way.
    const code = await this.oauthCodes.issue({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });

    res.redirect(`${frontendUrl}/?code=${encodeURIComponent(code)}`);
  }

  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đổi mã OAuth một lần sang phiên đăng nhập',
    description:
      'Nhận mã opaque từ redirect của Google callback và trả về access token, refresh token cùng thông tin tài khoản. Mã chỉ dùng được một lần, hết hạn sau 60 giây.',
  })
  @ApiResponse({ status: 200, description: 'Đổi mã thành công' })
  @ApiResponse({ status: 401, description: 'Mã không hợp lệ, đã dùng hoặc đã hết hạn' })
  async exchangeOAuthCode(@ZodBody(ExchangeOAuthCodeSchema) dto: ExchangeOAuthCodeInput) {
    return this.oauthCodes.redeem(dto.code);
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Đăng ký tài khoản mới & gửi mã OTP về email' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, vui lòng check mail' })
  async register(
    @ZodBody(RegisterSchema) dto: RegisterInput,
  ): Promise<{ message: string; email: string }> {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Xác thực tài khoản bằng mã OTP nhận từ email' })
  @ApiResponse({ status: 200, description: 'Xác thực thành công' })
  async verifyEmail(@ZodBody(VerifyEmailSchema) dto: VerifyEmailInput) {
    return this.authService.verifyEmail(dto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quên mật khẩu - gửi mã OTP đặt lại mật khẩu về Gmail' })
  @ApiResponse({ status: 200, description: 'Đã gửi mã OTP về email' })
  @ApiResponse({ status: 400, description: 'Email không tồn tại hoặc tài khoản chưa xác thực' })
  async forgotPassword(
    @ZodBody(ForgotPasswordSchema) dto: ForgotPasswordInput,
  ): Promise<{ message: string; email: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng mã OTP nhận từ email' })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Mã OTP không chính xác hoặc đã hết hạn' })
  async resetPassword(
    @ZodBody(ResetPasswordSchema) dto: ResetPasswordInput,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới Access Token bằng Refresh Token' })
  @ApiResponse({ status: 200, description: 'Làm mới token thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  async refreshToken(@ZodBody(RefreshTokenSchema) dto: RefreshTokenInput) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất và thu hồi Refresh Token' })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  async logout(@ZodBody(RefreshTokenSchema) dto: RefreshTokenInput): Promise<{ message: string }> {
    return this.authService.logout(dto);
  }

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
    return this.authProfileService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @RequirePrivilege('PROFILE.UPDATE')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PROFILE.UPDATE - Cập nhật thông tin cá nhân (Họ tên, SĐT, Avatar)',
    description:
      'Buyer cập nhật thông thường; Seller cần đăng nhập bằng mật khẩu trong 5 phút gần đây, mật khẩu hiện tại hoặc token reauthenticate hợp lệ.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật hồ sơ thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @ZodBody(UpdateAuthProfileSchema) dto: UpdateAuthProfileInput,
  ): Promise<UserProfileResponse> {
    return this.authProfileService.updateProfile(userId, dto);
  }

  @Post('profile/reauthenticate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xác minh lại mật khẩu, cấp token cập nhật hồ sơ trong 5 phút' })
  @HttpCode(HttpStatus.OK)
  reauthenticate(
    @CurrentUser('id') userId: string,
    @ZodBody(ReauthenticateProfileSchema) dto: ReauthenticateProfileInput,
  ): ReturnType<AuthProfileService['reauthenticate']> {
    return this.authProfileService.reauthenticate(userId, dto.password);
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
    return this.authProfileService.requestChangePasswordOtp(userId);
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
    @ZodBody(ConfirmChangePasswordOtpSchema) dto: ConfirmChangePasswordOtpInput,
  ): Promise<{ success: boolean; message: string }> {
    return this.authProfileService.confirmChangePasswordWithOtp(userId, dto);
  }
}
