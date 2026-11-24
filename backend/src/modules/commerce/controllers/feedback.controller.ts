import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import { CurrentUser, Public, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  AdminDeleteReviewDto,
  FeedbackPageDto,
  QueryAdminReviewsDto,
  ReportDto,
  ReviewDto,
  SellerReplyReviewDto,
} from '../dtos/feedback.dto';
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
  @ApiOperation({ summary: 'Đánh giá gian hàng sau khi mua thành công từ 2 sản phẩm' })
  shopReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'shop');
  }

  @Patch('commerce/orders/:orderId/shop-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Chỉnh sửa đánh giá gian hàng của chính mình' })
  updateShopReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.updateShopReview(id, orderId, dto);
  }

  @Delete('commerce/orders/:orderId/shop-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Xóa đánh giá gian hàng của chính mình' })
  deleteShopReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
  ): Promise<unknown> {
    return this.reviews.deleteShopReview(id, orderId);
  }

  @Post('commerce/orders/:orderId/products/:productId/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Đánh giá sản phẩm đã mua' })
  productReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Param('productId') productId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'product', productId);
  }

  @Patch('commerce/orders/:orderId/products/:productId/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Chỉnh sửa đánh giá sản phẩm của chính mình' })
  updateProductReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Param('productId') productId: string,
    @Body() dto: ReviewDto,
  ): Promise<unknown> {
    return this.reviews.updateProductReview(id, orderId, productId, dto);
  }

  @Delete('commerce/orders/:orderId/products/:productId/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({ summary: 'Xóa đánh giá sản phẩm của chính mình' })
  deleteProductReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Param('productId') productId: string,
  ): Promise<unknown> {
    return this.reviews.deleteProductReview(id, orderId, productId);
  }

  @Get('admin/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @ApiOperation({
    summary: 'Admin/Staff tra cứu danh sách bình luận/đánh giá toàn sàn kèm điểm uy tín tác giả',
  })
  adminListReviews(@Query() query: QueryAdminReviewsDto): Promise<unknown> {
    return this.reviews.adminListReviews(query);
  }

  @Delete('admin/reviews/product/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin/Staff xóa bình luận sản phẩm vi phạm, trừ điểm uy tín tác giả và gửi thông báo',
  })
  adminDeleteProductReview(
    @CurrentUser('role') actorRole: string,
    @Param('id') id: string,
    @Body() dto: AdminDeleteReviewDto,
  ): Promise<unknown> {
    return this.reviews.adminDeleteReview(id, 'product', dto, actorRole);
  }

  @Delete('admin/reviews/product/:id/seller-reply')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin/Staff gỡ phản hồi (sellerReply) vi phạm trên đánh giá sản phẩm, trừ điểm uy tín Seller và gửi thông báo',
  })
  adminRemoveSellerReply(
    @CurrentUser('role') actorRole: string,
    @Param('id') id: string,
    @Body() dto: AdminDeleteReviewDto,
  ): Promise<unknown> {
    return this.reviews.adminRemoveSellerReply(id, dto, actorRole);
  }

  @Delete('admin/reviews/shop/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin/Staff xóa đánh giá gian hàng vi phạm, trừ điểm uy tín tác giả và gửi thông báo',
  })
  adminDeleteShopReview(
    @CurrentUser('role') actorRole: string,
    @Param('id') id: string,
    @Body() dto: AdminDeleteReviewDto,
  ): Promise<unknown> {
    return this.reviews.adminDeleteReview(id, 'shop', dto, actorRole);
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

  @Post('seller/product-reviews/:reviewId/reply')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seller phản hồi đánh giá sản phẩm của khách hàng' })
  replyProductReview(
    @CurrentUser('id') sellerId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: SellerReplyReviewDto,
  ): Promise<unknown> {
    return this.reviews.replyToProductReview(sellerId, reviewId, dto);
  }

  @Post('catalog/product-reviews/:reviewId/helpful')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bình chọn / bỏ bình chọn đánh giá sản phẩm hữu ích' })
  toggleHelpfulProductReview(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
  ): Promise<unknown> {
    return this.reviews.toggleHelpfulProductReview(userId, reviewId);
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
