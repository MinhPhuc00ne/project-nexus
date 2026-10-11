import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService, GoogleUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

interface RequestWithUser extends Request {
  user?: GoogleUser;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  googleAuthRedirect(@Req() req: RequestWithUser) {
    return this.authService.googleLogin(req.user);
  }

  // ================= 3. ĐĂNG KÝ & XÁC THỰC =================
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới & gửi mã OTP về email' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, vui lòng check mail' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Xác thực tài khoản bằng mã OTP nhận từ email' })
  @ApiResponse({ status: 200, description: 'Xác thực thành công' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }
}
