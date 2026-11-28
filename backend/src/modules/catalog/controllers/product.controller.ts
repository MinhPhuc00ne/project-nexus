import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam, ZodQuery } from '@nexus/contracts/nest';
import {
  TrendingLimitQuery,
  TrendingLimitQuerySchema,
} from '../../../core/validation/query-schemas';
import { ProductService } from '../services/product.service';
import { ProductSaleService } from '../services/product-sale.service';
import {
  ProductTrendingService,
  TrendingProductsResult,
} from '../services/product-trending.service';
import { UpdateProductSaleInput, UpdateProductSaleSchema } from '../dtos/product-features.dto';
import { CreateProductInput, CreateProductSchema } from '../dtos/create-product.dto';
import { UpdateProductInput, UpdateProductSchema } from '../dtos/update-product.dto';
import { QueryProductInput, QueryProductSchema } from '../dtos/query-product.dto';
import {
  CurrentUser,
  Public,
  RequirePrivilege,
  Roles,
} from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role, UuidParamSchema } from '@nexus/contracts';

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
  @ApiOperation({
    summary: 'Configure or clear a scheduled sale price for a shop product (Seller)',
  })
  updateSale(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) productId: string,
    @ZodBody(UpdateProductSaleSchema) dto: UpdateProductSaleInput,
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
  async getProducts(@ZodQuery(QueryProductSchema) query: QueryProductInput) {
    return this.productService.getProducts(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @Get('seller/my-products')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] List products and inventory for the authenticated seller shop',
    description:
      'Returns all products published by the current seller account along with inventory quantities.',
  })
  @ApiResponse({ status: 200, description: 'Seller products retrieved successfully' })
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
  async getTrendingProducts(
    @ZodQuery(TrendingLimitQuerySchema) query: TrendingLimitQuery,
  ): Promise<TrendingProductsResult> {
    return this.trendingService.getTrendingProducts(query.limit ?? 10);
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
  async getProductDetail(@ZodParam('id', UuidParamSchema) productId: string) {
    return this.productService.getProductDetail(productId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @RequirePrivilege('PRODUCT.CREATE')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[SELLER] Create a new product and initialize default warehouse inventory (WH_001)',
    description: 'Publishes a new product with images, pricing, and initial stock quantity.',
  })
  @ApiResponse({ status: 201, description: 'Product and inventory created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data or category not found' })
  async createProduct(
    @CurrentUser('id') sellerId: string,
    @ZodBody(CreateProductSchema) dto: CreateProductInput,
  ) {
    return this.productService.createProduct(sellerId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @RequirePrivilege('PRODUCT.UPDATE')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[SELLER] Update product details and adjust inventory stock',
    description:
      'Updates product price, description, images, or stock quantity (SELLER_RESTOCK or SELLER_ADJUSTMENT).',
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden to modify another shop product' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) productId: string,
    @ZodBody(UpdateProductSchema) dto: UpdateProductInput,
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
    summary: '[SELLER] Hide or deactivate a shop product',
    description: 'Transitions product status to INACTIVE.',
  })
  @ApiResponse({ status: 200, description: 'Product deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteProduct(
    @CurrentUser('id') sellerId: string,
    @ZodParam('id', UuidParamSchema) productId: string,
  ) {
    return this.productService.deleteProduct(sellerId, productId);
  }
}
