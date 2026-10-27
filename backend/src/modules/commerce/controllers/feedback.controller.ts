import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { CurrentUser, Public, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { FeedbackPageDto, ReportDto, ReviewDto } from '../dtos/feedback.dto';
import { ReviewsService } from '../services/reviews.service';
import { ReportsService } from '../services/reports.service';

@ApiTags('Reviews & reports')
@Controller()
export class FeedbackController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly reports: ReportsService,
  ) {}

  @Post('commerce/orders/:orderId/shop-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  shopReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'shop');
  }
  @Post('commerce/orders/:orderId/products/:productId/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  productReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Param('productId') productId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'product', productId);
  }
  @Post('seller/orders/:orderId/customer-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  customerReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'customer');
  }
  @Get('catalog/shops/:id/reviews')
  @Public()
  shopReviews(@Param('id') id: string, @Query() query: FeedbackPageDto): Promise<unknown> {
    return this.reviews.list(id, 'shop', query);
  }
  @Get('catalog/products/:id/reviews')
  @Public()
  productReviews(@Param('id') id: string, @Query() query: FeedbackPageDto): Promise<unknown> {
    return this.reviews.list(id, 'product', query);
  }
  @Get('seller/product-reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  sellerReviews(@CurrentUser('id') id: string, @Query() query: FeedbackPageDto): Promise<unknown> {
    return this.reviews.list(id, 'seller-products', query);
  }
  @Get('buyer/customer-reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  customerReviews(
    @CurrentUser('id') id: string,
    @Query() query: FeedbackPageDto,
  ): Promise<unknown> {
    return this.reviews.list(id, 'customer', query);
  }
  @Post('catalog/shops/:id/reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  reportShop(
    @CurrentUser('id') id: string,
    @Param('id') shopId: string,
    @Body() dto: ReportDto,
  ): Promise<unknown> {
    return this.reports.create(id, shopId, 'shop', dto);
  }
  @Post('catalog/products/:id/reports')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  reportProduct(
    @CurrentUser('id') id: string,
    @Param('id') productId: string,
    @Body() dto: ReportDto,
  ): Promise<unknown> {
    return this.reports.create(id, productId, 'product', dto);
  }
}
