import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { AuthService as SharedAuthService } from '../auth.service';
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
import { UpdateStaffProfileDto } from '../dto/update-staff-profile.dto';

@ApiTags('4. STAFF')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly sharedAuth: SharedAuthService,
  ) {}

  @ApiOperation({
    deprecated: true,
    summary: '[LEGACY] Tra cứu token kích hoạt đã ngừng hỗ trợ (410)',
    description:
      'Staff nhận tài khoản và mật khẩu ngẫu nhiên qua email, đăng nhập ngay; dùng Quên mật khẩu để đặt lại.',
  })
  @ApiQuery({ name: 'token', description: 'Mã token kích hoạt từ email' })
  @Public()
  @Get('invitation-info')
  async getInvitationInfo(@Query('token') token: string) {
    return this.authService.getStaffInvitationInfo(token);
  }

  @ApiOperation({
    deprecated: true,
    summary: '[LEGACY] Kích hoạt bằng token đã ngừng hỗ trợ (410)',
    description:
      'Tài khoản Staff được tạo và kích hoạt khi Admin gửi lời mời. Endpoint này không thể tạo tài khoản hoặc thay mật khẩu.',
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

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF)
  @ApiOperation({ summary: 'Staff cập nhật họ tên, số điện thoại và avatar của chính mình' })
  updateStaffProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateStaffProfileDto,
  ): Promise<UserProfileResponse> {
    return this.usersService.updateStaffProfile(userId, dto);
  }

  @ApiOperation({
    summary:
      '[STAFF] PROFILE.RESET_PASSWORD (Bước 1) - Quên mật khẩu Staff: Gửi OTP 6 số về email cá nhân',
    description:
      'Staff nhập tài khoản được cấp dạng HuyNQ@staff.com. OTP gửi về email cá nhân; dùng chung luồng Quên mật khẩu của hệ thống.',
  })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: StaffForgotPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.sharedAuth.forgotPassword(dto);
    return { success: true, message: result.message };
  }

  @ApiOperation({
    summary:
      '[STAFF] PROFILE.RESET_PASSWORD (Bước 2) - Xác nhận OTP và đặt lại mật khẩu mới cho Staff',
    description:
      'Staff nhập tài khoản @staff.com, OTP nhận ở email cá nhân và mật khẩu mới. Dùng chung xử lý với reset-password thông thường.',
  })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: StaffResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.sharedAuth.resetPassword({
      email: dto.email,
      code: dto.otp,
      newPassword: dto.newPassword,
    });
    return { success: true, message: result.message };
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
