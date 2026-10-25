import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { UsersService, UserProfileResponse } from '../../users/services/users.service';
import {
  ActivateStaffDto,
  ChangePasswordDto,
  StaffForgotPasswordDto,
  StaffResetPasswordDto,
} from '../dtos/auth.dto';
import {
  Public,
  CurrentUser,
  Roles,
  RequirePrivilege,
} from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/types';

@ApiTags('4. STAFF')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({
    summary:
      '[STAFF] Kiểm tra token và lấy thông tin xác nhận (Họ tên, SĐT, Email công ty cấp @staff.com)',
    description:
      'Staff mở link từ email mời -> hệ thống trả về thông tin đã được Admin tạo sẵn để Staff kiểm tra và xác nhận lại.',
  })
  @ApiQuery({ name: 'token', description: 'Mã token kích hoạt từ email' })
  @Public()
  @Get('invitation-info')
  async getInvitationInfo(@Query('token') token: string) {
    return this.authService.getStaffInvitationInfo(token);
  }

  @ApiOperation({
    summary:
      '[STAFF] Nhập mã token, xác nhận lại họ tên, SĐT, tạo mật khẩu mới -> Kích hoạt tài khoản @staff.com',
    description:
      'Staff nhận mã token qua email cá nhân -> nhập mã token, xác nhận lại Họ và tên, SĐT, nhập mật khẩu mới và xác nhận mật khẩu mới -> Kích hoạt tài khoản nền tảng cấp có đuôi @staff.com. Sau đó dùng email này để đăng nhập với vai trò là Staff.',
  })
  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activateStaff(@Body() dto: ActivateStaffDto): Promise<{
    success: boolean;
    message: string;
    assignedEmail: string;
    user: { id: string; fullName: string; platformEmail: string; role: Role };
  }> {
    return this.authService.activateStaff(dto);
  }

  @ApiOperation({
    summary: '[STAFF] PROFILE.VIEW - Xem thông tin hồ sơ của Staff',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @RequirePrivilege('PROFILE.VIEW')
  @Get('profile')
  async getStaffProfile(@CurrentUser('id') userId: string): Promise<UserProfileResponse> {
    return this.usersService.getProfile(userId);
  }

  @ApiOperation({
    summary:
      '[STAFF] PROFILE.RESET_PASSWORD (Bước 1) - Quên mật khẩu Staff: Gửi OTP 6 số về email cá nhân',
    description:
      'Staff nhập tài khoản được cấp có đuôi nexus@gmail.com (hoặc email cá nhân). Hệ thống sẽ gửi mã OTP ngẫu nhiên 6 chữ số về email cá nhân của Staff để xác thực.',
  })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: StaffForgotPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.requestForgotPassword(dto);
  }

  @ApiOperation({
    summary:
      '[STAFF] PROFILE.RESET_PASSWORD (Bước 2) - Xác nhận OTP và đặt lại mật khẩu mới cho Staff',
    description:
      'Staff nhập tài khoản có đuôi nexus@gmail.com, mã OTP 6 số đã nhận qua email cá nhân và mật khẩu mới.',
  })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: StaffResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.resetPasswordWithOtp(dto);
  }

  @ApiOperation({
    summary: '[STAFF] PROFILE.CHANGE_PASSWORD - Đổi mật khẩu trực tiếp cho Staff khi đã đăng nhập',
    description: 'Staff nhập mật khẩu hiện tại và mật khẩu mới để đổi mật khẩu bảo mật.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF, Role.ADMIN)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.changePassword(userId, dto);
  }
}
