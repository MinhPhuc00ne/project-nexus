import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from '../../auth/services/auth.service';
import { UsersService } from '../../users/services/users.service';
import { InviteStaffDto } from '../../auth/dtos/auth.dto';
import { ReviewSellerUpgradeDto } from '../../users/dtos/users.dto';
import { CurrentUser, Roles, RequirePrivilege } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/types';
import { ProvisionedStaffResult } from '../../auth/services/staff-provisioning.service';
import { SellerRequestStatus } from '@prisma/client';

@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({
    summary: '[ADMIN] Cấp tài khoản Staff và gửi thông tin đăng nhập qua email cá nhân',
    description:
      'Tạo tài khoản @staff.com theo format cũ, sinh mật khẩu ngẫu nhiên và gửi về email cá nhân. Staff dùng Quên mật khẩu để đặt lại; không dùng token kích hoạt.',
  })
  @RequirePrivilege('USER.MANAGE')
  @Post('staff/invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteStaff(@Body() dto: InviteStaffDto): Promise<ProvisionedStaffResult> {
    return this.authService.inviteStaff(dto);
  }

  @ApiOperation({
    summary: '[ADMIN] Xem danh sách các hồ sơ xin nâng cấp tài khoản lên Seller',
    description:
      'Admin lọc và xem hồ sơ kèm thông tin cửa hàng, số điện thoại và file/ảnh chứng minh.',
  })
  @RequirePrivilege('USER.MANAGE')
  @Get('seller-requests')
  async listSellerRequests(@Query('status') status?: SellerRequestStatus) {
    return this.usersService.listSellerRequests(status);
  }

  @ApiOperation({
    summary: '[ADMIN] Duyệt (APPROVED) hoặc Từ chối (REJECTED) hồ sơ nâng cấp Seller',
    description:
      'Chỉ Admin có thẩm quyền duyệt. Khi duyệt thành công (APPROVED), tài khoản được cấp quyền Seller và có thể chuyển đổi qua lại giữa Buyer và Seller.',
  })
  @RequirePrivilege('USER.MANAGE')
  @Patch('seller-requests/:id/review')
  async reviewSellerUpgrade(
    @Param('id') requestId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewSellerUpgradeDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.usersService.reviewSellerUpgrade(requestId, adminId, dto);
  }
}
