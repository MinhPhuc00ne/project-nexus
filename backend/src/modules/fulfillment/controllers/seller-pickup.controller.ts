import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { CurrentUser, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { SellerPickupService } from '../services/seller-pickup.service';
import { GhnShopApiService } from '../services/ghn-shop-api.service';
import { GhnShopPageDto, SellerPickupDto, VerifySellerPickupDto } from '../dtos/seller-pickup.dto';

@ApiTags('10. FULFILLMENT & SHIPPING')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER)
@Controller('seller/shipping/pickup-point')
export class SellerPickupController {
  constructor(private readonly points: SellerPickupService) {}

  @Get()
  @ApiOperation({ summary: '[SELLER] Xem điểm lấy hàng và tình trạng xác minh GHN' })
  mine(@CurrentUser('id') sellerId: string): ReturnType<SellerPickupService['mine']> {
    return this.points.mine(sellerId);
  }

  @Put()
  @ApiOperation({ summary: '[SELLER] Khai báo/đổi điểm lấy hàng; thay đổi sẽ phải xác minh lại' })
  propose(
    @CurrentUser('id') sellerId: string,
    @Body() dto: SellerPickupDto,
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
  @ApiOperation({ summary: '[ADMIN] Xem điểm lấy hàng đang chờ xác minh' })
  pending(): ReturnType<SellerPickupService['pending']> {
    return this.points.pending();
  }

  @Get('ghn-shops')
  @ApiOperation({
    summary: '[ADMIN] Danh sách điểm GHN thuộc tài khoản sàn, dùng last_offset để phân trang',
  })
  list(@Query() page: GhnShopPageDto): ReturnType<GhnShopApiService['list']> {
    return this.shops.list(page.offset, page.limit);
  }

  @Post('pickup-points/:id/verify')
  @ApiOperation({ summary: '[ADMIN] Xác minh và gắn điểm lấy hàng với shop GHN thực tế' })
  verify(
    @Param('id') id: string,
    @Body() dto: VerifySellerPickupDto,
    @CurrentUser('id') adminId: string,
  ): ReturnType<SellerPickupService['verify']> {
    return this.points.verify(id, dto.ghnShopId, adminId);
  }
}
