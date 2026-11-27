import {
  Controller,
  Get,
  GoneException,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery } from '@nexus/contracts/nest';
import {
  StaffInvitationQuery,
  StaffInvitationQuerySchema,
} from '../../../core/validation/query-schemas';
import { AuthService } from '../services/auth.service';
import { AuthProfileService, UserProfileResponse } from '../services/auth-profile.service';
import {
  ActivateStaffInput,
  ActivateStaffSchema,
  ChangePasswordInput,
  ChangePasswordSchema,
  StaffForgotPasswordInput,
  StaffForgotPasswordSchema,
  StaffResetPasswordInput,
  StaffResetPasswordSchema,
} from '../dtos/auth.dto';
import {
  CurrentUser,
  Public,
  RequirePrivilege,
  Roles,
} from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/contracts';
import {
  UpdateStaffProfileInput,
  UpdateStaffProfileSchema,
} from '../dtos/update-staff-profile.dto';

@ApiTags('4. STAFF')
@Controller('staff')
export class StaffController {
  constructor(
    private readonly authProfileService: AuthProfileService,
    private authService: AuthService,
    sharedAuth?: AuthService,
  ) {
    if (
      sharedAuth &&
      typeof (sharedAuth as { forgotPassword?: unknown }).forgotPassword === 'function'
    ) {
      this.authService = sharedAuth;
    }
  }

  @ApiOperation({
    deprecated: true,
    summary: '[LEGACY] Tra cứu token kích hoạt đã ngừng hỗ trợ (410)',
    description:
      'Staff nhận tài khoản và mật khẩu ngẫu nhiên qua email, đăng nhập ngay; dùng Quên mật khẩu để đặt lại.',
  })
  @Public()
  @Get('invitation-info')
  async getInvitationInfo(
    @ZodQuery(StaffInvitationQuerySchema) _query: StaffInvitationQuery,
  ): Promise<never> {
    throw new GoneException(
      'Staff được cấp tài khoản và mật khẩu qua email. Vui lòng đăng nhập hoặc dùng Quên mật khẩu.',
    );
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
  async activateStaff(@ZodBody(ActivateStaffSchema) _dto: ActivateStaffInput): Promise<never> {
    throw new GoneException(
      'Luồng kích hoạt bằng token đã ngừng. Vui lòng dùng tài khoản được cấp hoặc Quên mật khẩu.',
    );
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
    return this.authProfileService.getProfile(userId);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPPORT_STAFF)
  @ApiOperation({ summary: 'Staff cập nhật họ tên, số điện thoại và avatar của chính mình' })
  updateStaffProfile(
    @CurrentUser('id') userId: string,
    @ZodBody(UpdateStaffProfileSchema) dto: UpdateStaffProfileInput,
  ): Promise<UserProfileResponse> {
    return this.authProfileService.updateStaffProfile(userId, dto);
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
    @ZodBody(StaffForgotPasswordSchema) dto: StaffForgotPasswordInput,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.authService.forgotPassword(dto);
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
    @ZodBody(StaffResetPasswordSchema) dto: StaffResetPasswordInput,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.authService.resetPassword({
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
    @ZodBody(ChangePasswordSchema) dto: ChangePasswordInput,
  ): Promise<{ success: boolean; message: string }> {
    return this.authProfileService.changePassword(userId, dto);
  }
}
