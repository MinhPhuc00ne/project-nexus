import { Controller, Get, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ShopService } from '../services/shop.service';
import { QueryShopDto } from '../dtos/query-shop.dto';
import { Public } from '../../../core/security/roles.decorator';

@ApiTags('8. CATALOG - SHOPS')
@Controller('catalog/shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[GUEST / BUYER] Tìm kiếm và lọc danh sách gian hàng (Shop/Seller)',
    description:
      'Hỗ trợ tìm kiếm theo từ khóa (tên shop, mô tả, tên chủ shop), lọc theo tỉnh/thành phố, sắp xếp theo uy tín/sản phẩm/mới nhất và phân trang.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách gian hàng thành công' })
  async getShops(@Query() query: QueryShopDto) {
    return this.shopService.getShops(query);
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[GUEST / BUYER] Xem thông tin chi tiết gian hàng và danh sách sản phẩm đang bán',
    description:
      'Trả về thông tin hồ sơ gian hàng (tên, avatar, địa chỉ, uy tín) cùng danh sách sản phẩm phân trang.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Số trang sản phẩm' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 12,
    description: 'Số lượng sản phẩm mỗi trang',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin gian hàng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gian hàng' })
  async getShopDetail(
    @Param('id') shopId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shopService.getShopDetail(shopId, page, limit);
  }
}
