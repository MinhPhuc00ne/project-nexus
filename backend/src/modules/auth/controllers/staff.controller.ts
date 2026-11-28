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
import { Throttle } from '@nestjs/throttler';
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
    summary: '[LEGACY] Deprecated activation token lookup (410)',
    description:
      'Staff accounts receive credentials via email and sign in directly; use Forgot Password to reset.',
  })
  @Public()
  @Get('invitation-info')
  async getInvitationInfo(
    @ZodQuery(StaffInvitationQuerySchema) _query: StaffInvitationQuery,
  ): Promise<never> {
    throw new GoneException(
      'Staff credentials are issued via email. Please sign in or use Forgot Password.',
    );
  }

  @ApiOperation({
    deprecated: true,
    summary: '[LEGACY] Deprecated token-based staff activation (410)',
    description:
      'Staff accounts are created and activated when an Admin sends an invitation. This endpoint no longer creates accounts or updates passwords.',
  })
  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activateStaff(@ZodBody(ActivateStaffSchema) _dto: ActivateStaffInput): Promise<never> {
    throw new GoneException(
      'Token-based activation has been retired. Use your issued credentials or Forgot Password.',
    );
  }

  @ApiOperation({
    summary: '[STAFF] PROFILE.VIEW - View Staff profile',
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
  @ApiOperation({ summary: 'Update own full name, phone number, and avatar (Staff)' })
  updateStaffProfile(
    @CurrentUser('id') userId: string,
    @ZodBody(UpdateStaffProfileSchema) dto: UpdateStaffProfileInput,
  ): Promise<UserProfileResponse> {
    return this.authProfileService.updateStaffProfile(userId, dto);
  }

  @ApiOperation({
    summary: '[STAFF] PROFILE.RESET_PASSWORD (Step 1) - Send 6-digit OTP to personal email',
    description:
      'Accepts the issued @staff.com account and sends a password-reset OTP to the staff personal email.',
  })
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @ZodBody(StaffForgotPasswordSchema) dto: StaffForgotPasswordInput,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.authService.forgotPassword(dto);
    return { success: true, message: result.message };
  }

  @ApiOperation({
    summary: '[STAFF] PROFILE.RESET_PASSWORD (Step 2) - Verify OTP and set new Staff password',
    description:
      'Accepts the @staff.com account, personal email OTP, and new password using the standard password-reset flow.',
  })
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
    summary: '[STAFF] PROFILE.CHANGE_PASSWORD - Change password while signed in (Staff)',
    description: 'Requires current password and new password.',
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
