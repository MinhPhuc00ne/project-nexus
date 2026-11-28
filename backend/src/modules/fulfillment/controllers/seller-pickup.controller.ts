import { Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodQuery, ZodParam } from '@nexus/contracts/nest';
import { Role, UuidParamSchema } from '@nexus/contracts';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { SellerPickupService } from '../services/seller-pickup.service';
import { GhnShopApiService } from '../services/ghn-shop-api.service';
import {
  GhnShopPageInput,
  GhnShopPageSchema,
  SellerPickupInput,
  SellerPickupSchema,
  VerifySellerPickupInput,
  VerifySellerPickupSchema,
} from '../dtos/seller-pickup.dto';

@ApiTags('10. FULFILLMENT & SHIPPING')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER)
@Controller('seller/shipping/pickup-point')
export class SellerPickupController {
  constructor(private readonly points: SellerPickupService) {}

  @Get()
  @ApiOperation({ summary: '[SELLER] Sync GHN pickup point from shop profile' })
  mine(@CurrentUser('id') sellerId: string): ReturnType<SellerPickupService['mine']> {
    return this.points.mine(sellerId);
  }

  @Put()
  @ApiOperation({
    summary: '[SELLER] Reconnect GHN using shop profile address',
    description: 'Submitted address must match shop profile. Update address under shop-profile.',
  })
  propose(
    @CurrentUser('id') sellerId: string,
    @ZodBody(SellerPickupSchema) dto: SellerPickupInput,
  ): ReturnType<SellerPickupService['propose']> {
    return this.points.propose(sellerId, dto);
  }
}

@ApiTags('10. FULFILLMENT & SHIPPING')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/shipping')
export class AdminPickupController {
  constructor(
    private readonly points: SellerPickupService,
    private readonly shops: GhnShopApiService,
  ) {}

  @Get('pickup-points')
  @ApiOperation({ summary: '[ADMIN] List pickup points pending verification' })
  pending(): ReturnType<SellerPickupService['pending']> {
    return this.points.pending();
  }

  @Get('ghn-shops')
  @ApiOperation({
    summary: '[ADMIN] List GHN shops on the platform account using last_offset pagination',
  })
  list(@ZodQuery(GhnShopPageSchema) page: GhnShopPageInput): ReturnType<GhnShopApiService['list']> {
    return this.shops.list(page.offset, page.limit);
  }

  @Post('pickup-points/:id/verify')
  @ApiOperation({ summary: '[ADMIN] Verify and bind a pickup point to a real GHN shop' })
  verify(
    @ZodParam('id', UuidParamSchema) id: string,
    @ZodBody(VerifySellerPickupSchema) dto: VerifySellerPickupInput,
    @CurrentUser('id') adminId: string,
  ): ReturnType<SellerPickupService['verify']> {
    return this.points.verify(id, dto.ghnShopId, adminId);
  }
}
