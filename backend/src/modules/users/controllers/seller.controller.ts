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
    summary: '[SELLER] PROFILE.VIEW - View seller profile and wallet balance',
  })
  @Roles(Role.SELLER, Role.ADMIN, Role.SUPPORT_STAFF)
  @RequirePrivilege('PROFILE.VIEW')
  @Get('profile')
  async getSellerProfile(@CurrentUser('id') userId: string): Promise<UserProfileResponse> {
    return this.usersService.getProfile(userId);
  }

  @ApiOperation({
    summary: '[SELLER] View shop profile details',
    description: 'Returns shop name, description, hotline, business email, and warehouse address.',
  })
  @Roles(Role.SELLER, Role.ADMIN)
  @Get('shop-profile')
  async getShopProfile(@CurrentUser('id') userId: string) {
    return this.shopsService.getShopProfile(userId);
  }

  @ApiOperation({
    summary:
      '[SELLER] Update shop profile (name, description, contact info, and warehouse address)',
    description:
      'Updates shop brand name, description, hotline, contact email, and pickup warehouse address.',
  })
  @ApiResponse({ status: 200, description: 'Shop profile updated successfully' })
  @ApiResponse({ status: 403, description: 'Missing Seller role or shop is suspended' })
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
    summary: '[SELLER / BUYER] Toggle between Seller and Buyer operating modes',
    description:
      'Allows approved Seller accounts to switch isSellerActive (true or false) within the same session.',
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
