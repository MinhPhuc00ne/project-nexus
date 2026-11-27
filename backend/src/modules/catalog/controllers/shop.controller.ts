import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UuidParamSchema } from '@nexus/contracts';
import { ZodParam, ZodQuery } from '@nexus/contracts/nest';
import {
  ShopDetailPaginationQuery,
  ShopDetailPaginationQuerySchema,
} from '../../../core/validation/query-schemas';
import { ShopService } from '../services/shop.service';
import { QueryShopInput, QueryShopSchema } from '../dtos/query-shop.dto';
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
  async getShops(@ZodQuery(QueryShopSchema) query: QueryShopInput) {
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
  @ApiResponse({ status: 200, description: 'Lấy thông tin gian hàng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy gian hàng' })
  async getShopDetail(
    @ZodParam('id', UuidParamSchema) shopId: string,
    @ZodQuery(ShopDetailPaginationQuerySchema) query: ShopDetailPaginationQuery,
  ) {
    return this.shopService.getShopDetail(shopId, query.page, query.limit);
  }
}
