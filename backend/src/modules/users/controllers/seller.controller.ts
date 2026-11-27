import { ShopsService } from '../services/shops.service';
import { Controller, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody } from '@nexus/contracts/nest';
import { UserProfileResponse, UsersService } from '../services/users.service';
import { CurrentUser, RequirePrivilege, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/contracts';
import { UpdateShopProfileInput, UpdateShopProfileSchema } from '../dtos/update-shop-profile.dto';

@ApiTags('3. SELLER')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('seller')
export class SellerController {
  constructor(
    private readonly usersService: UsersService,
    private readonly shopsService: ShopsService,
  ) {}

  @ApiOperation({
    summary: '[SELLER] PROFILE.VIEW - Xem hồ sơ và ví người bán',
  })
  @Roles(Role.SELLER, Role.ADMIN, Role.SUPPORT_STAFF)
  @RequirePrivilege('PROFILE.VIEW')
  @Get('profile')
  async getSellerProfile(@CurrentUser('id') userId: string): Promise<UserProfileResponse> {
    return this.usersService.getProfile(userId);
  }

  @ApiOperation({
    summary: '[SELLER] Xem thông tin chi tiết hồ sơ gian hàng của mình',
    description:
      'Lấy thông tin tên gian hàng, mô tả, hotline, email kinh doanh và địa chỉ kho hàng.',
  })
  @Roles(Role.SELLER, Role.ADMIN)
  @Get('shop-profile')
  async getShopProfile(@CurrentUser('id') userId: string) {
    return this.shopsService.getShopProfile(userId);
  }

  @ApiOperation({
    summary:
      '[SELLER] Cập nhật thông tin gian hàng (Sửa tên, mô tả, thông tin liên hệ và địa chỉ shop)',
    description:
      'Người bán cập nhật lại tên thương hiệu gian hàng, lời giới thiệu/mô tả shop, số hotline, email liên hệ và địa chỉ kho xuất hàng.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thông tin gian hàng thành công' })
  @ApiResponse({ status: 403, description: 'Chưa có quyền Seller hoặc shop đang bị đình chỉ' })
  @Roles(Role.SELLER, Role.ADMIN)
  @Patch('shop-profile')
  @HttpCode(HttpStatus.OK)
  async updateShopProfile(
    @CurrentUser('id') userId: string,
    @ZodBody(UpdateShopProfileSchema) dto: UpdateShopProfileInput,
  ) {
    return this.shopsService.updateShopProfile(userId, dto);
  }

  @ApiOperation({
    summary: '[SELLER / BUYER] Chuyển đổi qua lại giữa role Seller hoặc Buyer',
    description:
      'Sau khi Buyer đã được Admin duyệt thành tài khoản Seller, tài khoản có thể linh hoạt chuyển đổi chế độ hoạt động (isSellerActive: true/false) trong cùng phiên làm việc.',
  })
  @Roles(Role.SELLER, Role.ADMIN, Role.SUPPORT_STAFF)
  @Patch('toggle-mode')
  @HttpCode(HttpStatus.OK)
  async toggleSellerMode(@CurrentUser('id') userId: string): Promise<{
    success: boolean;
    message: string;
    isSellerActive: boolean;
    currentMode: 'SELLER' | 'BUYER';
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      isSellerActive: boolean;
    };
  }> {
    return this.usersService.toggleSellerMode(userId);
  }
}
