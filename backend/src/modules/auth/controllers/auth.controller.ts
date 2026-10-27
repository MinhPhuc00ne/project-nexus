import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService, AuthTokensResult } from '../services/auth.service';
import {
  RegisterBuyerDto,
  LoginDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordRequestDto,
  ResetPasswordWithOtpDto,
} from '../dtos/auth.dto';
import {
  Public,
  CurrentUser,
  AuthenticatedUserPayload,
} from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';

@ApiTags('1. AUTH')
@Controller(['auth', 'api/v1/auth'])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractCookieToken(req: Request): string | undefined {
    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader) return undefined;
    const cookies = cookieHeader.split(';').reduce(
      (acc, str) => {
        const [key, ...vals] = str.trim().split('=');
        if (key) acc[key] = decodeURIComponent(vals.join('='));
        return acc;
      },
      {} as Record<string, string>,
    );
    return cookies['refreshToken'];
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken', { path: '/' });
  }

  @ApiOperation({
    summary: '[BUYER] AUTH.REGISTER - Đăng ký tài khoản Buyer mới',
    description:
      'Người mua đăng ký tài khoản với họ và tên, email cá nhân, mật khẩu và số điện thoại (tự động khởi tạo ví 0đ và tích hợp Refresh Token qua HttpOnly Cookie).',
  })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterBuyerDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensResult> {
    const result = await this.authService.registerBuyer(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @ApiOperation({
    summary: 'AUTH.LOGIN - Đăng nhập hệ thống (Dành cho Buyer, Seller, Staff, Admin)',
    description:
      'Đăng nhập hệ thống. Tự động thiết lập Refresh Token qua HttpOnly Cookie. Staff sử dụng email có đuôi nexus@gmail.com.',
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokensResult> {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @ApiOperation({
    summary: 'AUTH.LOGOUT - Đăng xuất và thu hồi Refresh Token (tự động xóa Cookie)',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ): Promise<{ success: boolean }> {
    const token = bodyToken || this.extractCookieToken(req);
    this.clearRefreshTokenCookie(res);
    return this.authService.logout(user.id, token);
  }

  @ApiExcludeEndpoint()
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshTokenDto,
  ): Promise<AuthTokensResult> {
    const token = dto?.refreshToken || this.extractCookieToken(req);
    if (!token) {
      throw new BadRequestException('Refresh token is required');
    }
    const result = await this.authService.refreshToken({ refreshToken: token });
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @ApiOperation({
    summary: 'PROFILE.CHANGE_PASSWORD - Đổi mật khẩu tài khoản hiện tại',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.changePassword(userId, dto);
  }

  @ApiOperation({
    summary: 'PROFILE.RESET_PASSWORD (Bước 1) - Quên mật khẩu: Gửi mã OTP 6 số về email',
    description:
      'Hỗ trợ cho mọi tài khoản (Staff khi quên mật khẩu sẽ nhận OTP qua email cá nhân đã đăng ký).',
  })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.requestForgotPassword(dto);
  }

  @ApiOperation({
    summary: 'PROFILE.RESET_PASSWORD (Bước 2) - Xác nhận OTP và đặt lại mật khẩu mới',
  })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordWithOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPasswordWithOtp(dto);
  }
}
