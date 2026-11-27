import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam, ZodQuery } from '@nexus/contracts/nest';
import { UuidParamSchema } from '@nexus/contracts';
import { Role } from '@prisma/client';
import {
  TrendingLimitQuery,
  TrendingLimitQuerySchema,
} from '../../../core/validation/query-schemas';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  AuthenticatedUserPayload,
  CurrentUser,
  Roles,
} from '../../../core/security/roles.decorator';

import {
  QueryAdminProductsInput,
  QueryAdminProductsSchema,
} from '../dtos/query-admin-products.dto';
import {
  RemoveTrendingProductInput,
  RemoveTrendingProductSchema,
} from '../dtos/remove-trending-product.dto';
import {
  UpdateProductCategoryInput,
  UpdateProductCategorySchema,
} from '../dtos/update-product-category.dto';
import {
  UpdateProductStatusInput,
  UpdateProductStatusSchema,
} from '../dtos/update-product-status.dto';

import { AdminProductsService } from '../services/admin-products.service';

/** Listings the back office can reclassify, hide or take down. */
@ApiTags('5. ADMIN')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get('products')
  @ApiOperation({
    summary: 'List platform-wide catalog products',
    description:
      'Supports keyword search, status filtering (ACTIVE, INACTIVE, DRAFT), seller filtering, and category pagination.',
  })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async listProducts(@ZodQuery(QueryAdminProductsSchema) query: QueryAdminProductsInput) {
    return this.adminProductsService.listProducts(query);
  }

  @Get('products/trending')
  @ApiOperation({
    summary: 'List current HomePage trending products for moderation',
    description:
      'Returns active products ranked by purchase count. Admin can only view and remove products from trending.',
  })
  @ApiResponse({ status: 200, description: 'Trending products retrieved successfully' })
  async listTrendingProducts(
    @ZodQuery(TrendingLimitQuerySchema) query: TrendingLimitQuery,
  ): Promise<ReturnType<AdminProductsService['listTrendingProducts']>> {
    return this.adminProductsService.listTrendingProducts(query.limit ?? 20);
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Retrieve product details with inventory breakdown and seller profile',
  })
  @ApiResponse({ status: 200, description: 'Product details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(@ZodParam('id', UuidParamSchema) id: string) {
    return this.adminProductsService.getProductById(id);
  }

  @Patch('products/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update product publication status',
    description:
      'Updates product status to ACTIVE (approved for sale) or INACTIVE (hidden due to policy violations).',
  })
  @ApiResponse({ status: 200, description: 'Product status updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProductStatus(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @ZodBody(UpdateProductStatusSchema) dto: UpdateProductStatusInput,
  ) {
    return this.adminProductsService.updateProductStatus(id, admin.id, dto);
  }

  @Patch('products/:id/category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign or update product catalog category',
    description:
      'Allows Admin to reassign a product to a newly created or more appropriate catalog category and notifies the seller.',
  })
  @ApiResponse({ status: 200, description: 'Product category updated successfully' })
  @ApiResponse({ status: 404, description: 'Product or category not found' })
  async updateProductCategory(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @ZodBody(UpdateProductCategorySchema) dto: UpdateProductCategoryInput,
  ) {
    return this.adminProductsService.updateProductCategory(id, admin.id, dto);
  }

  @Delete('products/:id/trending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove a product from HomePage trending',
    description:
      'Excludes a product from the HomePage trending list and notifies the seller. Admin cannot manually add products to trending.',
  })
  @ApiResponse({ status: 200, description: 'Product removed from trending successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async removeProductFromTrending(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
    @ZodBody(RemoveTrendingProductSchema.optional()) dto?: RemoveTrendingProductInput,
  ): Promise<ReturnType<AdminProductsService['removeProductFromTrending']>> {
    return this.adminProductsService.removeProductFromTrending(id, admin.id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete or archive product',
    description:
      'Permanently deletes product if no orders exist, or deactivates it to retain historical order integrity.',
  })
  @ApiResponse({ status: 200, description: 'Product removed or archived successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(
    @ZodParam('id', UuidParamSchema) id: string,
    @CurrentUser() admin: AuthenticatedUserPayload,
  ) {
    return this.adminProductsService.deleteProduct(id, admin.id);
  }
}
