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
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({ status: 200, description: 'Signed in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@ZodBody(LoginSchema) loginDto: LoginInput) {
    return this.authService.login(loginDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Sign in with Google OAuth',
    description: 'Open this URL directly in a browser rather than executing from Swagger UI.',
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a one-time OAuth code for session tokens',
    description:
      'Accepts the opaque code from the Google callback redirect and returns access token, refresh token, and account details. Single-use, expires after 60 seconds.',
  })
  @ApiResponse({ status: 200, description: 'Code exchanged successfully' })
  @ApiResponse({ status: 401, description: 'Invalid, already-used, or expired code' })
  async exchangeOAuthCode(@ZodBody(ExchangeOAuthCodeSchema) dto: ExchangeOAuthCodeInput) {
    return this.oauthCodes.redeem(dto.code);
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new account and send an email OTP code' })
  @ApiResponse({ status: 201, description: 'Registration succeeded; check email for OTP' })
  async register(
    @ZodBody(RegisterSchema) dto: RegisterInput,
  ): Promise<{ message: string; email: string }> {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Verify account email using the OTP code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@ZodBody(VerifyEmailSchema) dto: VerifyEmailInput) {
    return this.authService.verifyEmail(dto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password-reset OTP code via email' })
  @ApiResponse({ status: 200, description: 'OTP sent to email' })
  @ApiResponse({ status: 400, description: 'Email not found or account not verified' })
  async forgotPassword(
    @ZodBody(ForgotPasswordSchema) dto: ForgotPasswordInput,
  ): Promise<{ message: string; email: string }> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using the email OTP code' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code' })
  async resetPassword(
    @ZodBody(ResetPasswordSchema) dto: ResetPasswordInput,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@ZodBody(RefreshTokenSchema) dto: RefreshTokenInput) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out and revoke the refresh token' })
  @ApiResponse({ status: 200, description: 'Signed out successfully' })
  async logout(@ZodBody(RefreshTokenSchema) dto: RefreshTokenInput): Promise<{ message: string }> {
    return this.authService.logout(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PROFILE.VIEW - Get the authenticated user profile',
    description: 'Extracts userId from the JWT via JwtAuthGuard and returns profile details.',
  })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated or invalid token' })
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
    summary: 'PROFILE.UPDATE - Update personal profile (full name, phone number, avatar)',
    description:
      'Buyers update directly; sellers require a password sign-in within the last 5 minutes, current password, or a valid reauthentication token.',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @ZodBody(UpdateAuthProfileSchema) dto: UpdateAuthProfileInput,
  ): Promise<UserProfileResponse> {
    return this.authProfileService.updateProfile(userId, dto);
  }

  @Post('profile/reauthenticate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-verify password and issue a 5-minute profile update token' })
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
    summary: 'PROFILE.CHANGE_PASSWORD (Step 1) - Send password-change OTP to email',
    description: 'Generates a 6-digit OTP (15-minute TTL) and sends it to the user email address.',
  })
  @ApiResponse({ status: 200, description: 'OTP sent to email successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async requestChangePasswordOtp(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.authProfileService.requestChangePasswordOtp(userId);
  }

  @Post('change-password/confirm-otp')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'PROFILE.CHANGE_PASSWORD (Step 2) - Verify OTP and update password',
    description:
      'Verifies the OTP, updates the password, and revokes all existing sessions for security.',
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async confirmChangePasswordWithOtp(
    @CurrentUser('id') userId: string,
    @ZodBody(ConfirmChangePasswordOtpSchema) dto: ConfirmChangePasswordOtpInput,
  ): Promise<{ success: boolean; message: string }> {
    return this.authProfileService.confirmChangePasswordWithOtp(userId, dto);
  }
}
