import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductService } from '../services/product.service';
import { ProductSaleService } from '../services/product-sale.service';
import {
  ProductTrendingService,
  TrendingProductsResult,
} from '../services/product-trending.service';
import { UpdateProductSaleDto } from '../dtos/product-features.dto';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { QueryProductDto } from '../dtos/query-product.dto';
import {
  Public,
  CurrentUser,
  Roles,
  RequirePrivilege,
} from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/types';

@ApiTags('7. CATALOG - PRODUCTS')
@Controller('catalog/products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly sale: ProductSaleService,
    private readonly trendingService: ProductTrendingService,
  ) {}

  @Patch(':id/sale')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: 'Seller thiết lập/dừng giá sale có thời gian cho sản phẩm của mình' })
  updateSale(
    @CurrentUser('id') sellerId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateProductSaleDto,
  ): ReturnType<ProductSaleService['update']> {
    return this.sale.update(sellerId, productId, dto);
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[GUEST / BUYER] Search and filter catalog products',
    description:
      'Supports keyword search (title, description, shop name), category, city, price range, rating, stock status, trendingOnly, minPurchaseCount, sorting (newest, price_asc, price_desc, best_selling, trending, top_rated), and pagination. Each item includes purchaseCount and isTrending.',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async getProducts(@Query() query: QueryProductDto) {
    return this.productService.getProducts(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Get('seller/my-products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Xem danh sách sản phẩm và tồn kho của chính Shop mình',
    description:
      'Trả về toàn bộ sản phẩm do tài khoản Seller hiện tại đăng bán kèm số lượng tồn kho.',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách sản phẩm của Seller thành công' })
  async getMyProducts(@CurrentUser('id') sellerId: string) {
    return this.productService.getSellerProducts(sellerId);
  }

  @Public()
  @Get('trending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[GUEST / BUYER] List trending products for HomePage',
    description:
      'Ranks active products by total qualifying purchase count descending (excluding admin-excluded products), including shop metadata.',
  })
  @ApiResponse({ status: 200, description: 'Trending products retrieved successfully' })
  async getTrendingProducts(@Query('limit') limit?: string): Promise<TrendingProductsResult> {
    return this.trendingService.getTrendingProducts(limit ? Number(limit) : 10);
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[GUEST / BUYER] Get product detail with available inventory',
    description: 'Returns full product details, gallery images, shop info, and availableQty.',
  })
  @ApiResponse({ status: 200, description: 'Product detail retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductDetail(@Param('id') productId: string) {
    return this.productService.getProductDetail(productId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @RequirePrivilege('PRODUCT.CREATE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[SELLER] Đăng bán sản phẩm mới (Tự động khởi tạo tồn kho WH_001)',
    description:
      'Người bán đăng sản phẩm kèm thông tin hình ảnh, giá bán và số lượng tồn kho ban đầu.',
  })
  @ApiResponse({ status: 201, description: 'Tạo sản phẩm và kho hàng thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc danh mục không tồn tại' })
  async createProduct(@CurrentUser('id') sellerId: string, @Body() dto: CreateProductDto) {
    return this.productService.createProduct(sellerId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @RequirePrivilege('PRODUCT.UPDATE')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Cập nhật thông tin sản phẩm và điều chỉnh số lượng tồn kho',
    description:
      'Người bán cập nhật giá, mô tả, ảnh hoặc thay đổi số lượng tồn kho (SELLER_RESTOCK / SELLER_ADJUSTMENT).',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật sản phẩm thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền sửa sản phẩm của shop khác' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  async updateProduct(
    @CurrentUser('id') sellerId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(sellerId, productId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @RequirePrivilege('PRODUCT.DELETE')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Ẩn hoặc xóa sản phẩm của Shop',
    description: 'Chuyển trạng thái sản phẩm sang INACTIVE.',
  })
  @ApiResponse({ status: 200, description: 'Ẩn sản phẩm thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền thao tác' })
  async deleteProduct(@CurrentUser('id') sellerId: string, @Param('id') productId: string) {
    return this.productService.deleteProduct(sellerId, productId);
  }
}
