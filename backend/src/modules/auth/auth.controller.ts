import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ================= 1. ĐĂNG NHẬP (CŨ) =================
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không chính xác' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // ================= 2. GOOGLE OAUTH (CŨ) =================
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary: 'Đăng nhập bằng Google',
    description: 'LƯU Ý: Vui lòng mở link trực tiếp trên trình duyệt, không bấm Execute.',
  })
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google Callback URL' })
  googleAuthRedirect(@Req() req: Request) {
    // Gọi hàm xử lý google login bên service (nếu bạn đặt tên hàm là googleLogin)
    return this.authService.googleLogin(req);
  }

  // ================= 3. ĐĂNG KÝ & XÁC THỰC (MỚI) =================
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
