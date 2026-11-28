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
    summary: '[GUEST / BUYER] Search and filter shops',
    description:
      'Supports keyword search (shop name, description, owner name), city filtering, sorting (reputation, product count, newest), and pagination.',
  })
  @ApiResponse({ status: 200, description: 'Shops retrieved successfully' })
  async getShops(@ZodQuery(QueryShopSchema) query: QueryShopInput) {
    return this.shopService.getShops(query);
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[GUEST / BUYER] Get shop details and active product listings',
    description:
      'Returns shop profile details (name, avatar, address, reputation) and paginated active products.',
  })
  @ApiResponse({ status: 200, description: 'Shop details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async getShopDetail(
    @ZodParam('id', UuidParamSchema) shopId: string,
    @ZodQuery(ShopDetailPaginationQuerySchema) query: ShopDetailPaginationQuery,
  ) {
    return this.shopService.getShopDetail(shopId, query.page, query.limit);
  }
}
