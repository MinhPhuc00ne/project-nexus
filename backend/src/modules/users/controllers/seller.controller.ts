import { Controller, Patch, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService, UserProfileResponse } from '../services/users.service';
import { CurrentUser, Roles, RequirePrivilege } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/types';

@ApiTags('3. SELLER')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('seller')
export class SellerController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: '[SELLER] PROFILE.VIEW - Xem hồ sơ và ví người bán',
  })
  @Roles(Role.SELLER, Role.ADMIN)
  @RequirePrivilege('PROFILE.VIEW')
  @Get('profile')
  async getSellerProfile(@CurrentUser('id') userId: string): Promise<UserProfileResponse> {
    return this.usersService.getProfile(userId);
  }

  @ApiOperation({
    summary: '[SELLER / BUYER] Chuyển đổi qua lại giữa role Seller hoặc Buyer',
    description:
      'Sau khi Buyer đã được Admin duyệt thành tài khoản Seller, tài khoản có thể linh hoạt chuyển đổi chế độ hoạt động (isSellerActive: true/false) trong cùng phiên làm việc.',
  })
  @Roles(Role.SELLER, Role.ADMIN)
  @Patch('toggle-mode')
  @HttpCode(HttpStatus.OK)
  async toggleSellerMode(@CurrentUser('id') userId: string): Promise<{
    success: boolean;
    isSellerActive: boolean;
    currentMode: 'SELLER' | 'BUYER';
  }> {
    return this.usersService.toggleSellerMode(userId);
  }
}
