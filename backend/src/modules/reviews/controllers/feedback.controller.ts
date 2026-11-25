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
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@nexus/types';
import type { Request } from 'express';
import { TokenAuthService } from '../../../core/security/token-auth.service';
import { CurrentUser, Public, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import {
  AdminDeleteReviewDto,
  AdminModerateReviewVisibilityDto,
  CreateReviewReplyDto,
  FeedbackPageDto,
  QueryAdminReviewsDto,
  ReportDto,
  ReviewDto,
  SellerReplyReviewDto,
} from '../dtos/feedback.dto';
import { ReviewsService } from '../services/reviews.service';
import { ReportsService } from '../services/reports.service';

const REVIEW_CONSUMES_TYPES = ['application/json', 'multipart/form-data'] as const;

@ApiTags('Reviews & reports')
@Controller()
export class FeedbackController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly reports: ReportsService,
    private readonly tokenAuth: TokenAuthService,
  ) {}

  /**
   * Resolves the signed-in reader of a publicly readable review list.
   *
   * @param req - The incoming request, which may carry no credentials at all.
   * @returns The viewer’s id, or undefined for a guest or an unusable token.
   */
  private async extractOptionalViewerId(req?: Request): Promise<string | undefined> {
    const authHeader = req?.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
    const viewer = await this.tokenAuth.authenticateOptional(authHeader.substring(7));
    return viewer?.id;
  }

  @Post('commerce/orders/:orderId/shop-review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiConsumes(...REVIEW_CONSUMES_TYPES)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary: 'Đánh giá gian hàng sau khi mua thành công từ 2 sản phẩm (hỗ trợ đính kèm ảnh/video)',
  })
  shopReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Body() dto: ReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'shop', undefined, files);
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
  @ApiConsumes(...REVIEW_CONSUMES_TYPES)
  @UseInterceptors(AnyFilesInterceptor())
  @ApiOperation({
    summary: 'Đánh giá sản phẩm đã mua (hỗ trợ đính kèm ảnh/video multipart/form-data)',
  })
  productReview(
    @CurrentUser('id') id: string,
    @Param('orderId') orderId: string,
    @Param('productId') productId: string,
    @Body() dto: ReviewDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.create(id, orderId, dto, 'product', productId, files);
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
  @ApiOperation({
    summary:
      'Danh sách đánh giá gian hàng kèm averageRating và phân bố sao 1-5 (ẩn review tiêu cực đã bị admin ẩn)',
  })
  async shopReviews(
    @Param('id') id: string,
    @Query() query: FeedbackPageDto,
    @Req() req?: Request,
  ): Promise<unknown> {
    return this.reviews.list(id, 'shop', query, await this.extractOptionalViewerId(req));
  }
  @Get('catalog/products/:id/reviews')
  @Public()
  async productReviews(
    @Param('id') id: string,
    @Query() query: FeedbackPageDto,
    @Req() req?: Request,
  ): Promise<unknown> {
    return this.reviews.list(id, 'product', query, await this.extractOptionalViewerId(req));
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

  @Get('catalog/product-reviews/:reviewId/replies')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách phản hồi 2 chiều (có phân trang) cho đánh giá sản phẩm' })
  async listProductReviewReplies(
    @Param('reviewId') reviewId: string,
    @Query() query: FeedbackPageDto,
    @Req() req?: Request,
  ): Promise<unknown> {
    return this.reviews.listReviewReplies(
      'product',
      reviewId,
      query,
      await this.extractOptionalViewerId(req),
    );
  }

  @Post('commerce/product-reviews/:reviewId/replies')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiConsumes(...REVIEW_CONSUMES_TYPES)
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Buyer hoặc Seller gửi phản hồi 2 chiều trên đánh giá sản phẩm (hỗ trợ đính kèm ảnh/video)',
  })
  createProductReviewReply(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateReviewReplyDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.createReviewReply(userId, 'product', reviewId, dto, files);
  }

  @Get('catalog/shop-reviews/:reviewId/replies')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách phản hồi 2 chiều (có phân trang) cho đánh giá gian hàng',
  })
  async listShopReviewReplies(
    @Param('reviewId') reviewId: string,
    @Query() query: FeedbackPageDto,
    @Req() req?: Request,
  ): Promise<unknown> {
    return this.reviews.listReviewReplies(
      'shop',
      reviewId,
      query,
      await this.extractOptionalViewerId(req),
    );
  }

  @Post('commerce/shop-reviews/:reviewId/replies')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiConsumes(...REVIEW_CONSUMES_TYPES)
  @UseInterceptors(AnyFilesInterceptor())
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Buyer hoặc Seller gửi phản hồi 2 chiều trên đánh giá gian hàng (hỗ trợ đính kèm ảnh/video)',
  })
  createShopReviewReply(
    @CurrentUser('id') userId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: CreateReviewReplyDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<unknown> {
    return this.reviews.createReviewReply(userId, 'shop', reviewId, dto, files);
  }

  @Patch('admin/reviews/product/:id/visibility')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin/Staff ẩn hoặc bỏ ẩn đánh giá sản phẩm tiêu cực (không xóa, tác giả vẫn xem được trạng thái bị ẩn)',
  })
  adminHideProductReview(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') actorRole: string,
    @Param('id') id: string,
    @Body() dto: AdminModerateReviewVisibilityDto,
  ): Promise<unknown> {
    return this.reviews.adminModerateReviewVisibility(adminId, 'product', id, dto, actorRole);
  }

  @Patch('admin/reviews/shop/:id/visibility')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin/Staff ẩn hoặc bỏ ẩn đánh giá gian hàng tiêu cực (không xóa)' })
  adminHideShopReview(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') actorRole: string,
    @Param('id') id: string,
    @Body() dto: AdminModerateReviewVisibilityDto,
  ): Promise<unknown> {
    return this.reviews.adminModerateReviewVisibility(adminId, 'shop', id, dto, actorRole);
  }

  @Patch('admin/reviews/replies/:replyId/visibility')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPPORT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin/Staff ẩn hoặc bỏ ẩn tin nhắn phản hồi tiêu cực trong đánh giá (không xóa)',
  })
  adminHideReviewReply(
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') actorRole: string,
    @Param('replyId') replyId: string,
    @Body() dto: AdminModerateReviewVisibilityDto,
  ): Promise<unknown> {
    return this.reviews.adminModerateReviewVisibility(adminId, 'reply', replyId, dto, actorRole);
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
